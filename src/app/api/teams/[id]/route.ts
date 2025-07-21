// src/app/api/teams/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { withCSRFProtection } from "@/lib/csrf";
import { handleApiError, createAuthenticationError, createAuthorizationError, createValidationError, createConflictError, createNotFoundError, createInternalError } from "@/lib/error-handler";
import { logError } from "@/lib/logger";
import { getSession, refreshOrganizations } from "@/lib/session";
import { validateTeamId } from "@/lib/teams";
import { workos } from "@/lib/workos";

// Input validation schema
const updateTeamSchema = z.object({
  name: z.string()
    .min(1, "Team name is required")
    .max(50, "Team name must be less than 50 characters")
    .regex(/^[a-zA-Z0-9\s\-_']+$/, "Team name can only contain letters, numbers, spaces, hyphens, underscores, and apostrophes"),
  description: z.string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
  color: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format")
    .optional(),
});

// Update team settings
export const PUT = withCSRFProtection(async (request: NextRequest, ...args: unknown[]) => {

  const { params } = args[0] as { params: Promise<{ id: string }> };

  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    const { id: teamId } = await params;
    
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error: unknown) {
      await logError(
        'Error parsing JSON in request body',
        { component: 'PUT /api/teams/[id]' },
        error as Error
      );
      return handleApiError(createValidationError("Invalid JSON in request body"));
    }

    // Validate input data
    const validationResult = updateTeamSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(createValidationError(
        "Invalid input data",
        { details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })) }
      ));
    }

    const { name, description, color } = validationResult.data;

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
    } catch (error) {
      await logError(
        'Failed to fetch team memberships',
        { component: 'PUT /api/teams/[id]' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to verify permissions", error as Error));
    }

    const membership = memberships.data.find(m => m.organizationId === teamId);
    if (!membership || membership.role?.slug !== 'admin') {
      return handleApiError(createAuthorizationError("Only team admins can update team settings"));
    }

    // Get current organization to preserve existing metadata
    let currentOrg;
    try {
      currentOrg = await workos.organizations.getOrganization(teamId);
    } catch (error) {
      await logError(
        'Failed to fetch current organization',
        { component: 'PUT /api/teams/[id]' },
        error as Error
      );
      return handleApiError(createNotFoundError("Team not found"));
    }

    // Check if name is being changed and if it conflicts with existing orgs
    if (name && name !== currentOrg.name) {
      // Optional: Check for name conflicts within user's organizations
      const nameConflict = organizations?.some(org => 
        org.id !== teamId && 
        org.name.toLowerCase() === name.toLowerCase()
      );
      
      if (nameConflict) {
        return handleApiError(createConflictError("A team with this name already exists"));
      }
    }

    // Update organization
    let updatedOrganization;
    try {
      updatedOrganization = await workos.organizations.updateOrganization({
        organization: teamId,
        name: name?.trim() || currentOrg.name,
        metadata: {
          ...currentOrg.metadata,
          description: description?.trim() || currentOrg.metadata?.description || "",
          colour: color || currentOrg.metadata?.colour || "#ff5c4d",
          updatedAt: new Date().toISOString(),
          updatedBy: user.id,
        },
      });
    } catch (error) {
      await logError(
        'Failed to update organization',
        { component: 'PUT /api/teams/[id]' },
        error as Error
      );
      
      // Handle specific WorkOS errors
      if (error instanceof Error) {
        if (error.message.includes('name')) {
          return handleApiError(createConflictError("Team name is already taken"));
        }
        if (error.message.includes('not found')) {
          return handleApiError(createNotFoundError("Team not found"));
        }
      }
      
      return handleApiError(createInternalError("Failed to update team settings", error as Error));
    }

    // Refresh organizations in session to update sidebar
    try {
      await refreshOrganizations();
    } catch (error) {
      await logError(
        'Failed to refresh teams in session',
        { component: 'PUT /api/teams/[id]' },
        error as Error
      );
      // Don't fail the request if session refresh fails
    }

    return NextResponse.json({
      organization: {
        id: updatedOrganization.id,
        name: updatedOrganization.name,
        metadata: updatedOrganization.metadata,
        updatedAt: updatedOrganization.updatedAt,
      },
      message: "Team settings updated successfully"
    });

  } catch (error) {
    await logError(
      'Failed to update team',
      { component: 'PUT /api/teams/[id]' },
      error as Error
    );
    
    return handleApiError(error);
  }
});

// Delete team
export const DELETE = withCSRFProtection(async (request: NextRequest, ...args: unknown[]) => {

  const { params } = args[0] as { params: Promise<{ id: string }> };

  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    const { id: teamId } = await params;

    // Validate UUID format for team ID
    if (!validateTeamId(teamId)) {
      return handleApiError(createValidationError("Invalid team ID format"));
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
    } catch (error) {
      await logError(
        'Failed to fetch team memberships',
        { component: 'DELETE /api/teams/[id]' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to verify permissions", error as Error));
    }

    const membership = memberships.data.find(m => m.organizationId === teamId);
    if (!membership || membership.role?.slug !== 'admin') {
      return handleApiError(createAuthorizationError("Only team admins can delete teams"));
    }

    // Get organization details for validation
    let organization;
    try {
      organization = await workos.organizations.getOrganization(teamId);
    } catch (error) {
      await logError(
        'Failed to fetch team',
        { component: 'DELETE /api/teams/[id]' },
        error as Error
      );
      return handleApiError(createNotFoundError("Team not found"));
    }

    // Prevent deletion of personal organizations
    if (organization.metadata?.personal === "true") {
      return handleApiError(createValidationError("Cannot delete personal teams"));
    }

    // Check if organization has multiple members (safety check)
    const allMemberships = await workos.userManagement.listOrganizationMemberships({
      organizationId: teamId,
      limit: 100,
    });

    if (allMemberships.data.length > 1) {
      return handleApiError(createValidationError("Cannot delete team with multiple members. Remove all members first."));
    }

    // Delete the organization
    try {
      await workos.organizations.deleteOrganization(teamId);
    } catch (error) {
      await logError(
        'Failed to delete team',
        { component: 'DELETE /api/teams/[id]' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to delete team", error as Error));
    }

    // Refresh organizations in session
    try {
      await refreshOrganizations();
    } catch (error) {
      await logError(
        'Failed to refresh teams in session',
        { component: 'DELETE /api/teams/[id]' },
        error as Error
      );
      // Don't fail the request if session refresh fails
    }

    return NextResponse.json({
      success: true,
      message: "Team deleted successfully",
    });

  } catch (error) {
    await logError(
      'Failed to delete team',
      { component: 'DELETE /api/teams/[id]' },
      error as Error
    );
    
    return handleApiError(error);
  }
});