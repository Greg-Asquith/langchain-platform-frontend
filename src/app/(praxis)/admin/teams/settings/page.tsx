// src/app/(praxis)/admin/teams/settings/page.tsx

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { workos } from '@/lib/workos';
import { TeamManagement } from '@/components/Admin/team-management';
import { Invitation, RoleResponse } from '@workos-inc/node';
import { AppHeader } from '@/components/AppHeader/app-header';
import { TypographyH1 } from '@/components/ui/header-1';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Settings } from 'lucide-react';
import Link from 'next/link';

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

export const metadata: Metadata = {
  title: "Team Settings",
  description: "Manage the settings for your team in Praxis AI",
};

export default async function TeamSettingsPage() {
  const { user, currentOrganizationId } = await getSession();

  if (!user) {
    redirect('/sign-in');
  }

  if (!currentOrganizationId) {
    return (
      <>
        <AppHeader breadcrumbs={[
          { title: "Teams", url: "/admin/teams" },
          { title: "Settings", url: "/admin/teams/settings" }
        ]} />
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-medium">No team selected</h2>
            <p className="text-muted-foreground mb-4">Select a team to manage its settings.</p>
            <Button asChild>
              <Link href="/admin/teams">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Teams
              </Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Get organization details
  let organization;
  try {
    organization = await workos.organizations.getOrganization(currentOrganizationId);
  } catch (error) {
    console.error('Failed to fetch organization:', error);
    redirect('/admin/teams');
  }

  // Check if user has access to this organization
  let userMemberships;
  try {
    userMemberships = await workos.userManagement.listOrganizationMemberships({
      userId: user.id,
      organizationId: currentOrganizationId,
    });
  } catch (error) {
    console.error('Failed to fetch user memberships:', error);
    redirect('/admin/teams');
  }

  const hasAccess = userMemberships.data.some(m => m.organizationId === currentOrganizationId);
  if (!hasAccess) {
    redirect('/admin/teams');
  }

  // Get enhanced organization members with user details
  let members: EnhancedMember[] = [];
  try {
    const memberships = await workos.userManagement.listOrganizationMemberships({
      organizationId: currentOrganizationId,
      limit: 100,
    });

    // Fetch user details for each member
    members = await Promise.all(
      memberships.data.map(async (member) => {
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
  } catch (error) {
    console.error('Failed to fetch organization members:', error);
    members = [];
  }

  // Get pending invitations (only for non-personal teams)
  let invitations: Invitation[] = [];
  const isPersonalTeam = organization.metadata?.personal === "true";
  
  if (!isPersonalTeam) {
    try {
      const invitationResponse = await workos.userManagement.listInvitations({
        organizationId: currentOrganizationId,
        limit: 100,
      });
      invitations = invitationResponse.data;
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      invitations = [];
    }
  }

  return (
    <>
      <AppHeader breadcrumbs={[
        { title: "Teams", url: "/admin/teams" },
        { title: "Settings", url: "/admin/teams/settings" }
      ]} />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="text-center space-y-4">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" 
            style={{ backgroundColor: organization.metadata?.colour || '#ff5c4d' }}
          >
            <Settings className="h-8 w-8 text-white" />
          </div>
          <div>
            <TypographyH1 text={`${organization.name} Settings`} />
            <p className="text-muted-foreground text-lg mt-2">
              {isPersonalTeam 
                ? "Manage your personal workspace settings and preferences"
                : "Manage team members, permissions, and settings"
              }
            </p>
          </div>
        </div>
    
        <TeamManagement 
          key={organization.id} // Force re-mount when organization changes
          organization={organization}
          members={members}
          invitations={invitations}
          currentUserId={user.id}
        />
        
        <div className="flex py-4 items-center justify-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/admin/teams">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teams
            </Link>
          </Button>
          {!isPersonalTeam && (
            <Button asChild>
              <Link href="/admin/teams/create" className="bg-gradient-to-br from-redorange to-yellow hover:from-redorange/90 hover:to-yellow/90">
                <Plus className="mr-2 h-4 w-4" />
                Create New Team
              </Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}