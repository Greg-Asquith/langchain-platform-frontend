// src/app/api/teams/route.ts

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { DomainData } from "@workos-inc/node";

import { withCSRFProtection } from "@/lib/csrf";
import { handleApiError, createAuthenticationError, createValidationError, createConflictError, createInternalError } from "@/lib/error-handler";
import { logError } from "@/lib/logger";
import { getSession, refreshOrganizations } from "@/lib/session";
import { workos } from "@/lib/workos";

// Input validation schema
const createTeamSchema = z.object({
  name: z.string()
    .min(1, "Organization name is required")
    .max(50, "Organization name must be less than 50 characters")
    .regex(/^[a-zA-Z0-9\s\-_]+$/, "Organization name can only contain letters, numbers, spaces, hyphens, and underscores"),
  description: z.string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
  color: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format")
    .default("#ff5c4d"),
  domains: z.array(z.string().regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, "Invalid domain format"))
    .max(10, "Maximum 10 domains allowed")
    .default([]),
});

export async function GET() {

  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    return NextResponse.json({
      organizations: organizations || [],
    });

  } catch (error) {
    await logError(
      'Failed to get organizations', 
      { component: 'GET /api/teams' }, 
      error as Error
    );
    
    return handleApiError(error);
  }
}

export const POST = withCSRFProtection(async (request: NextRequest) => {
  try {
    const { user } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error: unknown) {
      await logError(
        'Error parsing JSON in request body',
        { component: 'POST /api/teams' },
        error as Error
      );
      return handleApiError(createValidationError("Invalid JSON in request body"));
    }

    // Validate input data
    const validationResult = createTeamSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(createValidationError(
        "Invalid input data",
        { details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })) }
      ));
    }

    const { name, description, color, domains } = validationResult.data;

    // Check for duplicate domains
    const uniqueDomains = [...new Set(domains)];
    if (uniqueDomains.length !== domains.length) {
      return handleApiError(createValidationError("Duplicate domains are not allowed"));
    }

    // Prepare domain data for WorkOS
    const domainData = uniqueDomains.map((domain: string) => ({
      domain: domain.toLowerCase().trim(),
      state: 'pending' as const,
    }));

    // Create organization in WorkOS
    let organization;
    try {
      organization = await workos.organizations.createOrganization({
        name: name.trim(),
        domainData: domainData as unknown as DomainData[],
      });
    } catch (error: unknown) {
      await logError(
        'Failed to create team',
        { component: 'POST /api/teams' },
        error as Error
      );
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message.includes('domain')) {
        if (error.message.includes('domain')) {
          return handleApiError(createConflictError("One or more domains are already in use by another team"));
        }
        
        if (error instanceof Error && error.message.includes('name')) {
          return handleApiError(createConflictError("Team name is already taken"));
        }
      }
      
      return handleApiError(createInternalError("Failed to create team", error as Error));
    }

    // Update organization metadata with color and other settings
    let updatedOrganization;
    try {
      updatedOrganization = await workos.organizations.updateOrganization({
        organization: organization.id,
        name: organization.name,
        metadata: {
          personal: "false",
          colour: color,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          description: description || "",
        },
      });
    } catch (error: unknown) {
      await logError(
        'Failed to update team metadata',
        { component: 'POST /api/teams' },
        error as Error
      );
      
      // Try to clean up the created organization
      try {
        await workos.organizations.deleteOrganization(organization.id);
      } catch (cleanupError: unknown) {
        await logError(
          'Failed to cleanup team after metadata update failure',
          { component: 'POST /api/teams' },
          cleanupError as Error
        );
      }
      
      return handleApiError(createInternalError("Failed to configure team", error as Error));
    }

    // Add the user as an admin of the new organization
    try {
      await workos.userManagement.createOrganizationMembership({
        userId: user.id,
        organizationId: organization.id,
        roleSlug: 'admin',
      });
    } catch (error: unknown) {
      await logError(
        'Failed to add user as admin',
        { component: 'POST /api/teams' },
        error as Error
      );
      
      // Try to clean up the created organization
      try {
        await workos.organizations.deleteOrganization(organization.id);
      } catch (cleanupError: unknown) {
        await logError(
          'Failed to cleanup team after membership creation failure',
          { component: 'POST /api/teams' },
          cleanupError as Error
        );
      }
      
      return handleApiError(createInternalError("Failed to add user as team admin", error as Error));
    }

    // Refresh organizations in session to update sidebar
    try {
      await refreshOrganizations();
    } catch (error: unknown) {
      await logError(
        'Failed to refresh teams in session',
        { component: 'POST /api/teams' },
        error as Error
      );
      // Don't fail the request if session refresh fails
    }

    return NextResponse.json({
      organization: {
        id: updatedOrganization.id,
        name: updatedOrganization.name,
        color: color,
        domains: updatedOrganization.domains?.map(d => ({
          id: d.id,
          domain: d.domain,
          state: d.state,
        })) || [],
        metadata: updatedOrganization.metadata,
      },
      message: "Team created successfully"
    });

  } catch (error: unknown) {
    await logError(
      'Failed to create team',
      { component: 'POST /api/teams' },
      error as Error
    );
    
    return handleApiError(error);
  }
});