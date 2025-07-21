// src/app/api/teams/[id]/members/route.ts

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { RoleResponse } from "@workos-inc/node";

import { withCSRFProtection } from "@/lib/csrf";
import { getSession } from "@/lib/session";
import { validateTeamId } from "@/lib/teams";
import { workos } from "@/lib/workos";

// Input validation schemas
const updateMemberRoleSchema = z.object({
  membershipId: z.string()
    .regex(/^om_/, "Invalid membership ID format"),
  role: z.enum(["admin", "member"], {
    required_error: "Role must be either 'admin' or 'member'",
  }),
});

const bulkMemberActionSchema = z.object({
  action: z.enum(["remove", "update_role"], {
    required_error: "Action must be either 'remove' or 'update_role'",
  }),
  membershipIds: z.array(z.string().regex(/^om_/))
    .min(1, "At least one membership ID is required")
    .max(20, "Maximum 20 members can be processed at once"),
  role: z.enum(["admin", "member"]).optional(),
});

// Enhanced member interface with user details
interface EnhancedMember {
  id: string;
  userId: string;
  organizationId: string;
  role: RoleResponse;
  status: string;
  createdAt: string;
  updatedAt: string;
  isCurrentUser: boolean;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
  } | null;
}

// Get team members (enhanced with user details)
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
        { error: "Access denied to this team" },
        { status: 403 }
      );
    }

    // Get URL parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    // Get organization members
    let memberships;
    try {
      memberships = await workos.userManagement.listOrganizationMemberships({
        organizationId: teamId,
        limit: limit,
        ...(offset > 0 && { after: offset.toString() }),
      });
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      return NextResponse.json(
        { error: "Failed to fetch team members" },
        { status: 500 }
      );
    }

    // Filter members if role filter is applied
    let filteredMembers = memberships.data;
    if (role && ['admin', 'member'].includes(role)) {
      filteredMembers = filteredMembers.filter(member => member.role?.slug === role);
    }

    // Fetch user details for each member
    const enhancedMembers: EnhancedMember[] = await Promise.all(
      filteredMembers.map(async (member) => {
        let userDetails = null;
        try {
          const userData = await workos.userManagement.getUser(member.userId);
          userDetails = {
            id: userData.id,
            email: userData.email,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            profilePictureUrl: userData.profilePictureUrl || '',
          };
        } catch (error) {
          console.error(`Failed to fetch user details for ${member.userId}:`, error);
          // Keep userDetails as null - we'll handle this in the UI
        }

        return {
          id: member.id,
          userId: member.userId,
          organizationId: member.organizationId,
          role: member.role,
          status: member.status,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
          isCurrentUser: member.userId === user.id,
          user: userDetails,
        };
      })
    );

    // Apply search filter on enhanced members (search by name or email)
    let finalMembers = enhancedMembers;
    if (search) {
      const searchLower = search.toLowerCase();
      finalMembers = enhancedMembers.filter(member => {
        if (!member.user) return member.userId.toLowerCase().includes(searchLower);
        
        const firstName = member.user.firstName?.toLowerCase() || '';
        const lastName = member.user.lastName?.toLowerCase() || '';
        const email = member.user.email.toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        
        return firstName.includes(searchLower) ||
               lastName.includes(searchLower) ||
               fullName.includes(searchLower) ||
               email.includes(searchLower) ||
               member.userId.toLowerCase().includes(searchLower);
      });
    }

    // Get pending invitations
    let invitations;
    try {
      invitations = await workos.userManagement.listInvitations({
        organizationId: teamId,
        limit: 100,
      });
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      invitations = { data: [] };
    }

    // Get current user's membership to determine permissions
    const currentUserMembership = finalMembers.find(m => m.userId === user.id);
    const isCurrentUserAdmin = currentUserMembership?.role?.slug === 'admin';

    return NextResponse.json({
      members: finalMembers,
      invitations: invitations.data.map(invite => ({
        id: invite.id,
        email: invite.email,
        organizationId: invite.organizationId,
        state: invite.state,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
      })),
      pagination: {
        total: finalMembers.length,
        limit,
        offset,
        hasMore: memberships.data.length === limit,
      },
      permissions: {
        canManageMembers: isCurrentUserAdmin,
        canInviteMembers: isCurrentUserAdmin,
        canUpdateRoles: isCurrentUserAdmin,
      },
    });

  } catch (error) {
    console.error("Failed to get team members:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Update member role
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

    // Validate UUID format for team ID
    if (!validateTeamId(teamId)) {
      return NextResponse.json(
        { error: "Invalid team ID format" },
        { status: 400 }
      );
    }

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
    const validationResult = updateMemberRoleSchema.safeParse(body);
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

    const { membershipId, role } = validationResult.data;

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this organization" },
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
    } catch (error: unknown) {
      console.error('Failed to fetch team memberships:', error);
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 }
      );
    }

    const membership = memberships.data.find(m => m.organizationId === teamId);
    if (!membership || membership.role?.slug !== 'admin') {
      return NextResponse.json(
        { error: "Only team admins can update member roles" },
        { status: 403 }
      );
    }

    // Get the membership to be updated
    let targetMembership;
    try {
      targetMembership = await workos.userManagement.getOrganizationMembership(membershipId);
    } catch (error: unknown) {
      console.error('Failed to fetch target membership:', error);
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }
    
    if (targetMembership.organizationId !== teamId) {
      return NextResponse.json(
        { error: "Member not found in this organization" },
        { status: 404 }
      );
    }

    // Prevent changing own role
    if (targetMembership.userId === user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // Check if role change is necessary
    if (targetMembership.role?.slug === role) {
      return NextResponse.json(
        { error: "Member already has the specified role" },
        { status: 400 }
      );
    }

    // Prevent removing the last admin
    if (targetMembership.role?.slug === 'admin' && role === 'member') {
      const adminCount = memberships.data.filter(m => m.role?.slug === 'admin').length;
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last admin from the team" },
          { status: 400 }
        );
      }
    }

    // Update membership role
    let updatedMembership;
    try {
      updatedMembership = await workos.userManagement.updateOrganizationMembership(
        membershipId,
        { roleSlug: role }
      );
    } catch (error: unknown) {
      console.error('Failed to update member role:', error);
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { error: "Member not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to update member role" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Member role updated successfully",
      membership: {
        id: updatedMembership.id,
        userId: updatedMembership.userId,
        organizationId: updatedMembership.organizationId,
        role: updatedMembership.role,
        status: updatedMembership.status,
        createdAt: updatedMembership.createdAt,
        updatedAt: updatedMembership.updatedAt,
      },
    });

  } catch (error) {
    console.error("Failed to update member role:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
});

