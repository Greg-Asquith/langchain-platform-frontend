// src/app/api/teams/switch/route.ts

import { NextRequest, NextResponse } from "next/server";

import { workos } from "@/lib/workos";


import { getSession, switchOrganization } from "@/lib/session";
import { validateTeamId } from "@/lib/teams";

export async function POST(request: NextRequest) {
  try {
    const { user, organizations } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!validateTeamId(organizationId)) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const hasAccess = organizations?.some(org => org.id === organizationId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this team" },
        { status: 403 }
      );
    }

    // Get user's role in the organization
    let userRole = 'member'; // default role
    try {
      const memberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
        organizationId: organizationId,
      });
      
      const membership = memberships.data.find(m => m.organizationId === organizationId);
      if (membership?.role?.slug) {
        userRole = membership.role.slug;
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error);
      // Continue with default role
    }

    // Switch to the organization
    const success = await switchOrganization(organizationId);
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to switch team" },
        { status: 500 }
      );
    }

    const currentOrg = organizations?.find(org => org.id === organizationId);

    return NextResponse.json({
      success: true,
      currentOrganization: currentOrg,
      userRole: userRole,
    });

  } catch (error) {
    console.error("Failed to switch team:", error);
    
    return NextResponse.json(
      { error: "Failed to switch team" },
      { status: 500 }
    );
  }
} 