import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { workos } from "@/lib/workos";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { membershipId: string } }
) {
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

    const { membershipId } = params;

    // Check if current user is admin of the organization
    const memberships = await workos.userManagement.listOrganizationMemberships({
      userId: user.id,
      organizationId: currentOrganizationId,
    });

    const currentUserMembership = memberships.data.find(m => m.organizationId === currentOrganizationId);
    if (!currentUserMembership || currentUserMembership.role?.slug !== 'admin') {
      return NextResponse.json(
        { error: "Only organization admins can remove members" },
        { status: 403 }
      );
    }

    // Get the membership to be removed to verify it belongs to the current organization
    const membershipToRemove = await workos.userManagement.getOrganizationMembership(membershipId);
    
    if (membershipToRemove.organizationId !== currentOrganizationId) {
      return NextResponse.json(
        { error: "Member not found in current organization" },
        { status: 404 }
      );
    }

    // Prevent removing self
    if (membershipToRemove.userId === user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the organization" },
        { status: 400 }
      );
    }

    // Delete the membership
    await workos.userManagement.deleteOrganizationMembership(membershipId);

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
    });

  } catch (error) {
    console.error("Failed to remove member:", error);
    
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
} 