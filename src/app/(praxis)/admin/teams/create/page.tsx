// src/app/(praxis)/admin/teams/create/page.tsx

import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Building } from 'lucide-react';

import { getSession } from '@/lib/session';

import { TypographyH1 } from '@/components/ui/header-1';

import { AppHeader } from '@/components/AppHeader/app-header';
import { TeamCreationForm } from '@/components/Admin/team-creation-form';

export const metadata:Metadata = {
  title: "Create Team",
  description: "Create a new team in Praxis AI",
};

export default async function CreateTeamPage() {
  const { user } = await getSession();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <>
      <AppHeader 
        breadcrumbs={[
          { title: "Team Management", url: "/admin/teams" },
          { title: "Create Team", url: "/admin/teams/create" }
        ]} 
      />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-redorange to-yellow mb-4">
            <Building className="h-8 w-8 text-white" />
          </div>
          <div>
            <TypographyH1 text="Create New Team" />
            <p className="text-muted-foreground text-lg mt-2">
              Set up a new team and choose who can join
            </p>
          </div>
        </div>
        <TeamCreationForm />
      </div>
    </>
  );
}