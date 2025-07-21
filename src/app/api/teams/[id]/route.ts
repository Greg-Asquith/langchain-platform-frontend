// src/app/api/teams/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { withCSRFProtection } from "@/lib/csrf";
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
    const validationResult = updateTeamSchema.safeParse(body);
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

    const { name, description, color } = validationResult.data;

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
    } catch (error) {
      console.error('Failed to fetch team memberships:', error);
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 }
      );
    }

    const membership = memberships.data.find(m => m.organizationId === teamId);
    if (!membership || membership.role?.slug !== 'admin') {
      return NextResponse.json(
        { error: "Only team admins can update team settings" },
        { status: 403 }
      );
    }

    // Get current organization to preserve existing metadata
    let currentOrg;
    try {
      currentOrg = await workos.organizations.getOrganization(teamId);
    } catch (error) {
      console.error('Failed to fetch current organization:', error);
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Check if name is being changed and if it conflicts with existing orgs
    if (name && name !== currentOrg.name) {
      // Optional: Check for name conflicts within user's organizations
      const nameConflict = organizations?.some(org => 
        org.id !== teamId && 
        org.name.toLowerCase() === name.toLowerCase()
      );
      
      if (nameConflict) {
        return NextResponse.json(
          { error: "A team with this name already exists" },
          { status: 409 }
        );
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
      console.error('Failed to update organization:', error);
      
      // Handle specific WorkOS errors
      if (error instanceof Error) {
        if (error.message.includes('name')) {
          return NextResponse.json(
            { error: "Team name is already taken" },
            { status: 409 }
          );
        }
        if (error.message.includes('not found')) {
          return NextResponse.json(
            { error: "Team not found" },
            { status: 404 }
          );
        }
      }
      
      return NextResponse.json(
        { error: "Failed to update team settings" },
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
        metadata: updatedOrganization.metadata,
        updatedAt: updatedOrganization.updatedAt,
      },
      message: "Team settings updated successfully"
    });

  } catch (error) {
    console.error("Failed to update team:", error);
    
    // Don't leak internal error details
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
});

// Delete team
export const DELETE = withCSRFProtection(async (request: NextRequest, ...args: unknown[]) => {

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
    } catch (error) {
      console.error('Failed to fetch team memberships:', error);
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 }
      );
    }

    const membership = memberships.data.find(m => m.organizationId === teamId);
    if (!membership || membership.role?.slug !== 'admin') {
      return NextResponse.json(
        { error: "Only team admins can delete teams" },
        { status: 403 }
      );
    }

    // Get organization details for validation
    let organization;
    try {
      organization = await workos.organizations.getOrganization(teamId);
    } catch (error) {
      console.error('Failed to fetch team:', error);
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Prevent deletion of personal organizations
    if (organization.metadata?.personal === "true") {
      return NextResponse.json(
        { error: "Cannot delete personal teams" },
        { status: 400 }
      );
    }

    // Check if organization has multiple members (safety check)
    const allMemberships = await workos.userManagement.listOrganizationMemberships({
      organizationId: teamId,
      limit: 100,
    });

    if (allMemberships.data.length > 1) {
      return NextResponse.json(
        { error: "Cannot delete team with multiple members. Remove all members first." },
        { status: 400 }
      );
    }

    // Delete the organization
    try {
      await workos.organizations.deleteOrganization(teamId);
    } catch (error) {
      console.error('Failed to delete team:', error);
      return NextResponse.json(
        { error: "Failed to delete team" },
        { status: 500 }
      );
    }

    // Refresh organizations in session
    try {
      await refreshOrganizations();
    } catch (error) {
      console.error('Failed to refresh teams in session:', error);
      // Don't fail the request if session refresh fails
    }

    return NextResponse.json({
      success: true,
      message: "Team deleted successfully",
    });

  } catch (error) {
    console.error("Failed to delete team:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
});