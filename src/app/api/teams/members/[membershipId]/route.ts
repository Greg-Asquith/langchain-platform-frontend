// src/app/api/teams/members/[membershipId]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { validateMembershipId, validateTeamId } from "@/lib/teams";
import { workos } from "@/lib/workos";

export async function DELETE(request: NextRequest, { params }: { params: { membershipId: string } }) {

  try {
    const { user, currentOrganizationId } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!validateTeamId(currentOrganizationId)) {
      return NextResponse.json(
        { error: "No current team selected" },
        { status: 400 }
      );
    }

    const { membershipId } = await params;

    // Validate UUID format for membership ID
    if (!validateMembershipId(membershipId)) {
      return NextResponse.json(
        { error: "Invalid membership ID format" },
        { status: 400 }
      );
    }

    // Get the membership to be removed to verify it belongs to the current organization
    let membershipToRemove;
    try {
      membershipToRemove = await workos.userManagement.getOrganizationMembership(membershipId);
    } catch (error) {
      console.error('Failed to fetch membership to remove:', error);
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }
    
    if (membershipToRemove.organizationId !== currentOrganizationId) {
      return NextResponse.json(
        { error: "Member not found in current team" },
        { status: 404 }
      );
    }

    // Get organization details to check if it's personal
    let organization;
    try {
      organization = await workos.organizations.getOrganization(currentOrganizationId);
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if this is a personal team
    const isPersonalTeam = organization.metadata?.personal === "true";
    
    if (isPersonalTeam) {
      // For personal teams, only allow the owner to remove themselves (which would be leaving)
      // But we probably don't want to allow that either since it would orphan the personal team
      return NextResponse.json(
        { error: "Cannot remove members from personal teams" },
        { status: 400 }
      );
    }

    // Check if current user is admin of the organization
    let memberships;
    try {
      memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: currentOrganizationId,
      });
    } catch (error) {
      console.error('Failed to fetch team memberships:', error);
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 }
      );
    }

    const currentUserMembership = memberships.data.find(m => m.organizationId === currentOrganizationId);
    if (!currentUserMembership || currentUserMembership.role?.slug !== 'admin') {
      return NextResponse.json(
        { error: "Only team admins can remove members" },
        { status: 403 }
      );
    }

    // Prevent removing self
    if (membershipToRemove.userId === user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the team" },
        { status: 400 }
      );
    }

    // Prevent removing the last admin
    if (membershipToRemove.role?.slug === 'admin') {
      const allOrgMemberships = await workos.userManagement.listOrganizationMemberships({
        organizationId: currentOrganizationId,
        limit: 100,
      });
      
      const adminCount = allOrgMemberships.data.filter(m => m.role?.slug === 'admin').length;
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last admin from the team" },
          { status: 400 }
        );
      }
    }

    // Delete the membership
    try {
      await workos.userManagement.deleteOrganizationMembership(membershipId);
    } catch (error) {
      console.error('Failed to delete membership:', error);
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { error: "Member not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to remove member" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
      removedMember: {
        id: membershipToRemove.id,
        userId: membershipToRemove.userId,
        role: membershipToRemove.role?.slug,
      },
    });

  } catch (error) {
    console.error("Failed to remove member:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Get member details
export async function GET(request: NextRequest, { params }: { params: { membershipId: string } }) {
  try {
    const { user, currentOrganizationId } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!validateTeamId(currentOrganizationId)) {
      return NextResponse.json(
        { error: "No current team selected" },
        { status: 400 }
      );
    }

    const { membershipId } = await params;

    // Validate UUID format for membership ID
    if (!validateMembershipId(membershipId)) {
      return NextResponse.json(
        { error: "Invalid membership ID format" },
        { status: 400 }
      );
    }

    // Check if user has access to the organization
    let memberships;
    try {
      memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: currentOrganizationId,
      });
    } catch (error) {
      console.error('Failed to fetch team memberships:', error);
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 }
      );
    }

    const hasAccess = memberships.data.some(m => m.organizationId === currentOrganizationId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this team" },
        { status: 403 }
      );
    }

    // Get the membership details
    let membership;
    try {
      membership = await workos.userManagement.getOrganizationMembership(membershipId);
    } catch (error) {
      console.error('Failed to fetch membership:', error);
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }
    
    if (membership.organizationId !== currentOrganizationId) {
      return NextResponse.json(
        { error: "Member not found in current team" },
        { status: 404 }
      );
    }

    // Get organization details to include team type info
    let organization;
    try {
      organization = await workos.organizations.getOrganization(currentOrganizationId);
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      // Don't fail the request if we can't get org details
    }

    return NextResponse.json({
      member: {
        id: membership.id,
        userId: membership.userId,
        organizationId: membership.organizationId,
        role: membership.role,
        status: membership.status,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
        isCurrentUser: membership.userId === user.id,
      },
      isPersonalTeam: organization?.metadata?.personal === "true",
    });

  } catch (error) {
    console.error("Failed to get member details:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}