// src/components/AppSidebar/nav-user.tsx

"use client"

import { redirect } from "next/navigation";

import { ChevronsUpDown, LogOut, UserPen, UsersIcon } from "lucide-react"
import { toast } from "sonner";

import { User } from "@workos-inc/node";

import { logout } from '@/lib/logout';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"

export function NavUser({ user }: { user: User }) {
  
  const { isMobile } = useSidebar();

  const handleLogout = async () => {
    const { success, error, status } = await logout();
    if (!success) {
      // If unauthorized (401) or forbidden (403), redirect to sign-in - the user is not logged in anyway (maybe session expired)
      if (status === 401 || status === 403) {
        redirect('/sign-in');
      }
      // For other errors, show a toast notification
      toast.error('Logout failed', {
        description: error || 'An unexpected error occurred during logout',
      });
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.profilePictureUrl || ""} alt={`${user.firstName || ''} ${user.lastName || ''}`.trim()} />
                <AvatarFallback className="rounded-lg">{(user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '')}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.profilePictureUrl || ""} alt={`${user.firstName || ''} ${user.lastName || ''}`.trim()} />
                  <AvatarFallback className="rounded-lg">{(user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '')}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <a href="/admin/user-profile">
                  <UserPen />
                  My Profile
                </a>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <a href="/admin/teams">
                  <UsersIcon />
                  My Teams
                </a>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