// Bulk member operations
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

    // Validate UUID format for team ID
    if (!validateTeamId(teamId)) {
      return NextResponse.json(
        { error: "Invalid team ID format" },
        { status: 400 }
      );
    }

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
    const validationResult = bulkMemberActionSchema.safeParse(body);
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

    const { action, membershipIds, role } = validationResult.data;

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this organization" },
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
        { error: "Only team admins can perform bulk operations" },
        { status: 403 }
      );
    }

    const results = [];

    if (action === 'remove') {
      // Remove multiple members
      for (const membershipId of membershipIds) {
        try {
          // Get the membership to verify it belongs to this organization
          const targetMembership = await workos.userManagement.getOrganizationMembership(membershipId);
          
          if (targetMembership.organizationId !== teamId) {
            results.push({ 
              membershipId, 
              error: "Member not found in this team",
              success: false 
            });
            continue;
          }

          // Prevent removing self
          if (targetMembership.userId === user.id) {
            results.push({ 
              membershipId, 
              error: "Cannot remove yourself",
              success: false 
            });
            continue;
          }

          // Prevent removing the last admin
          if (targetMembership.role?.slug === 'admin') {
            const adminCount = memberships.data.filter(m => m.role?.slug === 'admin').length;
            if (adminCount <= 1) {
              results.push({ 
                membershipId, 
                error: "Cannot remove the last admin",
                success: false 
              });
              continue;
            }
          }

          // Remove the membership
          await workos.userManagement.deleteOrganizationMembership(membershipId);
          results.push({ 
            membershipId, 
            success: true,
            message: "Member removed successfully"
          });
        } catch (error) {
          console.error(`Failed to remove member ${membershipId}:`, error);
          results.push({ 
            membershipId, 
            error: "Failed to remove member",
            success: false 
          });
        }
      }
    } else if (action === 'update_role') {
      // Update role for multiple members
      if (!role) {
        return NextResponse.json(
          { error: "Role is required for update_role action" },
          { status: 400 }
        );
      }

      for (const membershipId of membershipIds) {
        try {
          // Get the membership to verify it belongs to this organization
          const targetMembership = await workos.userManagement.getOrganizationMembership(membershipId);
          
          if (targetMembership.organizationId !== teamId) {
            results.push({ 
              membershipId, 
              error: "Member not found in this team",
              success: false 
            });
            continue;
          }

          // Prevent changing own role
          if (targetMembership.userId === user.id) {
            results.push({ 
              membershipId, 
              error: "Cannot change your own role",
              success: false 
            });
            continue;
          }

          // Check if role change is necessary
          if (targetMembership.role?.slug === role) {
            results.push({ 
              membershipId, 
              error: "Member already has the specified role",
              success: false 
            });
            continue;
          }

          // Update membership role
          await workos.userManagement.updateOrganizationMembership(
            membershipId,
            { roleSlug: role }
          );
          results.push({ 
            membershipId, 
            success: true,
            message: "Member role updated successfully"
          });
        } catch (error) {
          console.error(`Failed to update member role ${membershipId}:`, error);
          results.push({ 
            membershipId, 
            error: "Failed to update member role",
            success: false 
          });
        }
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported bulk action" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bulk operation completed",
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    });

  } catch (error) {
    console.error("Failed to perform bulk operation:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
});