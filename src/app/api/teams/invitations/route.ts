import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { workos } from "@/lib/workos";

export async function POST(request: NextRequest) {
  try {
    const { user, organizations, currentOrganizationId } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!currentOrganizationId) {
      return NextResponse.json(
        { error: "No current organization selected" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, role = 'member' } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: "Role must be either 'admin' or 'member'" },
        { status: 400 }
      );
    }

    // Verify user has access to current organization and is admin
    const currentOrg = organizations?.find(org => org.id === currentOrganizationId);
    if (!currentOrg) {
      return NextResponse.json(
        { error: "Current organization not found" },
        { status: 404 }
      );
    }

    // Check if user is admin of the organization
    const memberships = await workos.userManagement.listOrganizationMemberships({
      userId: user.id,
      organizationId: currentOrganizationId,
    });

    const membership = memberships.data.find(m => m.organizationId === currentOrganizationId);
    if (!membership || membership.role?.slug !== 'admin') {
      return NextResponse.json(
        { error: "Only organization admins can send invitations" },
        { status: 403 }
      );
    }

    // Create invitation
    const invitation = await workos.userManagement.sendInvitation({
      email: email.trim().toLowerCase(),
      organizationId: currentOrganizationId,
      roleSlug: role,
    });

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        organizationId: invitation.organizationId,
        state: invitation.state,
        createdAt: invitation.createdAt,
      },
    });

  } catch (error) {
    console.error("Failed to create invitation:", error);
    
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, currentOrganizationId } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!currentOrganizationId) {
      return NextResponse.json(
        { error: "No current organization selected" },
        { status: 400 }
      );
    }

    // Get invitations for the current organization
    const invitations = await workos.userManagement.listInvitations({
      organizationId: currentOrganizationId,
      limit: 100,
    });

    return NextResponse.json({
      invitations: invitations.data.map(inv => ({
        id: inv.id,
        email: inv.email,
        organizationId: inv.organizationId,
        state: inv.state,
        createdAt: inv.createdAt,
      })),
    });

  } catch (error) {
    console.error("Failed to get invitations:", error);
    
    return NextResponse.json(
      { error: "Failed to get invitations" },
      { status: 500 }
    );
  }
} 