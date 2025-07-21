// src/app/api/teams/[id]/invitations/[invitationId]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { withCSRFProtection } from "@/lib/csrf";
import { getSession } from "@/lib/session";
import { validateTeamId, validateInvitationId } from "@/lib/teams";
import { workos } from "@/lib/workos";

// Revoke invitation
export const DELETE = withCSRFProtection(async (request: NextRequest, ...args: unknown[]) => {
  const { params } = args[0] as { params: Promise<{ id: string; invitationId: string }> };

  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: teamId, invitationId } = await params;

    // Validate UUID format for team ID
    if (!validateTeamId(teamId)) {
      return NextResponse.json(
        { error: "Invalid team ID format" },
        { status: 400 }
      );
    }

    // Validate UUID format for invitation ID
    if (!validateInvitationId(invitationId)) {
      return NextResponse.json(
        { error: "Invalid invitation ID format" },
        { status: 400 }
      );
    }

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this team" },
        { status: 403 }
      );
    }

    // Check if user is admin of the organization
    let memberships;
    try {
      memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: teamId,
      });
    } catch (error: unknown) {
      console.error('Failed to fetch team memberships:', error);
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 }
      );
    }

    const membership = memberships.data.find(m => m.organizationId === teamId);
    if (!membership || membership.role?.slug !== 'admin') {
      return NextResponse.json(
        { error: "Only team admins can revoke invitations" },
        { status: 403 }
      );
    }

    // Get the invitation to verify it belongs to this organization
    let invitation;
    try {
      invitation = await workos.userManagement.getInvitation(invitationId);
    } catch (error: unknown) {
      console.error('Failed to fetch invitation:', error);
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }
    
    if (invitation.organizationId !== teamId) {
      return NextResponse.json(
        { error: "Invitation not found in this team" },
        { status: 404 }
      );
    }

    // Check if invitation is already expired or accepted
    if (invitation.state === 'accepted') {
      return NextResponse.json(
        { error: "Cannot revoke an already accepted invitation" },
        { status: 400 }
      );
    }

    if (invitation.state === 'expired') {
      return NextResponse.json(
        { error: "Invitation has already expired" },
        { status: 400 }
      );
    }

    // Revoke the invitation
    try {
      await workos.userManagement.revokeInvitation(invitationId);
    } catch (error: unknown) {
      console.error('Failed to revoke invitation:', error);
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { error: "Invitation not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to revoke invitation" },
        { status: 500 }
      );
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
    console.error("Failed to revoke invitation:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
});

// Get invitation details
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; invitationId: string }> }) {
  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: teamId, invitationId } = await params;

    // Validate UUID format for team ID
    if (!validateTeamId(teamId)) {
      return NextResponse.json(
        { error: "Invalid team ID format" },
        { status: 400 }
      );
    }

    // Validate UUID format for invitation ID
    if (!validateInvitationId(invitationId)) {
      return NextResponse.json(
        { error: "Invalid invitation ID format" },
        { status: 400 }
      );
    }

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this team" },
        { status: 403 }
      );
    }

    // Get the invitation
    let invitation;
    try {
      invitation = await workos.userManagement.getInvitation(invitationId);
    } catch (error: unknown) {
      console.error('Failed to fetch invitation:', error);
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }
    
    if (invitation.organizationId !== teamId) {
      return NextResponse.json(
        { error: "Invitation not found in this team" },
        { status: 404 }
      );
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
    console.error("Failed to get invitation:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Resend invitation
export const POST = withCSRFProtection(async (request: NextRequest, ...args: unknown[]) => {
  const { params } = args[0] as { params: Promise<{ id: string; invitationId: string }> };

  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: teamId, invitationId } = await params;

    // Validate UUID format for team ID
    if (!validateTeamId(teamId)) {
      return NextResponse.json(
        { error: "Invalid team ID format" },
        { status: 400 }
      );
    }

    // Validate UUID format for invitation ID
    if (!validateInvitationId(invitationId)) {
      return NextResponse.json(
        { error: "Invalid invitation ID format" },
        { status: 400 }
      );
    }

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this team" },
        { status: 403 }
      );
    }

    // Check if user is admin of the organization
    let memberships;
    try {
      memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: teamId,
      });
    } catch (error: unknown) {
      console.error('Failed to fetch team memberships:', error);
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 }
      );
    }

    const membership = memberships.data.find(m => m.organizationId === teamId);
    if (!membership || membership.role?.slug !== 'admin') {
      return NextResponse.json(
        { error: "Only team admins can resend invitations" },
        { status: 403 }
      );
    }

    // Get the invitation to verify it belongs to this organization
    let invitation;
    try {
      invitation = await workos.userManagement.getInvitation(invitationId);
    } catch (error: unknown) {
      console.error('Failed to fetch invitation:', error);
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }
    
    if (invitation.organizationId !== teamId) {
      return NextResponse.json(
        { error: "Invitation not found in this team" },
        { status: 404 }
      );
    }

    // Check if invitation can be resent
    if (invitation.state === 'accepted') {
      return NextResponse.json(
        { error: "Cannot resend an already accepted invitation" },
        { status: 400 }
      );
    }

    // Rate limiting check - don't allow resending too frequently
    const now = new Date();
    const createdAt = new Date(invitation.createdAt);
    const timeSinceCreation = now.getTime() - createdAt.getTime();
    const minResendInterval = 5 * 60 * 1000; // 5 minutes

    if (timeSinceCreation < minResendInterval) {
      return NextResponse.json(
        { error: "Please wait at least 5 minutes before resending an invitation" },
        { status: 429 }
      );
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
      console.error('Failed to resend invitation:', error);
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message.includes('already exists')) {
        return NextResponse.json(
          { error: "A pending invitation already exists for this email" },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to resend invitation" },
        { status: 500 }
      );
    }

    // Revoke the old invitation
    try {
      await workos.userManagement.revokeInvitation(invitationId);
    } catch (error) {
      console.error('Failed to revoke old invitation:', error);
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
    console.error("Failed to resend invitation:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
});
