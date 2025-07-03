import { NextRequest, NextResponse } from "next/server";
import { getSession, switchOrganization } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId || typeof organizationId !== 'string') {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const hasAccess = organizations?.some(org => org.id === organizationId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this organization" },
        { status: 403 }
      );
    }

    // Switch to the organization
    const success = await switchOrganization(organizationId);
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to switch organization" },
        { status: 500 }
      );
    }

    const currentOrg = organizations?.find(org => org.id === organizationId);

    return NextResponse.json({
      success: true,
      currentOrganization: currentOrg,
    });

  } catch (error) {
    console.error("Failed to switch organization:", error);
    
    return NextResponse.json(
      { error: "Failed to switch organization" },
      { status: 500 }
    );
  }
} 