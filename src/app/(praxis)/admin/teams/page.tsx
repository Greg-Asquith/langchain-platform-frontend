// src/app/(praxis)/admin/teams/page.tsx

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { workos } from '@/lib/workos';
import { TeamsList } from '@/components/Admin/team-list';
import { Organization } from '@workos-inc/node';
import { AppHeader } from '@/components/AppHeader/app-header';
import { TypographyH1 } from '@/components/ui/header-1';
import { Button } from '@/components/ui/button';
import { Building, Plus } from 'lucide-react';
import Link from 'next/link';

interface TeamWithStats extends Organization {
  memberCount: number;
  isCurrentTeam: boolean;
}

export const metadata:Metadata = {
  title: "Teams",
  description: "Manage your teams in Praxis AI",
};

export default async function TeamsListPage() {
  const { user, organizations, currentOrganizationId } = await getSession();

  if (!user) {
    redirect('/sign-in');
  }

  if (!organizations || organizations.length === 0) {
    return (
      <>
        <AppHeader breadcrumbs={[{ title: "Teams", url: "/admin/teams" }]} />
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-medium">No teams found</h2>
            <p className="text-muted-foreground mb-4">Create your first team to get started.</p>
            <Button asChild>
              <Link href="/admin/teams/create" className="bg-gradient-to-r from-redorange to-redorange/70 hover:from-redorange/80 hover:to-redorange/80">
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Get member counts for each organization
  const teamsWithStats: TeamWithStats[] = await Promise.all(
    organizations.map(async (org) => {
      let memberCount = 0;
      try {
        const memberships = await workos.userManagement.listOrganizationMemberships({
          organizationId: org.id,
          limit: 100,
        });
        memberCount = memberships.data.length;
      } catch (error) {
        console.error(`Failed to fetch member count for ${org.id}:`, error);
      }

      return {
        ...org,
        memberCount,
        isCurrentTeam: org.id === currentOrganizationId,
      };
    })
  );

  return (
    <>
      <AppHeader breadcrumbs={[{ title: "Teams", url: "/admin/teams" }]} />
      <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-redorange to-yellow mb-4">
            <Building className="h-8 w-8 text-white" />
          </div>
          <div>
            <TypographyH1 text="My Teams" />
            <p className="text-muted-foreground text-lg mt-2">
              Set up a new team and choose who can join
            </p>
          </div>
        </div>
        <TeamsList teams={teamsWithStats} />
        <div className="flex py-4 items-center justify-center">
          <Button asChild>
            <Link href="/admin/teams/create" className="bg-gradient-to-br from-redorange to-yellow hover:from-redorange/90 hover:to-yellow/90">
              <Plus className="mr-2 h-4 w-4" />
              Create New Team
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}