// src/app/api/teams/[id]/members/route.ts

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { RoleResponse } from "@workos-inc/node";

import { withCSRFProtection } from "@/lib/csrf";
import { handleApiError, createAuthenticationError, createAuthorizationError, createValidationError, createNotFoundError, createInternalError } from "@/lib/error-handler";
import { logError } from "@/lib/logger";
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
      return handleApiError(createAuthorizationError("Access denied to this team"));
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
      await logError(
        'Failed to fetch team members',
        { component: 'GET /api/teams/[id]/members' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to fetch team members", error as Error));
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
          await logError(
            `Failed to fetch user details for ${member.userId}`,
            { component: 'GET /api/teams/[id]/members' },
            error as Error
          );
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
      await logError(
        'Failed to fetch invitations',
        { component: 'GET /api/teams/[id]/members' },
        error as Error
      );
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
    await logError(
      'Failed to get team members',
      { component: 'GET /api/teams/[id]/members' },
      error as Error
    );
    
    return handleApiError(error);
  }
}

// Update member role
export const PUT = withCSRFProtection(async (request: NextRequest, ...args: unknown[]) => {
  const { params } = args[0] as { params: Promise<{ id: string }> };

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

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error: unknown) {
      await logError(
        'Error parsing JSON in request body',
        { component: 'PUT /api/teams/[id]/members' },
        error as Error
      );
      return handleApiError(createValidationError("Invalid JSON in request body"));
    }

    // Validate input data
    const validationResult = updateMemberRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(createValidationError(
        "Invalid input data",
        { details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })) }
      ));
    }

    const { membershipId, role } = validationResult.data;

    // Check if user has access to this organization
    const hasAccess = organizations?.some(org => org.id === teamId);
    if (!hasAccess) {
      return handleApiError(createAuthorizationError("Access denied to this organization"));
    }

    // Check if user is admin of the organization
    let memberships;
    try {
      memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: teamId,
      });
    } catch (error: unknown) {
      await logError(
        'Failed to fetch team memberships',
        { component: 'PUT /api/teams/[id]/members' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to verify permissions", error as Error));
    }

    const membership = memberships.data.find(m => m.organizationId === teamId);
    if (!membership || membership.role?.slug !== 'admin') {
      return handleApiError(createAuthorizationError("Only team admins can update member roles"));
    }

    // Get the membership to be updated
    let targetMembership;
    try {
      targetMembership = await workos.userManagement.getOrganizationMembership(membershipId);
    } catch (error: unknown) {
      await logError(
        'Failed to fetch target membership',
        { component: 'PUT /api/teams/[id]/members' },
        error as Error
      );
      return handleApiError(createNotFoundError("Member not found"));
    }
    
    if (targetMembership.organizationId !== teamId) {
      return handleApiError(createNotFoundError("Member not found in this organization"));
    }

    // Prevent changing own role
    if (targetMembership.userId === user.id) {
      return handleApiError(createValidationError("You cannot change your own role"));
    }

    // Check if role change is necessary
    if (targetMembership.role?.slug === role) {
      return handleApiError(createValidationError("Member already has the specified role"));
    }

    // Prevent removing the last admin
    if (targetMembership.role?.slug === 'admin' && role === 'member') {
      const adminCount = memberships.data.filter(m => m.role?.slug === 'admin').length;
      if (adminCount <= 1) {
        return handleApiError(createValidationError("Cannot remove the last admin from the team"));
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
      await logError(
        'Failed to update member role',
        { component: 'PUT /api/teams/[id]/members' },
        error as Error
      );
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message.includes('not found')) {
        return handleApiError(createNotFoundError("Member not found"));
      }
      
      return handleApiError(createInternalError("Failed to update member role", error as Error));
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
    await logError(
      'Failed to update member role',
      { component: 'PUT /api/teams/[id]/members' },
      error as Error
    );
    
    return handleApiError(error);
  }
});

// Bulk member operations
export const POST = withCSRFProtection(async (request: NextRequest, ...args: unknown[]) => {
  const { params } = args[0] as { params: Promise<{ id: string }> };

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

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error: unknown) {
      await logError(
        'Error parsing JSON in request body',
        { component: 'POST /api/teams/[id]/members' },
        error as Error
      );
      return handleApiError(createValidationError("Invalid JSON in request body"));
    }

    // Validate input data
    const validationResult = bulkMemberActionSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(createValidationError(
        "Invalid input data",
        { details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })) }
      ));
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
      await logError(
        'Failed to fetch team memberships',
        { component: 'POST /api/teams/[id]/members' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to verify permissions", error as Error));
    }

    const membership = memberships.data.find(m => m.organizationId === teamId);
    if (!membership || membership.role?.slug !== 'admin') {
      return handleApiError(createAuthorizationError("Only team admins can perform bulk operations"));
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
          await logError(
            `Failed to remove member ${membershipId}`,
            { component: 'POST /api/teams/[id]/members', metadata: { membershipId } },
            error as Error
          );
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
        return handleApiError(createValidationError("Role is required for update_role action"));
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
          await logError(
            `Failed to update member role ${membershipId}`,
            { component: 'POST /api/teams/[id]/members', metadata: { membershipId } },
            error as Error
          );
          results.push({ 
            membershipId, 
            error: "Failed to update member role",
            success: false 
          });
        }
      }
    } else {
      return handleApiError(createValidationError("Unsupported bulk action"));
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
    await logError(
      'Failed to perform bulk operation',
      { component: 'POST /api/teams/[id]/members' },
      error as Error
    );
    
    return handleApiError(error);
  }
});