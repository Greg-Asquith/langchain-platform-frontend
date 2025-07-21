// src/app/api/teams/[id]/invitations/[invitationId]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { withCSRFProtection } from "@/lib/csrf";
import { handleApiError, createAuthenticationError, createAuthorizationError, createValidationError, createConflictError, createNotFoundError, createInternalError, createRateLimitError } from "@/lib/error-handler";
import { logError } from "@/lib/logger";
import { getSession } from "@/lib/session";
import { validateTeamId, validateInvitationId } from "@/lib/teams";
import { workos } from "@/lib/workos";

// Revoke invitation
export const DELETE = withCSRFProtection(async (request: NextRequest, ...args: unknown[]) => {
  const { params } = args[0] as { params: Promise<{ id: string; invitationId: string }> };

  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    const { id: teamId, invitationId } = await params;

    // Validate UUID format for team ID
    if (!validateTeamId(teamId)) {
      return handleApiError(createValidationError("Invalid team ID format"));
    }

    // Validate UUID format for invitation ID
    if (!validateInvitationId(invitationId)) {
      return handleApiError(createValidationError("Invalid invitation ID format"));
    }

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return handleApiError(createAuthorizationError("Access denied to this team"));
    }

    // Check if user is admin of the organization
    let memberships;
    try {
      memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: teamId,
      });
    } catch (error: unknown) {
      await logError(
        'Failed to fetch team memberships',
        { component: 'DELETE /api/teams/[id]/invitations/[invitationId]' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to verify permissions", error as Error));
    }

    const membership = memberships.data.find(m => m.organizationId === teamId);
    if (!membership || membership.role?.slug !== 'admin') {
      return handleApiError(createAuthorizationError("Only team admins can revoke invitations"));
    }

    // Get the invitation to verify it belongs to this organization
    let invitation;
    try {
      invitation = await workos.userManagement.getInvitation(invitationId);
    } catch (error: unknown) {
      await logError(
        'Failed to fetch invitation',
        { component: 'DELETE /api/teams/[id]/invitations/[invitationId]' },
        error as Error
      );
      return handleApiError(createNotFoundError("Invitation not found"));
    }
    
    if (invitation.organizationId !== teamId) {
      return handleApiError(createNotFoundError("Invitation not found in this team"));
    }

    // Check if invitation is already expired or accepted
    if (invitation.state === 'accepted') {
      return handleApiError(createValidationError("Cannot revoke an already accepted invitation"));
    }

    if (invitation.state === 'expired') {
      return handleApiError(createValidationError("Invitation has already expired"));
    }

    // Revoke the invitation
    try {
      await workos.userManagement.revokeInvitation(invitationId);
    } catch (error: unknown) {
      await logError(
        'Failed to revoke invitation',
        { component: 'DELETE /api/teams/[id]/invitations/[invitationId]' },
        error as Error
      );
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message.includes('not found')) {
        return handleApiError(createNotFoundError("Invitation not found"));
      }
      
      return handleApiError(createInternalError("Failed to revoke invitation", error as Error));
    }

    return NextResponse.json({
      success: true,
      message: "Invitation revoked successfully",
      revokedInvitation: {
        id: invitation.id,
        email: invitation.email,
        state: 'revoked'
      },
    });

  } catch (error: unknown) {
    await logError(
      'Failed to revoke invitation',
      { component: 'DELETE /api/teams/[id]/invitations/[invitationId]' },
      error as Error
    );
    
    return handleApiError(error);
  }
});

// Get invitation details
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; invitationId: string }> }) {
  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    const { id: teamId, invitationId } = await params;

    // Validate UUID format for team ID
    if (!validateTeamId(teamId)) {
      return handleApiError(createValidationError("Invalid team ID format"));
    }

    // Validate UUID format for invitation ID
    if (!validateInvitationId(invitationId)) {
      return handleApiError(createValidationError("Invalid invitation ID format"));
    }

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return handleApiError(createAuthorizationError("Access denied to this team"));
    }

    // Get the invitation
    let invitation;
    try {
      invitation = await workos.userManagement.getInvitation(invitationId);
    } catch (error: unknown) {
      await logError(
        'Failed to fetch invitation',
        { component: 'GET /api/teams/[id]/invitations/[invitationId]' },
        error as Error
      );
      return handleApiError(createNotFoundError("Invitation not found"));
    }
    
    if (invitation.organizationId !== teamId) {
      return handleApiError(createNotFoundError("Invitation not found in this team"));
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        organizationId: invitation.organizationId,
        state: invitation.state,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
        revokedAt: invitation.revokedAt,
      },
    });

  } catch (error: unknown) {
    await logError(
      'Failed to get invitation',
      { component: 'GET /api/teams/[id]/invitations/[invitationId]' },
      error as Error
    );
    
    return handleApiError(error);
  }
}

