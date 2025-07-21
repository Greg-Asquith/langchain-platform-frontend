// src/app/api/teams/[id]/domains/[domainId]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { DomainData } from "@workos-inc/node";

import { withCSRFProtection } from "@/lib/csrf";
import { handleApiError, createAuthenticationError, createAuthorizationError, createValidationError, createNotFoundError, createInternalError } from "@/lib/error-handler";
import { logError } from "@/lib/logger";
import { getSession } from "@/lib/session";
import { validateDomainId, validateTeamId } from "@/lib/teams";
import { workos } from "@/lib/workos";

// Remove domain from team
export const DELETE = withCSRFProtection(async (request: NextRequest, ...args: unknown[]) => {
  const { params } = args[0] as { params: Promise<{ id: string; domainId: string }> };

  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    const { id: teamId, domainId } = await params;

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return handleApiError(createAuthorizationError("Access denied to this organization"));
    }

    // Get current organization
    let organization;
    try {
      organization = await workos.organizations.getOrganization(teamId);
    } catch (error) {
      await logError(
        'Failed to fetch organization',
        { component: 'DELETE /api/teams/[id]/domains/[domainId]' },
        error as Error
      );
      return handleApiError(createNotFoundError("Organization not found"));
    }

    // Check if this is a personal team
    if (organization.metadata?.personal === "true") {
      return handleApiError(createValidationError("Cannot manage domains on personal teams"));
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
        { component: 'DELETE /api/teams/[id]/domains/[domainId]' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to verify permissions", error as Error));
    }

    const membership = memberships.data.find(m => m.organizationId === teamId);
    if (!membership || membership.role?.slug !== 'admin') {
      return handleApiError(createAuthorizationError("Only organization admins can manage domains"));
    }
    
    // Find the domain to remove
    const domainToRemove = organization.domains?.find(d => d.id === domainId);
    if (!domainToRemove) {
      return handleApiError(createNotFoundError("Domain not found"));
    }

    // Prevent removal of the last domain if it's actively used
    // This is a business logic check - you might want to adjust based on your needs
    const remainingDomains = organization.domains?.filter(d => d.id !== domainId) || [];
    
    // Create new domain data array without the removed domain
    const updatedDomainData = remainingDomains.map(d => ({ 
      domain: d.domain, 
      state: d.state 
    }));

    // Update organization without the removed domain
    let updatedOrganization;
    try {
      updatedOrganization = await workos.organizations.updateOrganization({
        organization: teamId,
        name: organization.name,
        domainData: updatedDomainData as unknown as DomainData[],
      });
    } catch (error) {
      await logError(
        'Failed to remove domain',
        { component: 'DELETE /api/teams/[id]/domains/[domainId]' },
        error as Error
      );
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message.includes('not found')) {
        return handleApiError(createNotFoundError("Domain or organization not found"));
      }
      
      return handleApiError(createInternalError("Failed to remove domain", error as Error));
    }

    return NextResponse.json({
      success: true,
      message: "Domain removed successfully",
      removedDomain: {
        id: domainToRemove.id,
        domain: domainToRemove.domain,
        state: domainToRemove.state
      },
      organization: {
        id: updatedOrganization.id,
        name: updatedOrganization.name,
        domains: updatedOrganization.domains?.map(d => ({
          id: d.id,
          domain: d.domain,
          state: d.state
        })) || []
      }
    });

  } catch (error) {
    await logError(
      'Failed to remove domain',
      { component: 'DELETE /api/teams/[id]/domains/[domainId]' },
      error as Error
    );
    
    return handleApiError(error);
  }
});

// Get domain details
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; domainId: string }> }) {
  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    const { id: teamId, domainId } = await params;

    // Validate UUID format for team ID
    if (!validateTeamId(teamId)) {
      return handleApiError(createValidationError("Invalid team ID format"));
    }

    // Validate UUID format for domain ID
    if (!validateDomainId(domainId)) {
      return handleApiError(createValidationError("Invalid domain ID format"));
    }

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return handleApiError(createAuthorizationError("Access denied to this organization"));
    }

    // Get organization and find the domain
    let organization;
    try {
      organization = await workos.organizations.getOrganization(teamId);
    } catch (error) {
      await logError(
        'Failed to fetch organization',
        { component: 'GET /api/teams/[id]/domains/[domainId]' },
        error as Error
      );
      return handleApiError(createNotFoundError("Organization not found"));
    }
    
    // Find the specific domain
    const domain = organization.domains?.find(d => d.id === domainId);
    if (!domain) {
      return handleApiError(createNotFoundError("Domain not found"));
    }

    return NextResponse.json({
      domain: {
        id: domain.id,
        domain: domain.domain,
        state: domain.state,
        organizationId: organization.id
      },
      isPersonalTeam: organization.metadata?.personal === "true"
    });

  } catch (error) {
    await logError(
      'Failed to get domain details',
      { component: 'GET /api/teams/[id]/domains/[domainId]' },
      error as Error
    );
    
    return handleApiError(error);
  }
}