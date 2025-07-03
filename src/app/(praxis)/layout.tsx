// app/(praxis)/layout.tsx

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/AppSidebar/app-sidebar";

export default function PraxisLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset> 
    </SidebarProvider>
  );
}