// Resend invitation
export const POST = withCSRFProtection(async (request: NextRequest, ...args: unknown[]) => {
  const { params } = args[0] as { params: Promise<{ id: string; invitationId: string }> };

  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    const { id: teamId, invitationId } = await params;

    // Validate UUID format for team ID
    if (!validateTeamId(teamId)) {
      return handleApiError(createValidationError("Invalid team ID format"));
    }

    // Validate UUID format for invitation ID
    if (!validateInvitationId(invitationId)) {
      return handleApiError(createValidationError("Invalid invitation ID format"));
    }

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return handleApiError(createAuthorizationError("Access denied to this team"));
    }

    // Check if user is admin of the organization
    let memberships;
    try {
      memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: teamId,
      });
    } catch (error: unknown) {
      await logError(
        'Failed to fetch team memberships',
        { component: 'POST /api/teams/[id]/invitations/[invitationId]' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to verify permissions", error as Error));
    }

    const membership = memberships.data.find(m => m.organizationId === teamId);
    if (!membership || membership.role?.slug !== 'admin') {
      return handleApiError(createAuthorizationError("Only team admins can resend invitations"));
    }

    // Get the invitation to verify it belongs to this organization
    let invitation;
    try {
      invitation = await workos.userManagement.getInvitation(invitationId);
    } catch (error: unknown) {
      await logError(
        'Failed to fetch invitation',
        { component: 'POST /api/teams/[id]/invitations/[invitationId]' },
        error as Error
      );
      return handleApiError(createNotFoundError("Invitation not found"));
    }
    
    if (invitation.organizationId !== teamId) {
      return handleApiError(createNotFoundError("Invitation not found in this team"));
    }

    // Check if invitation can be resent
    if (invitation.state === 'accepted') {
      return handleApiError(createValidationError("Cannot resend an already accepted invitation"));
    }

    // Rate limiting check - don't allow resending too frequently
    const now = new Date();
    const createdAt = new Date(invitation.createdAt);
    const timeSinceCreation = now.getTime() - createdAt.getTime();
    const minResendInterval = 5 * 60 * 1000; // 5 minutes

    if (timeSinceCreation < minResendInterval) {
      return handleApiError(createRateLimitError("Please wait at least 5 minutes before resending an invitation"));
    }

    // Resend the invitation (create a new one with the same email)
    let newInvitation;
    try {
      newInvitation = await workos.userManagement.sendInvitation({
        email: invitation.email,
        organizationId: teamId,
        roleSlug: 'member', // Default role for resent invitations
      });
    } catch (error) {
      await logError(
        'Failed to resend invitation',
        { component: 'POST /api/teams/[id]/invitations/[invitationId]' },
        error as Error
      );
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message.includes('already exists')) {
        return handleApiError(createConflictError("A pending invitation already exists for this email"));
      }
      
      return handleApiError(createInternalError("Failed to resend invitation", error as Error));
    }

    // Revoke the old invitation
    try {
      await workos.userManagement.revokeInvitation(invitationId);
    } catch (error) {
      await logError(
        'Failed to revoke old invitation',
        { component: 'POST /api/teams/[id]/invitations/[invitationId]' },
        error as Error
      );
      // Don't fail the request if we can't revoke the old one
    }

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      invitation: {
        id: newInvitation.id,
        email: newInvitation.email,
        organizationId: newInvitation.organizationId,
        state: newInvitation.state,
        createdAt: newInvitation.createdAt,
        expiresAt: newInvitation.expiresAt,
      },
    });

  } catch (error: unknown) {
    await logError(
      'Failed to resend invitation',
      { component: 'POST /api/teams/[id]/invitations/[invitationId]' },
      error as Error
    );
    
    return handleApiError(error);
  }
});
