import { NextRequest, NextResponse } from "next/server";
import { getSession, refreshOrganizations } from "@/lib/session";
import { workos } from "@/lib/workos";

export async function GET(request: NextRequest) {
  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      organizations: organizations || [],
    });

  } catch (error) {
    console.error("Failed to get organizations:", error);
    
    return NextResponse.json(
      { error: "Failed to get organizations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, domains = [] } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // Create organization in WorkOS
    const organization = await workos.organizations.createOrganization({
      name: name.trim(),
      domainData: domains.map((domain: string) => ({
        domain: domain.trim(),
        state: 'pending' as const,
      })),
    });

    // Add the user as an admin of the new organization
    await workos.userManagement.createOrganizationMembership({
      userId: user.id,
      organizationId: organization.id,
      roleSlug: 'admin',
    });

    // Refresh organizations in session
    await refreshOrganizations();

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        domains: organization.domains?.map(d => ({
          id: d.id,
          domain: d.domain,
          state: d.state,
        })) || [],
      },
    });

  } catch (error) {
    console.error("Failed to create organization:", error);
    
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
} 