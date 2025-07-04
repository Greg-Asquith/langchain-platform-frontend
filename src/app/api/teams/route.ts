// src/app/api/teams/route.ts

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { DomainData } from "@workos-inc/node";

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

export async function GET(request: NextRequest) {

  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      organizations: organizations || [],
    });

  } catch (error) {
    console.error("Failed to get organizations:", error);
    
    return NextResponse.json(
      { error: "Failed to get organizations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate input data
    const validationResult = createTeamSchema.safeParse(body);
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

    const { name, description, color, domains } = validationResult.data;

    // Check for duplicate domains
    const uniqueDomains = [...new Set(domains)];
    if (uniqueDomains.length !== domains.length) {
      return NextResponse.json(
        { error: "Duplicate domains are not allowed" },
        { status: 400 }
      );
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
    } catch (error) {
      console.error('Failed to create team:', error);
      
      // Handle specific WorkOS errors
      if (error instanceof Error) {
        if (error.message.includes('domain')) {
          return NextResponse.json(
            { error: "One or more domains are already in use by another team" },
            { status: 409 }
          );
        }
        
        if (error.message.includes('name')) {
          return NextResponse.json(
            { error: "Team name is already taken" },
            { status: 409 }
          );
        }
      }
      
      return NextResponse.json(
        { error: "Failed to create team" },
        { status: 500 }
      );
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
    } catch (error) {
      console.error('Failed to update team metadata:', error);
      
      // Try to clean up the created organization
      try {
        await workos.organizations.deleteOrganization(organization.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup team after metadata update failure:', cleanupError);
      }
      
      return NextResponse.json(
        { error: "Failed to configure team" },
        { status: 500 }
      );
    }

    // Add the user as an admin of the new organization
    try {
      await workos.userManagement.createOrganizationMembership({
        userId: user.id,
        organizationId: organization.id,
        roleSlug: 'admin',
      });
    } catch (error) {
      console.error('Failed to add user as admin:', error);
      
      // Try to clean up the created organization
      try {
        await workos.organizations.deleteOrganization(organization.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup team after membership creation failure:', cleanupError);
      }
      
      return NextResponse.json(
        { error: "Failed to add user as team admin" },
        { status: 500 }
      );
    }

    // Refresh organizations in session to update sidebar
    try {
      await refreshOrganizations();
    } catch (error) {
      console.error('Failed to refresh teams in session:', error);
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

  } catch (error) {
    console.error("Failed to create team:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}