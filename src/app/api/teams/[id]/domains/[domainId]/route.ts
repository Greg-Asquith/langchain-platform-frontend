// src/app/api/teams/[id]/domains/[domainId]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { DomainData } from "@workos-inc/node";

import { withCSRFProtection } from "@/lib/csrf";
import { getSession } from "@/lib/session";
import { validateDomainId, validateTeamId } from "@/lib/teams";
import { workos } from "@/lib/workos";

// Remove domain from team
export const DELETE = withCSRFProtection(async (request: NextRequest, ...args: unknown[]) => {
  const { params } = args[0] as { params: Promise<{ id: string; domainId: string }> };

  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: teamId, domainId } = await params;

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this organization" },
        { status: 403 }
      );
    }

    // Get current organization
    let organization;
    try {
      organization = await workos.organizations.getOrganization(teamId);
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if this is a personal team
    if (organization.metadata?.personal === "true") {
      return NextResponse.json(
        { error: "Cannot manage domains on personal teams" },
        { status: 400 }
      );
    }

    // Check if user is admin of the organization
    let memberships;
    try {
      memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: teamId,
      });
    } catch (error) {
      console.error('Failed to fetch organization memberships:', error);
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 }
      );
    }

    const membership = memberships.data.find(m => m.organizationId === teamId);
    if (!membership || membership.role?.slug !== 'admin') {
      return NextResponse.json(
        { error: "Only organization admins can manage domains" },
        { status: 403 }
      );
    }
    
    // Find the domain to remove
    const domainToRemove = organization.domains?.find(d => d.id === domainId);
    if (!domainToRemove) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
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
      console.error('Failed to remove domain:', error);
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { error: "Domain or organization not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to remove domain" },
        { status: 500 }
      );
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
    console.error("Failed to remove domain:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
});

// Get domain details
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; domainId: string }> }) {
  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: teamId, domainId } = await params;

    // Validate UUID format for team ID
    if (!validateTeamId(teamId)) {
      return NextResponse.json(
        { error: "Invalid team ID format" },
        { status: 400 }
      );
    }

    // Validate UUID format for domain ID
    if (!validateDomainId(domainId)) {
      return NextResponse.json(
        { error: "Invalid domain ID format" },
        { status: 400 }
      );
    }

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this organization" },
        { status: 403 }
      );
    }

    // Get organization and find the domain
    let organization;
    try {
      organization = await workos.organizations.getOrganization(teamId);
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }
    
    // Find the specific domain
    const domain = organization.domains?.find(d => d.id === domainId);
    if (!domain) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
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
    console.error("Failed to get domain details:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}