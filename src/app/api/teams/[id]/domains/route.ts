// src/app/api/teams/[id]/domains/route.ts

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { DomainData } from "@workos-inc/node";

import { withCSRFProtection } from "@/lib/csrf";
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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: teamId } = await params;
    
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error: unknown) {
      console.error("Error parsing JSON in request body:", error);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate input data
    const validationResult = addDomainSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid input data",
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const { domain } = validationResult.data;

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this organization" },
        { status: 403 }
      );
    }

    // Get current organization to check if it's personal
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
        { error: "Cannot add domains to personal teams" },
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

    // Check if domain already exists
    const existingDomain = organization.domains?.find(d => d.domain === domain);
    if (existingDomain) {
      return NextResponse.json(
        { error: "Domain already exists" },
        { status: 409 }
      );
    }

    // Check domain limits (max 10 domains per organization)
    const currentDomains = organization.domains || [];
    if (currentDomains.length >= 10) {
      return NextResponse.json(
        { error: "Maximum 10 domains allowed per organization" },
        { status: 400 }
      );
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
      console.error('Failed to add domain:', error);
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message.includes('domain')) {
        return NextResponse.json(
          { error: "Domain is already in use by another organization" },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to add domain" },
        { status: 500 }
      );
    }

    // Find the newly added domain
    const newDomain = updatedOrganization.domains?.find(d => d.domain === domain);
    if (!newDomain) {
      return NextResponse.json(
        { error: "Domain was not added successfully" },
        { status: 500 }
      );
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
    console.error("Failed to add domain:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
});

// Get domains for team
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: teamId } = await params;

    // Validate UUID format for team ID
    if (!validateTeamId(teamId)) {
      return NextResponse.json(
        { error: "Invalid team ID format" },
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

    // Get organization domains
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
    console.error("Failed to get domains:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}