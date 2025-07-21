// src/app/api/teams/invitations/route.ts

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { withCSRFProtection } from "@/lib/csrf";
import { handleApiError, createAuthenticationError, createAuthorizationError, createValidationError, createConflictError, createNotFoundError, createInternalError, createRateLimitError } from "@/lib/error-handler";
import { logError } from "@/lib/logger";
import { getSession } from "@/lib/session";
import { validateTeamId } from "@/lib/teams";
import { workos } from "@/lib/workos";

// Input validation schema
const createInvitationSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .min(1, "Email is required")
    .max(254, "Email address is too long")
    .transform(val => val.toLowerCase().trim()),
  role: z.enum(["admin", "member"], {
    required_error: "Role must be either 'admin' or 'member'",
  }).default("member"),
});

export const POST = withCSRFProtection(async (request: NextRequest) => {

  try {
    const { user, organizations, currentOrganizationId } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    if (!validateTeamId(currentOrganizationId)) {
      return handleApiError(createValidationError("No current team selected"));
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error: unknown) {
      await logError(
        'Error parsing JSON in request body',
        { component: 'POST /api/teams/invitations' },
        error as Error
      );
      return handleApiError(createValidationError("Invalid JSON in request body"));
    }

    // Validate input data
    const validationResult = createInvitationSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(createValidationError(
        "Invalid input data",
        { details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })) }
      ));
    }

    const { email, role } = validationResult.data;

    // Verify user has access to current organization and is admin
    const currentOrg = organizations?.find(org => org.id === currentOrganizationId);
    if (!currentOrg) {
      return handleApiError(createNotFoundError("Current team not found"));
    }

    // Get full organization details to check if it's personal
    let organization;
    try {
      organization = await workos.organizations.getOrganization(currentOrg.id);
    } catch (error) {
      await logError(
        'Failed to fetch organization',
        { component: 'POST /api/teams/invitations' },
        error as Error
      );
      return handleApiError(createNotFoundError("Organization not found"));
    }

    // Check if this is a personal team
    if (organization.metadata?.personal === "true") {
      return handleApiError(createValidationError("Cannot invite members to personal teams"));
    }

    // Check if user is admin of the organization
    let memberships;
    try {
      memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: currentOrganizationId,
      });
    } catch (error) {
      await logError(
        'Failed to fetch team memberships',
        { component: 'POST /api/teams/invitations' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to verify permissions", error as Error));
    }

    const membership = memberships.data.find(m => m.organizationId === currentOrganizationId);
    if (!membership || membership.role?.slug !== 'admin') {
      return handleApiError(createAuthorizationError("Only team admins can send invitations"));
    }

    // Check if user is trying to invite themselves
    if (email === user.email) {
      return handleApiError(createValidationError("You cannot invite yourself"));
    }

    // Check if user is already a member of the organization
    const existingMemberships = await workos.userManagement.listOrganizationMemberships({
      organizationId: currentOrganizationId,
      limit: 100,
    });

    // Get user by email to check if they're already a member
    try {
      const users = await workos.userManagement.listUsers({
        email: email,
      });
      
      if (users.data.length > 0) {
        const existingUser = users.data[0];
        const existingMembership = existingMemberships.data.find(m => m.userId === existingUser.id);
        
        if (existingMembership) {
          return handleApiError(createConflictError("User is already a member of this team"));
        }
      }
    } catch (error: unknown) {
      await logError(
        'Error checking if user exists',
        { component: 'POST /api/teams/invitations' },
        error as Error
      );
      // User doesn't exist yet, which is fine for invitations
    }

    // Check for existing pending invitations
    const existingInvitations = await workos.userManagement.listInvitations({
      organizationId: currentOrganizationId,
      limit: 100,
    });

    const pendingInvitation = existingInvitations.data.find(
      inv => inv.email === email && inv.state === 'pending'
    );

    if (pendingInvitation) {
      return handleApiError(createConflictError("A pending invitation already exists for this email address"));
    }

    // Check organization limits (if any)
    const totalMembers = existingMemberships.data.length + existingInvitations.data.filter(inv => inv.state === 'pending').length;
    const maxMembers = 50; // Adjust based on your business logic
    
    if (totalMembers >= maxMembers) {
      return handleApiError(createValidationError(`Team has reached the maximum limit of ${maxMembers} members`));
    }

    // Rate limiting check - prevent spam invitations
    const recentInvitations = existingInvitations.data.filter(inv => {
      const createdAt = new Date(inv.createdAt);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return createdAt > oneHourAgo;
    });

    if (recentInvitations.length >= 10) {
      return handleApiError(createRateLimitError("Too many invitations sent recently. Please wait before sending more."));
    }

    // Create invitation
    let invitation;
    try {
      invitation = await workos.userManagement.sendInvitation({
        email: email,
        organizationId: currentOrganizationId,
        roleSlug: role,
      });
    } catch (error) {
      await logError(
        'Failed to create invitation',
        { component: 'POST /api/teams/invitations' },
        error as Error
      );
      
      // Handle specific WorkOS errors
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          return handleApiError(createConflictError("An invitation for this email already exists"));
        }
        if (error.message.includes('invalid email')) {
          return handleApiError(createValidationError("Invalid email address"));
        }
        if (error.message.includes('organization not found')) {
          return handleApiError(createNotFoundError("Team not found"));
        }
      }
      
      return handleApiError(createInternalError("Failed to create invitation", error as Error));
    }

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      invitation: {
        id: invitation.id,
        email: invitation.email,
        organizationId: invitation.organizationId,
        state: invitation.state,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        role: role,
      },
    });

  } catch (error: unknown) {
    await logError(
      'Failed to create invitation',
      { component: 'POST /api/teams/invitations' },
      error as Error
    );
    
    return handleApiError(error);
  }
});

