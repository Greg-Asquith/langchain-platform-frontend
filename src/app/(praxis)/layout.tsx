// app/(praxis)/layout.tsx

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/session';

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/AppSidebar/app-sidebar";

export default async function PraxisLayout({ children }: { children: React.ReactNode }) {

  const { user } = await getSession();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        {children}
      </SidebarInset> 
    </SidebarProvider>
  );
}