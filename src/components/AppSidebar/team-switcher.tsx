// src/components/AppSidebar/team-switcher.tsx

"use client"

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";

import { ChevronsUpDown, Plus, Building, User } from "lucide-react";
import { toast } from "sonner";

import { Organization } from "@workos-inc/node";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { csrfPost } from "@/lib/csrf-fetch";

interface TeamSwitcherProps {
  organizations: Organization[]
  currentOrganizationId?: string
}

export function TeamSwitcher({ organizations, currentOrganizationId }: TeamSwitcherProps) {

  const { isMobile } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();

  const currentOrg = organizations.find(org => org.id === currentOrganizationId) || organizations[0];

  const handleSwitchTeam = async (organizationId: string) => {
    // Don't switch if it's the same team
    if (organizationId === currentOrganizationId) {
      return;
    }

    try {
      const response = await csrfPost('/api/teams/switch', { organizationId })

      if (!response.ok) {
        throw new Error('Failed to switch team')
      }

      // Use window.location.href to navigate to the same page
      // This ensures a complete refresh of all components including layouts
      window.location.href = pathname;
      
    } catch (error) {
      console.error('Failed to switch team:', error)
      toast.error('Failed to switch team')
    }
  }

  const handleCreateTeam = () => {
    router.push('/admin/teams/create')
  }

  const getTeamIcon = (org: Organization) => {
    return org.metadata?.personal === "true" ? User : Building
  }

  const getTeamPlan = (org: Organization) => {
    if (org.metadata?.personal === "true") return "Personal"
    return "Team"
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div 
                className="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
                style={{ 
                  backgroundColor: currentOrg?.metadata?.colour || '#ff5c4d'
                }}
              >
                {React.createElement(getTeamIcon(currentOrg), { className: "size-4" })}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{currentOrg.name}</span>
                <span className="truncate text-xs">{getTeamPlan(currentOrg)}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-72 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Teams
            </DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitchTeam(org.id)}
                className="gap-2 p-2"
                disabled={org.id === currentOrganizationId} // Disable current org
              >
                <div className="flex size-6 items-center justify-center rounded-md border" style={{ backgroundColor: org.metadata?.colour || '#ff5c4d' }}>
                  {React.createElement(getTeamIcon(org), { className: "size-3.5 shrink-0 text-white" })}
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm">{org.name}</span>
                  <span className="text-xs text-muted-foreground">{getTeamPlan(org)}</span>
                </div>
                {org.id === currentOrganizationId && (
                  <span className="text-xs text-muted-foreground">Current</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="gap-2 p-2"
              onClick={handleCreateTeam}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Create team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}