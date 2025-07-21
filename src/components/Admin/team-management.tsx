// src/components/Admin/team-management.tsx

"use client"

import * as React from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Mail, UserX, Crown, User, Settings, Globe, Shield, Trash2, Building, Check, X, AlertTriangle, MoreHorizontal, Search, Loader2, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Organization, Invitation, RoleResponse } from "@workos-inc/node";

import { TEAM_COLORS } from "@/lib/teams";
import { handleFetchResponse, handleClientError } from "@/lib/error-handler";
import { csrfPut, csrfDelete } from "@/lib/csrf-fetch";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// Enhanced member interface with user details
interface EnhancedMember {
  id: string;
  userId: string;
  organizationId: string;
  role: RoleResponse;
  status: string;
  createdAt: string;
  updatedAt: string;
  isCurrentUser: boolean;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
  } | null;
}

// Enhanced form schemas with better validation
const generalSettingsSchema = z.object({
  name: z.string()
    .min(1, "Team name is required")
    .max(50, "Team name must be less than 50 characters")
    .regex(/^[a-zA-Z0-9\s\-_']+$/, "Team name can only contain letters, numbers, spaces, hyphens, underscores, and apostrophes"),
  description: z.string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
  color: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format")
    .min(1, "Please select a team color"),
})

const domainSchema = z.object({
  domain: z.string()
    .min(1, "Domain is required")
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, "Invalid domain format"),
})

const inviteSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  role: z.enum(["admin", "member"], {
    required_error: "Please select a role",
  }),
})

interface TeamManagementProps {
  organization: Organization
  members: EnhancedMember[]
  invitations: Invitation[]
  currentUserId: string
}

