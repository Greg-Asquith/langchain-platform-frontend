// src/app/api/teams/members/[membershipId]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { withCSRFProtection } from "@/lib/csrf";
import { handleApiError, createAuthenticationError, createAuthorizationError, createValidationError, createNotFoundError, createInternalError } from "@/lib/error-handler";
import { logError } from "@/lib/logger";
import { getSession } from "@/lib/session";
import { validateMembershipId, validateTeamId } from "@/lib/teams";
import { workos } from "@/lib/workos";

export const DELETE = withCSRFProtection(async (request: NextRequest, ...args: unknown[]) => {
  const { params } = args[0] as { params: Promise<{ membershipId: string }> };

  try {
    const { user, currentOrganizationId } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    if (!validateTeamId(currentOrganizationId)) {
      return handleApiError(createValidationError("No current team selected"));
    }

    const { membershipId } = await params;

    // Validate UUID format for membership ID
    if (!validateMembershipId(membershipId)) {
      return handleApiError(createValidationError("Invalid membership ID format"));
    }

    // Get the membership to be removed to verify it belongs to the current organization
    let membershipToRemove;
    try {
      membershipToRemove = await workos.userManagement.getOrganizationMembership(membershipId);
    } catch (error) {
      await logError(
        'Failed to fetch membership to remove',
        { component: 'DELETE /api/teams/members/[membershipId]' },
        error as Error
      );
      return handleApiError(createNotFoundError("Member not found"));
    }
    
    if (membershipToRemove.organizationId !== currentOrganizationId) {
      return handleApiError(createNotFoundError("Member not found in current team"));
    }

    // Get organization details to check if it's personal
    let organization;
    try {
      organization = await workos.organizations.getOrganization(currentOrganizationId);
    } catch (error) {
      await logError(
        'Failed to fetch organization',
        { component: 'DELETE /api/teams/members/[membershipId]' },
        error as Error
      );
      return handleApiError(createNotFoundError("Organization not found"));
    }

    // Check if this is a personal team
    const isPersonalTeam = organization.metadata?.personal === "true";
    
    if (isPersonalTeam) {
      // For personal teams, only allow the owner to remove themselves (which would be leaving)
      // But we probably don't want to allow that either since it would orphan the personal team
      return handleApiError(createValidationError("Cannot remove members from personal teams"));
    }

    // Check if current user is admin of the organization
    let memberships;
    try {
      memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: currentOrganizationId,
      });
    } catch (error) {
      await logError(
        'Failed to fetch team memberships',
        { component: 'DELETE /api/teams/members/[membershipId]' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to verify permissions", error as Error));
    }

    const currentUserMembership = memberships.data.find(m => m.organizationId === currentOrganizationId);
    if (!currentUserMembership || currentUserMembership.role?.slug !== 'admin') {
      return handleApiError(createAuthorizationError("Only team admins can remove members"));
    }

    // Prevent removing self
    if (membershipToRemove.userId === user.id) {
      return handleApiError(createValidationError("You cannot remove yourself from the team"));
    }

    // Prevent removing the last admin
    if (membershipToRemove.role?.slug === 'admin') {
      const allOrgMemberships = await workos.userManagement.listOrganizationMemberships({
        organizationId: currentOrganizationId,
        limit: 100,
      });
      
      const adminCount = allOrgMemberships.data.filter(m => m.role?.slug === 'admin').length;
      if (adminCount <= 1) {
        return handleApiError(createValidationError("Cannot remove the last admin from the team"));
      }
    }

    // Delete the membership
    try {
      await workos.userManagement.deleteOrganizationMembership(membershipId);
    } catch (error) {
      await logError(
        'Failed to delete membership',
        { component: 'DELETE /api/teams/members/[membershipId]' },
        error as Error
      );
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message.includes('not found')) {
        return handleApiError(createNotFoundError("Member not found"));
      }
      
      return handleApiError(createInternalError("Failed to remove member", error as Error));
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
    await logError(
      'Failed to remove member',
      { component: 'DELETE /api/teams/members/[membershipId]' },
      error as Error
    );
    
    return handleApiError(error);
  }
});

// Get member details
export async function GET(request: NextRequest, { params }: { params: Promise<{ membershipId: string }> }) {
  try {
    const { user, currentOrganizationId } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    if (!validateTeamId(currentOrganizationId)) {
      return handleApiError(createValidationError("No current team selected"));
    }

    const { membershipId } = await params;

    // Validate UUID format for membership ID
    if (!validateMembershipId(membershipId)) {
      return handleApiError(createValidationError("Invalid membership ID format"));
    }

    // Check if user has access to the organization
    let memberships;
    try {
      memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: currentOrganizationId,
      });
    } catch (error) {
      await logError(
        'Failed to fetch team memberships',
        { component: 'GET /api/teams/members/[membershipId]' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to verify permissions", error as Error));
    }

    const hasAccess = memberships.data.some(m => m.organizationId === currentOrganizationId);
    if (!hasAccess) {
      return handleApiError(createAuthorizationError("Access denied to this team"));
    }

    // Get the membership details
    let membership;
    try {
      membership = await workos.userManagement.getOrganizationMembership(membershipId);
    } catch (error) {
      await logError(
        'Failed to fetch membership',
        { component: 'GET /api/teams/members/[membershipId]' },
        error as Error
      );
      return handleApiError(createNotFoundError("Member not found"));
    }
    
    if (membership.organizationId !== currentOrganizationId) {
      return handleApiError(createNotFoundError("Member not found in current team"));
    }

    // Get organization details to include team type info
    let organization;
    try {
      organization = await workos.organizations.getOrganization(currentOrganizationId);
    } catch (error) {
      await logError(
        'Failed to fetch organization',
        { component: 'GET /api/teams/members/[membershipId]' },
        error as Error
      );
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
    await logError(
      'Failed to get member details',
      { component: 'GET /api/teams/members/[membershipId]' },
      error as Error
    );
    
    return handleApiError(error);
  }
}