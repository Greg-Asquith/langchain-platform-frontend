// src/app/api/teams/switch/route.ts

import { NextRequest, NextResponse } from "next/server";

import { withCSRFProtection } from "@/lib/csrf";
import { handleApiError, createAuthenticationError, createAuthorizationError, createValidationError, createInternalError } from "@/lib/error-handler";
import { logError } from "@/lib/logger";
import { getSession, switchOrganization } from "@/lib/session";
import { validateTeamId } from "@/lib/teams";
import { workos } from "@/lib/workos";

export const POST = withCSRFProtection(async (request: NextRequest) => {
  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!validateTeamId(organizationId)) {
      return handleApiError(createValidationError("Organization ID is required"));
    }

    // Verify user has access to this organization
    const hasAccess = organizations?.some(org => org.id === organizationId);
    if (!hasAccess) {
      return handleApiError(createAuthorizationError("Access denied to this team"));
    }

    // Get user's role in the organization
    let userRole = 'member'; // default role
    try {
      const memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: organizationId,
      });
      
      const membership = memberships.data.find(m => m.organizationId === organizationId);
      if (membership?.role?.slug) {
        userRole = membership.role.slug;
      }
    } catch (error) {
      await logError(
        'Failed to fetch user role',
        { component: 'POST /api/teams/switch' },
        error as Error
      );
      // Continue with default role
    }

    // Switch to the organization
    const success = await switchOrganization(organizationId);
    
    if (!success) {
      return handleApiError(createInternalError("Failed to switch team"));
    }

    const currentOrg = organizations?.find(org => org.id === organizationId);

    return NextResponse.json({
      success: true,
      currentOrganization: currentOrg,
      userRole: userRole,
    });

  } catch (error) {
    await logError(
      'Failed to switch team',
      { component: 'POST /api/teams/switch' },
      error as Error
    );
    
    return handleApiError(error);
  }
});