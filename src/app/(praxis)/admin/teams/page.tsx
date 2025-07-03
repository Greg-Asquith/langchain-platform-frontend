import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { workos } from '@/lib/workos';
import { TeamManagement } from '@/components/Admin/team-management';
import { Organization, OrganizationMembership, Invitation } from '@workos-inc/node';
import AppHeader from '@/components/AppHeader/app-header';
import { TypographyH1 } from '@/components/ui/header-1';

export default async function TeamsPage() {
  const { user, currentOrganizationId } = await getSession();

  if (!user) {
    redirect('/sign-in');
  }

  if (!currentOrganizationId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">No team selected</h2>
          <p className="text-muted-foreground">Select a team from the sidebar to manage members.</p>
        </div>
      </div>
    );
  }

  // Get organization details
  let organization;
  try {
    organization = await workos.organizations.getOrganization(currentOrganizationId);
  } catch (error) {
    console.error('Failed to fetch organization:', error);
    redirect('/');
  }

  // Get organization members
  let members: OrganizationMembership[] = [];
  try {
    const memberships = await workos.userManagement.listOrganizationMemberships({
      organizationId: currentOrganizationId,
      limit: 100,
    });
    members = memberships.data;
  } catch (error) {
    console.error('Failed to fetch organization members:', error);
    members = [];
  }

  // Get pending invitations
  let invitations: Invitation[] = [];
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

  return (
    <>
      <AppHeader breadcrumbs={[{ title: "Team Management", url: "/admin/teams" }]} />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TypographyH1 text="Team Management" />
    
        <TeamManagement 
          organization={organization}
          members={members}
          invitations={invitations}
          currentUserId={user.id}
        />
      </div>
    </>
  );
} 