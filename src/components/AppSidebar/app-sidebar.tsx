"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/AppSidebar/nav-main"
import { NavProjects } from "@/components/AppSidebar/nav-projects"
import { NavUser } from "@/components/AppSidebar/nav-user"
import { TeamSwitcher } from "@/components/AppSidebar/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

import { User, Organization } from "@workos-inc/node";



interface AppSidebarProps {
  user: User
  organizations: Organization[]
  currentOrganizationId?: string
}

const data = {
  navMain: [
    {
      title: "AI Workflows",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Social Media Content",
          url: "#",
        },
        {
          title: "Email Manager",
          url: "#",
        }
      ],
    },
    {
      title: "Agent Builder",
      url: "#",
      icon: Bot,
      isActive: true,
      items: [
        {
          title: "Agents",
          url: "#",
        },
        {
          title: "Agent Templates",
          url: "#",
        },
        {
          title: "Tools",
          url: "#",
        },
      ],
    },
    {
      title: "Knowledge Base",
      url: "#",
      icon: BookOpen,
      isActive: true,
      items: [
        {
          title: "Collections",
          url: "#",
        },
        {
          title: "Add Collection",
          url: "#",
        },
      ],
    },
  ],
}

export function AppSidebar({ user, organizations, currentOrganizationId }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TeamSwitcher 
          organizations={organizations} 
          currentOrganizationId={currentOrganizationId}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