export function TeamManagement({ organization, members, invitations, currentUserId }: TeamManagementProps) {

  const router = useRouter();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isInviting, setIsInviting] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [domainInput, setDomainInput] = React.useState("");
  const [memberSearch, setMemberSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("general");
  const [isAddingDomain, setIsAddingDomain] = React.useState(false);

  // Check if this is a personal team
  const isPersonalTeam = organization.metadata?.personal === "true";

  // Form for general settings
  const generalForm = useForm<z.infer<typeof generalSettingsSchema>>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      name: organization.name,
      description: organization.metadata?.description || "",
      color: organization.metadata?.colour || TEAM_COLORS[0].value,
    },
  });

  // Form for invitations
  const inviteForm = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  const currentUserMembership = members.find(member => member.userId === currentUserId);
  const isCurrentUserAdmin = currentUserMembership?.role?.slug === 'admin';

  // Centralized error handling function
  const handleApiError = (error: unknown, defaultMessage: string) => {
    const appError = handleClientError(error, {
      fallbackMessage: defaultMessage,
      showToast: false, // We'll handle toast display manually
      onError: (err) => {
        console.error(`${defaultMessage}:`, err);
      }
    });
    
    // Display error message via toast
    if (appError.context?.details) {
      // Show field-specific validation errors
      appError.context.details.forEach((detail: { field: string; message: string }) => {
        toast.error(`${detail.field}: ${detail.message}`);
      });
    } else {
      toast.error(appError.message);
    }
  };

  // Helper function to get user display name
  const getUserDisplayName = (member: EnhancedMember) => {
    if (!member.user) {
      return member.userId; // Fallback to userId if user data not available
    }
    
    const { firstName, lastName, email } = member.user;
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else {
      return email; // Fallback to email
    }
  };

  // Helper function to get user initials for avatar
  const getUserInitials = (member: EnhancedMember) => {
    if (!member.user) {
      return member.userId.substring(0, 2).toUpperCase();
    }
    
    const { firstName, lastName, email } = member.user;
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    } else if (lastName) {
      return lastName.substring(0, 2).toUpperCase();
    } else {
      return email.substring(0, 2).toUpperCase();
    }
  };

  const handleUpdateGeneralSettings = async (data: z.infer<typeof generalSettingsSchema>) => {
    if (!isCurrentUserAdmin) {
      toast.error("You don't have permission to update team settings");
      return;
    }

    setIsUpdating(true);
    try {
      const response = await csrfPut(`/api/teams/${organization.id}`, data);

      // Use centralized response handling
      await handleFetchResponse(response);

      // Force refresh to update sidebar and all organization data
      router.refresh();
      toast.success('Team settings updated successfully');
    } catch (error) {
      handleApiError(error, 'Failed to update team settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInviteMember = async (data: z.infer<typeof inviteSchema>) => {
    if (!isCurrentUserAdmin) {
      toast.error("You don't have permission to invite members");
      return;
    }

    // Prevent inviting members to personal teams
    if (isPersonalTeam) {
      toast.error("Cannot invite members to personal teams");
      return;
    }

    setIsInviting(true);
    
    try {
      const response = await fetch("/api/teams/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(result));
      }

      inviteForm.reset();
      setIsInviteDialogOpen(false);
      router.refresh();
      toast.success('Invitation sent successfully');
    } catch (error) {
      handleApiError(error, 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!isCurrentUserAdmin) {
      toast.error("You don't have permission to remove members");
      return;
    }

    // Prevent removing members from personal teams (except self)
    if (isPersonalTeam) {
      toast.error("Cannot remove members from personal teams");
      return;
    }

    if (!confirm('Are you sure you want to remove this member from the team?')) {
      return;
    }

    try {
      const response = await csrfDelete(`/api/teams/members/${membershipId}`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(result));
      }

      router.refresh();
      toast.success('Member removed successfully');
    } catch (error) {
      handleApiError(error, 'Failed to remove member');
    }
  };

  const handleAddDomain = async () => {
    if (!isCurrentUserAdmin) {
      toast.error("You don't have permission to manage domains");
      return;
    }

    // Prevent adding domains to personal teams
    if (isPersonalTeam) {
      toast.error("Cannot add domains to personal teams");
      return;
    }

    if (!domainInput.trim()) {
      toast.error("Please enter a domain");
      return;
    }
    
    const domain = domainInput.trim().toLowerCase()
    
    // Client-side validation
    const validation = domainSchema.safeParse({ domain });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Check if domain already exists
    const existingDomain = organization.domains?.find(d => d.domain === domain);
    if (existingDomain) {
      toast.error("Domain already exists");
      return;
    }

    setIsAddingDomain(true);

    try {
      const response = await fetch(`/api/teams/${organization.id}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(result));
      }

      setDomainInput("");
      router.refresh();
      toast.success(`Domain ${domain} added successfully`);
    } catch (error) {
      handleApiError(error, 'Failed to add domain');
    } finally {
      setIsAddingDomain(false);
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    if (!isCurrentUserAdmin) {
      toast.error("You don't have permission to manage domains");
      return;
    }

    // Prevent removing domains from personal teams
    if (isPersonalTeam) {
      toast.error("Cannot manage domains on personal teams");
      return;
    }

    if (!confirm('Are you sure you want to remove this domain?')) {
      return;
    }
    
    try {
      const response = await csrfDelete(`/api/teams/${organization.id}/domains/${domainId}`);

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(JSON.stringify(result));
      }

      router.refresh();
      toast.success('Domain removed successfully');
    } catch (error) {
      handleApiError(error, 'Failed to remove domain');
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!isCurrentUserAdmin) {
      toast.error("You don't have permission to manage invitations");
      return;
    }

    if (!confirm('Are you sure you want to revoke this invitation?')) {
      return;
    }

    try {
      const response = await csrfDelete(`/api/teams/${organization.id}/invitations/${invitationId}`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(result));
      }

      router.refresh();
      toast.success('Invitation revoked successfully');
    } catch (error) {
      handleApiError(error, 'Failed to revoke invitation');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!isCurrentUserAdmin) {
      toast.error("You don't have permission to manage invitations");
      return;
    }

    try {
      const response = await fetch(`/api/teams/${organization.id}/invitations/${invitationId}`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(result))
      }

      router.refresh();
      toast.success('Invitation sent successfully');
    } catch (error) {
      handleApiError(error, 'Failed to resend invitation');
    }
  };

  const handleDeleteTeam = async () => {
    if (!isCurrentUserAdmin) {
      toast.error("You don't have permission to delete this team");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${organization.name}? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true);
    try {
      const response = await csrfDelete(`/api/teams/${organization.id}`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(result));
      }

      toast.success('Team deleted successfully');
      router.push('/admin/teams');
    } catch (error) {
      handleApiError(error, 'Failed to delete team');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'redorange';
      case 'member':
        return 'yellow';
      default:
        return 'outline';
    }
  };

  const filteredMembers = members.filter(member => {
    if (!memberSearch) return true;
    
    const searchLower = memberSearch.toLowerCase();
    const displayName = getUserDisplayName(member).toLowerCase();
    const email = member.user?.email?.toLowerCase() || '';
    const userId = member.userId.toLowerCase();
    
    return displayName.includes(searchLower) || 
           email.includes(searchLower) || 
           userId.includes(searchLower);
  });

  const selectedColorInfo = TEAM_COLORS.find(color => color.value === generalForm.watch("color"));

  // Determine which tabs to show based on team type
  const availableTabs = [
    { id: "general", label: "General", icon: Settings },
    // Only show domains tab for non-personal teams
    ...(!isPersonalTeam ? [{ id: "domains", label: "Domains", icon: Globe }] : []),
    { id: "members", label: "Members", icon: User },
    { id: "security", label: "Security", icon: Shield },
  ];

  // Reset active tab if current tab is not available for personal teams
  React.useEffect(() => {
    if (isPersonalTeam && activeTab === "domains") {
      setActiveTab("general");
    }
  }, [isPersonalTeam, activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-sm ring-1 ring-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg"
                style={{ backgroundColor: organization.metadata?.colour || '#ff5c4d' }}
              >
                {isPersonalTeam ? <User className="h-6 w-6" /> : <Building className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">{organization.name}</CardTitle>
                  {isPersonalTeam && (
                    <Badge variant="outline" className="text-xs">
                      Personal
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-base">
                  {isPersonalTeam 
                    ? 'Your personal workspace for private projects and settings'
                    : organization.metadata?.description || 'Manage your team settings, members, and permissions'
                  }
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {isPersonalTeam ? "Personal" : "Team"}
              </Badge>
              <Badge variant="secondary">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Personal Team Notice */}
      {isPersonalTeam && (
        <Alert className="border-chartreuse  bg-chartreuse/10 dark:border-chartreuse-800 dark:bg-chartreuse-950/50">
          <Info className="h-4 w-4 text-muted-foreground" />
          <AlertTitle className="text-muted-foreground">Personal Team</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            This is your personal workspace. You cannot invite other members or configure domains for automatic access.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${availableTabs.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-redorange to-redorange/70 flex items-center justify-center">
                  <Settings className="h-4 w-4 text-white" />
                </div>
                General Settings
              </CardTitle>
              <CardDescription>
                Update your team&apos;s basic information and appearance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...generalForm}>
                <form onSubmit={generalForm.handleSubmit(handleUpdateGeneralSettings)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={generalForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter team name" 
                              {...field}
                              disabled={isUpdating || !isCurrentUserAdmin}
                            />
                          </FormControl>
                          <FormDescription>
                            This is your team&apos;s display name
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Brief description of your team" 
                              {...field}
                              disabled={isUpdating || !isCurrentUserAdmin}
                              rows={3}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional description for your team
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={generalForm.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Color</FormLabel>
                        <FormControl>
                          <div className="my-4 space-y-4">
                            <div className="grid grid-cols-8 gap-4">
                              {TEAM_COLORS.map((color) => (
                                <Button
                                  key={color.value}
                                  type="button"
                                  className={`
                                    relative w-10 h-10 rounded-lg border-2 transition-all duration-200 mx-auto
                                    ${field.value === color.value 
                                      ? 'border-foreground scale-110 shadow-lg ring-2 ring-offset-2 ring-foreground/20' 
                                      : 'border-transparent hover:border-muted-foreground/50 hover:scale-105'
                                    }
                                  `}
                                  style={{ backgroundColor: color.value }}
                                  onClick={() => field.onChange(color.value)}
                                  disabled={isUpdating || !isCurrentUserAdmin}
                                  title={color.name}
                                >
                                  {field.value === color.value && (
                                    <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                                  )}
                                </Button>
                              ))}
                            </div>
                            {selectedColorInfo && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div 
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: selectedColorInfo.value }}
                                />
                                Selected: {selectedColorInfo.name}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                            Choose a color for your team&apos;s icon
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isCurrentUserAdmin && (
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={isUpdating || !generalForm.formState.isValid}
                        className="bg-gradient-to-r from-redorange to-redorange/70 hover:from-redorange/80 hover:to-redorange/80"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          "Update Settings"
                        )}
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domains Tab - Only show for non-personal teams */}
        {!isPersonalTeam && (
          <TabsContent value="domains" className="space-y-6">
            <Card className="border-0 shadow-sm ring-1 ring-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange to-orange/70 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-white" />
                  </div>
                  Domain Management
                </CardTitle>
                <CardDescription>
                  Manage email domains for automatic team access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Globe className="h-4 w-4" />
                  <AlertTitle>Auto-join Domains</AlertTitle>
                  <AlertDescription>
                    Users with email addresses from these domains will automatically be added to this team when they sign up.
                  </AlertDescription>
                </Alert>

                {isCurrentUserAdmin && (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <Input
                        placeholder="company.com"
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                        disabled={isAddingDomain}
                      />
                      <Button
                        onClick={handleAddDomain}
                        disabled={!domainInput.trim() || isAddingDomain}
                        variant="outline"
                      >
                        {isAddingDomain ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Domain
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {organization.domains && organization.domains.length > 0 ? (
                  <div className="space-y-3">
                    {organization.domains.map((domain) => (
                      <div
                        key={domain.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="font-medium">{domain.domain}</span>
                          <Badge variant="outline" className="text-xs">
                            {domain.state}
                          </Badge>
                        </div>
                        {isCurrentUserAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDomain(domain.id)}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No domains configured</p>
                    <p className="text-sm">Add domains to enable automatic team access</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow to-yellow/70 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    Team Members ({members.length})
                  </CardTitle>
                  <CardDescription>
                    {isPersonalTeam 
                      ? "Your personal workspace membership"
                      : "Manage team members and their permissions"
                    }
                  </CardDescription>
                </div>
                {isCurrentUserAdmin && !isPersonalTeam && (
                  <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-yellow to-yellow/70 hover:from-yellow/90 hover:to-yellow/70">
                        <Plus className="mr-2 h-4 w-4" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite team member</DialogTitle>
                        <DialogDescription>
                          Send an invitation to add someone to your team.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...inviteForm}>
                        <form onSubmit={inviteForm.handleSubmit(handleInviteMember)} className="space-y-4">
                          <FormField
                            control={inviteForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email address</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="Enter email address"
                                    {...field}
                                    disabled={isInviting}
                                    autoFocus
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={inviteForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange} disabled={isInviting}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end gap-2 pt-4">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setIsInviteDialogOpen(false)}
                              disabled={isInviting}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" className="bg-gradient-to-r from-yellow to-yellow/70 hover:from-yellow/90 hover:to-yellow/70" disabled={isInviting}>
                              {isInviting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                "Send Invitation"
                              )}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search - Only show for non-personal teams or if there are multiple members */}
                {(!isPersonalTeam || members.length > 1) && (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search members..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                )}

                {/* Members Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage 
                                  src={member.user?.profilePictureUrl || ""} 
                                  alt={getUserDisplayName(member)} 
                                />
                                <AvatarFallback className="text-sm font-medium">
                                  {getUserInitials(member)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <div className="font-medium text-sm">
                                  {getUserDisplayName(member)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {member.user?.email || member.userId}
                                  {member.isCurrentUser && " (You)"}
                                  {isPersonalTeam && " (Owner)"}
                                </div>
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
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  disabled={
                                    !isCurrentUserAdmin || 
                                    member.isCurrentUser || 
                                    isPersonalTeam
                                  }
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="text-destructive focus:text-destructive"
                                  disabled={
                                    !isCurrentUserAdmin || 
                                    member.isCurrentUser || 
                                    isPersonalTeam
                                  }
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Invitations - Only show for non-personal teams */}
          {!isPersonalTeam && invitations.length > 0 && (
            <Card className="border-0 shadow-sm ring-1 ring-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chartreuse to-chartreuse/70 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  Pending Invitations ({invitations.length})
                </CardTitle>
                <CardDescription>
                  Invitations that haven&apos;t been accepted yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{invitation.email}</div>
                          <div className="text-sm text-muted-foreground">
                            Sent {new Date(invitation.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Pending</Badge>
                        <Badge variant="outline">Member</Badge>
                        {isCurrentUserAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleResendInvitation(invitation.id)}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Resend Invitation
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRevokeInvitation(invitation.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Revoke Invitation
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chartreuse to-chartreuse/70 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage security and access controls for your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Team Security</AlertTitle>
                  <AlertDescription>
                    Configure security settings and access permissions for your team members.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        Require 2FA for all team members
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      Coming Soon
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Session Management</h4>
                      <p className="text-sm text-muted-foreground">
                        View and manage active sessions
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      Coming Soon
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Audit Log</h4>
                      <p className="text-sm text-muted-foreground">
                        View team activity and changes
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      Coming Soon
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone - Only show for non-personal teams */}
          {isCurrentUserAdmin && !isPersonalTeam && (
            <Card className="border-0 shadow-sm ring-1 ring-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-destructive">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Delete Team</AlertTitle>
                  <AlertDescription>
                    Once you delete this team, there is no going back. This action cannot be undone.
                  </AlertDescription>
                </Alert>
                
                <div className="flex justify-end mt-4">
                  <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Team
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Team</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. This will permanently delete the team and remove all associated data.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            This will permanently delete <strong>{organization.name}</strong> and all its data.
                          </AlertDescription>
                        </Alert>
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsDeleteDialogOpen(false)}
                            disabled={isDeleting}
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={handleDeleteTeam}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              "Delete Team"
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}