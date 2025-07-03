"use client"

import * as React from "react"
import { Plus, Mail, UserX, Crown, User } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

import { Organization, OrganizationMembership, Invitation } from "@workos-inc/node"

interface TeamManagementProps {
  organization: Organization
  members: OrganizationMembership[]
  invitations: Invitation[]
  currentUserId: string
}

export function TeamManagement({ organization, members, invitations, currentUserId }: TeamManagementProps) {
  const router = useRouter()
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false)
  const [isInviting, setIsInviting] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState("member")

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inviteEmail.trim()) {
      toast.error('Email is required')
      return
    }

    setIsInviting(true)
    
    try {
      const response = await fetch('/api/organizations/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: inviteEmail.trim(),
          role: inviteRole
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send invitation')
      }

      // Reset form and close dialog
      setInviteEmail("")
      setInviteRole("member")
      setIsInviteDialogOpen(false)
      router.refresh()
      toast.success('Invitation sent successfully')
    } catch (error) {
      console.error('Failed to send invitation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (membershipId: string) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) {
      return
    }

    try {
      const response = await fetch(`/api/organizations/members/${membershipId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove member')
      }

      router.refresh()
      toast.success('Member removed successfully')
    } catch (error) {
      console.error('Failed to remove member:', error)
      toast.error('Failed to remove member')
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default'
      case 'member':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const currentUserMembership = members.find(member => member.userId === currentUserId)
  const isCurrentUserAdmin = currentUserMembership?.role?.slug === 'admin'

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {organization.name}
            {organization.name === 'Personal' && <Badge variant="outline">Personal</Badge>}
          </CardTitle>
          <CardDescription>
            Manage your team members and permissions
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Team Members ({members.length})</CardTitle>
            <CardDescription>
              People who have access to this team
            </CardDescription>
          </div>
          {isCurrentUserAdmin && (
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite team member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to add someone to your team.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInviteMember} className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="invite-email">Email address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="Enter email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={isInviting}
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole} disabled={isInviting}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsInviteDialogOpen(false)}
                      disabled={isInviting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isInviting || !inviteEmail.trim()}>
                      {isInviting ? "Sending..." : "Send Invitation"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{member.userId}</div>
                        <div className="text-sm text-muted-foreground">Member ID</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(member.role?.slug || 'member')}>
                      {member.role?.slug === 'admin' && <Crown className="mr-1 h-3 w-3" />}
                      {member.role?.slug === 'admin' ? 'Admin' : 'Member'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Active</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isCurrentUserAdmin && member.userId !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations ({invitations.length})</CardTitle>
            <CardDescription>
              Invitations that haven't been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {invitation.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        Member
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Pending</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 