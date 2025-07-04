// src/app/api/teams/invitations/route.ts

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

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

export async function POST(request: NextRequest) {

  try {
    const { user, organizations, currentOrganizationId } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!validateTeamId(currentOrganizationId)) {
      return NextResponse.json(
        { error: "No current team selected" },
        { status: 400 }
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
    const validationResult = createInvitationSchema.safeParse(body);
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

    const { email, role } = validationResult.data;

    // Verify user has access to current organization and is admin
    const currentOrg = organizations?.find(org => org.id === currentOrganizationId);
    if (!currentOrg) {
      return NextResponse.json(
        { error: "Current team not found" },
        { status: 404 }
      );
    }

    // Get full organization details to check if it's personal
    let organization;
    try {
      organization = await workos.organizations.getOrganization(currentOrg.id);
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
        { error: "Cannot invite members to personal teams" },
        { status: 400 }
      );
    }

    // Check if user is admin of the organization
    let memberships;
    try {
      memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: currentOrganizationId,
      });
    } catch (error) {
      console.error('Failed to fetch team memberships:', error);
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 }
      );
    }

    const membership = memberships.data.find(m => m.organizationId === currentOrganizationId);
    if (!membership || membership.role?.slug !== 'admin') {
      return NextResponse.json(
        { error: "Only team admins can send invitations" },
        { status: 403 }
      );
    }

    // Check if user is trying to invite themselves
    if (email === user.email) {
      return NextResponse.json(
        { error: "You cannot invite yourself" },
        { status: 400 }
      );
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
          return NextResponse.json(
            { error: "User is already a member of this team" },
            { status: 409 }
          );
        }
      }
    } catch (error) {
      // User doesn't exist yet, which is fine for invitations
      console.log('User not found, proceeding with invitation');
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
      return NextResponse.json(
        { error: "A pending invitation already exists for this email address" },
        { status: 409 }
      );
    }

    // Check organization limits (if any)
    const totalMembers = existingMemberships.data.length + existingInvitations.data.filter(inv => inv.state === 'pending').length;
    const maxMembers = 50; // Adjust based on your business logic
    
    if (totalMembers >= maxMembers) {
      return NextResponse.json(
        { error: `Team has reached the maximum limit of ${maxMembers} members` },
        { status: 400 }
      );
    }

    // Rate limiting check - prevent spam invitations
    const recentInvitations = existingInvitations.data.filter(inv => {
      const createdAt = new Date(inv.createdAt);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return createdAt > oneHourAgo;
    });

    if (recentInvitations.length >= 10) {
      return NextResponse.json(
        { error: "Too many invitations sent recently. Please wait before sending more." },
        { status: 429 }
      );
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
      console.error('Failed to create invitation:', error);
      
      // Handle specific WorkOS errors
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          return NextResponse.json(
            { error: "An invitation for this email already exists" },
            { status: 409 }
          );
        }
        if (error.message.includes('invalid email')) {
          return NextResponse.json(
            { error: "Invalid email address" },
            { status: 400 }
          );
        }
        if (error.message.includes('organization not found')) {
          return NextResponse.json(
            { error: "Team not found" },
            { status: 404 }
          );
        }
      }
      
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
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

  } catch (error) {
    console.error("Failed to create invitation:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, currentOrganizationId } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!validateTeamId(currentOrganizationId)) {
      return NextResponse.json(
        { error: "No current team selected" },
        { status: 400 }
      );
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
      console.error('Failed to fetch invitations:', error);
      return NextResponse.json(
        { error: "Failed to get invitations" },
        { status: 500 }
      );
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
    } catch (error) {
      console.error('Failed to check admin status:', error);
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

  } catch (error) {
    console.error("Failed to get invitations:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}