// src/components/AppSidebar/team-switcher.tsx

"use client"

import * as React from "react";
import { useRouter } from "next/navigation";

import { ChevronsUpDown, Plus, Building, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Organization } from "@workos-inc/node";

interface TeamSwitcherProps {
  organizations: Organization[]
  currentOrganizationId?: string
}

export function TeamSwitcher({ organizations, currentOrganizationId }: TeamSwitcherProps) {

  const { isMobile } = useSidebar();
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [newTeamName, setNewTeamName] = React.useState("");

  const currentOrg = organizations.find(org => org.id === currentOrganizationId) || organizations[0];

  const handleSwitchTeam = async (organizationId: string) => {
    try {
      const response = await fetch('/api/organizations/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      })

      if (!response.ok) {
        throw new Error('Failed to switch team')
      }

      // Refresh the page to update the UI with new organization context
      router.refresh()
      toast.success('Switched team successfully')
    } catch (error) {
      console.error('Failed to switch team:', error)
      toast.error('Failed to switch team')
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newTeamName.trim()) {
      toast.error('Team name is required')
      return
    }

    setIsCreating(true)
    
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create team')
      }

      const result = await response.json()
      
      // Switch to the new team
      await handleSwitchTeam(result.organization.id)
      
      // Reset form and close dialog
      setNewTeamName("")
      setIsCreateDialogOpen(false)
      toast.success('Team created successfully')
    } catch (error) {
      console.error('Failed to create team:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create team')
    } finally {
      setIsCreating(false)
    }
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
              <div className={`bg-[${currentOrg.metadata?.colour}] text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg`}>
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
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Teams
            </DropdownMenuLabel>
            {organizations.map((org, index) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitchTeam(org.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  {React.createElement(getTeamIcon(org), { className: "size-3.5 shrink-0" })}
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm">{org.name}</span>
                  <span className="text-xs text-muted-foreground">{getTeamPlan(org)}</span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <DropdownMenuItem 
                  className="gap-2 p-2"
                  onSelect={(e) => {
                    e.preventDefault()
                    setIsCreateDialogOpen(true)
                  }}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <Plus className="size-4" />
                  </div>
                  <div className="text-muted-foreground font-medium">Create team</div>
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create a new team</DialogTitle>
                  <DialogDescription>
                    Create a new team to collaborate with others. You'll be the admin of this team.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTeam} className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="team-name">Team name</Label>
                    <Input
                      id="team-name"
                      type="text"
                      placeholder="Enter team name"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      disabled={isCreating}
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating || !newTeamName.trim()}>
                      {isCreating ? "Creating..." : "Create team"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