export async function GET(request: NextRequest) {
  try {
    const { user, currentOrganizationId } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    if (!validateTeamId(currentOrganizationId)) {
      return handleApiError(createValidationError("No current team selected"));
    }

    // Get URL parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
    const state = searchParams.get('state');
    const email = searchParams.get('email');

    // Get invitations for the current organization
    let invitations;
    try {
      invitations = await workos.userManagement.listInvitations({
        organizationId: currentOrganizationId,
        limit: limit,
        ...(state && { state }),
        ...(email && { email }),
      });
    } catch (error) {
      await logError(
        'Failed to fetch invitations',
        { component: 'GET /api/teams/invitations' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to get invitations", error as Error));
    }

    // Check if user is admin to determine what data to return
    let isAdmin = false;
    let isPersonalTeam = false;
    try {
      const memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: currentOrganizationId,
      });
      
      const membership = memberships.data.find(m => m.organizationId === currentOrganizationId);
      isAdmin = membership?.role?.slug === 'admin';

      // Check if this is a personal team
      const organization = await workos.organizations.getOrganization(currentOrganizationId || '');
      isPersonalTeam = organization.metadata?.personal === "true";
    } catch (error: unknown) {
      await logError(
        'Failed to check admin status',
        { component: 'GET /api/teams/invitations' },
        error as Error
      );
    }

    // Filter invitation data based on user permissions
    const filteredInvitations = invitations.data.map(inv => ({
      id: inv.id,
      email: inv.email,
      organizationId: inv.organizationId,
      state: inv.state,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      ...(isAdmin && {
        acceptedAt: inv.acceptedAt,
        revokedAt: inv.revokedAt,
      }),
    }));

    return NextResponse.json({
      invitations: filteredInvitations,
      pagination: {
        total: invitations.data.length,
        limit,
        hasMore: invitations.data.length === limit,
      },
      permissions: {
        canManageInvitations: isAdmin && !isPersonalTeam,
      },
      isPersonalTeam,
    });

  } catch (error: unknown) {
    await logError(
      'Failed to get invitations',
      { component: 'GET /api/teams/invitations' },
      error as Error
    );
    
    return handleApiError(error);
  }
}