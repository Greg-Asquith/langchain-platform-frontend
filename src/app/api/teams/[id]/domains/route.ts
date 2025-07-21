// src/app/api/teams/[id]/domains/route.ts

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { DomainData } from "@workos-inc/node";

import { withCSRFProtection } from "@/lib/csrf";
import { handleApiError, createAuthenticationError, createAuthorizationError, createValidationError, createConflictError, createNotFoundError, createInternalError } from "@/lib/error-handler";
import { logError } from "@/lib/logger";
import { getSession } from "@/lib/session";
import { validateTeamId } from "@/lib/teams";
import { workos } from "@/lib/workos";

// Input validation schema
const addDomainSchema = z.object({
  domain: z.string()
    .min(1, "Domain is required")
    .max(253, "Domain name too long")
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, "Invalid domain format")
    .transform(val => val.toLowerCase().trim()),
});

// Add domain to team
export const POST = withCSRFProtection(async (request: NextRequest, ...args: unknown[]) => {
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
        { component: 'POST /api/teams/[id]/domains' },
        error as Error
      );
      return handleApiError(createValidationError("Invalid JSON in request body"));
    }

    // Validate input data
    const validationResult = addDomainSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(createValidationError(
        "Invalid input data",
        { details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })) }
      ));
    }

    const { domain } = validationResult.data;

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return handleApiError(createAuthorizationError("Access denied to this organization"));
    }

    // Get current organization to check if it's personal
    let organization;
    try {
      organization = await workos.organizations.getOrganization(teamId);
    } catch (error) {
      await logError(
        'Failed to fetch organization',
        { component: 'POST /api/teams/[id]/domains' },
        error as Error
      );
      return handleApiError(createNotFoundError("Organization not found"));
    }

    // Check if this is a personal team
    if (organization.metadata?.personal === "true") {
      return handleApiError(createValidationError("Cannot add domains to personal teams"));
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
        'Failed to fetch organization memberships',
        { component: 'POST /api/teams/[id]/domains' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to verify permissions", error as Error));
    }

    const membership = memberships.data.find(m => m.organizationId === teamId);
    if (!membership || membership.role?.slug !== 'admin') {
      return handleApiError(createAuthorizationError("Only organization admins can manage domains"));
    }

    // Check if domain already exists
    const existingDomain = organization.domains?.find(d => d.domain === domain);
    if (existingDomain) {
      return handleApiError(createConflictError("Domain already exists"));
    }

    // Check domain limits (max 10 domains per organization)
    const currentDomains = organization.domains || [];
    if (currentDomains.length >= 10) {
      return handleApiError(createValidationError("Maximum 10 domains allowed per organization"));
    }

    // Check if domain is already in use by another organization
    // This would be caught by WorkOS but we can add our own check if needed
    
    // Create new domain data array
    const newDomainData = [
      ...currentDomains.map(d => ({ domain: d.domain, state: d.state })),
      { domain, state: 'pending' as const }
    ];

    // Update organization with new domain
    let updatedOrganization;
    try {
      updatedOrganization = await workos.organizations.updateOrganization({
        organization: teamId,
        name: organization.name,
        domainData: newDomainData as DomainData[],
      });
    } catch (error) {
      await logError(
        'Failed to add domain',
        { component: 'POST /api/teams/[id]/domains' },
        error as Error
      );
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message.includes('domain')) {
        return handleApiError(createConflictError("Domain is already in use by another organization"));
      }
      
      return handleApiError(createInternalError("Failed to add domain", error as Error));
    }

    // Find the newly added domain
    const newDomain = updatedOrganization.domains?.find(d => d.domain === domain);
    if (!newDomain) {
      return handleApiError(createInternalError("Domain was not added successfully"));
    }

    return NextResponse.json({
      domain: {
        id: newDomain.id,
        domain: newDomain.domain,
        state: newDomain.state
      },
      organization: {
        id: updatedOrganization.id,
        name: updatedOrganization.name,
        domains: updatedOrganization.domains?.map(d => ({
          id: d.id,
          domain: d.domain,
          state: d.state
        })) || []
      },
      message: "Domain added successfully"
    });

  } catch (error: unknown) {
    await logError(
      'Failed to add domain',
      { component: 'POST /api/teams/[id]/domains' },
      error as Error
    );
    
    return handleApiError(error);
  }
});

// Get domains for team
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      return handleApiError(createAuthorizationError("Access denied to this organization"));
    }

    // Get organization domains
    let organization;
    try {
      organization = await workos.organizations.getOrganization(teamId);
    } catch (error) {
      await logError(
        'Failed to fetch organization',
        { component: 'GET /api/teams/[id]/domains' },
        error as Error
      );
      return handleApiError(createNotFoundError("Organization not found"));
    }

    return NextResponse.json({
      domains: organization.domains?.map(d => ({
        id: d.id,
        domain: d.domain,
        state: d.state
      })) || [],
      totalDomains: organization.domains?.length || 0,
      maxDomains: 10,
      isPersonalTeam: organization.metadata?.personal === "true"
    });

  } catch (error: unknown) {
    await logError(
      'Failed to get domains',
      { component: 'GET /api/teams/[id]/domains' },
      error as Error
    );
    
    return handleApiError(error);
  }
}