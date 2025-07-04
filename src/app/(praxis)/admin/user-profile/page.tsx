// src/app/(praxis)/admin/user-profile/page.tsx

import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { UserCircle } from 'lucide-react';

import { getSession } from '@/lib/session';

import { TypographyH1 } from '@/components/ui/header-1';

import { AppHeader } from '@/components/AppHeader/app-header';
import { UserProfileManagement } from '@/components/Admin/user-profile-management';

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage your profile settings and preferences in Praxis AI",
};

export default async function UserProfilePage() {
  const { user } = await getSession();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <>
      <AppHeader 
        breadcrumbs={[
          { title: "My Profile", url: "/admin/user-profile" }
        ]} 
      />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-redorange to-yellow mb-4">
            <UserCircle className="h-8 w-8 text-white" />
          </div>
          <div>
            <TypographyH1 text="My Profile" />
            <p className="text-muted-foreground text-lg mt-2">
              Manage your account settings and preferences
            </p>
          </div>
        </div>
        <UserProfileManagement user={user} />
      </div>
    </>
  );
}