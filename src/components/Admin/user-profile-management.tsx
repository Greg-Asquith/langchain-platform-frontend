// src/components/Admin/user-profile-management.tsx

"use client"

import * as React from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, User, Shield, CheckCircle, XCircle, Calendar, Mail, Loader2, Upload, Trash2, ExternalLink, Info, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { User as WorkOSUser } from "@workos-inc/node";
import { useSession } from '@/lib/use-session';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Form schemas
const profileUpdateSchema = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "First name can only contain letters, spaces, hyphens, and apostrophes"),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "Last name can only contain letters, spaces, hyphens, and apostrophes"),
});

const pictureUrlSchema = z.object({
  imageUrl: z.string()
    .url("Please enter a valid URL")
    .min(1, "Image URL is required"),
});

interface UserProfileManagementProps {
  user: WorkOSUser;
}

interface ApiError {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export function UserProfileManagement({ user: initialUser }: UserProfileManagementProps) {
  const router = useRouter();
  const { refreshSession } = useSession();
  const [user, setUser] = React.useState<WorkOSUser>(initialUser);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("general");

  // Form for profile updates
  const profileForm = useForm<z.infer<typeof profileUpdateSchema>>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
    },
  });

  // Enhanced error handling function
  const handleApiError = (error: unknown, defaultMessage: string) => {
    console.error(defaultMessage, error);
    
    if (error instanceof Error) {
      try {
        const apiError: ApiError = JSON.parse(error.message);
        if (apiError.details) {
          apiError.details.forEach(detail => {
            toast.error(`${detail.field}: ${detail.message}`);
          });
        } else {
          toast.error(apiError.error || defaultMessage);
        }
      } catch {
        toast.error(error.message || defaultMessage);
      }
    } else {
      toast.error(defaultMessage);
    }
  };

  // Refresh user data
  const refreshUserData = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        profileForm.reset({
          firstName: data.user.firstName || "",
          lastName: data.user.lastName || "",
        });
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const handleUpdateProfile = async (data: z.infer<typeof profileUpdateSchema>) => {
    setIsUpdating(true);
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(result));
      }

      setUser(result.user);
      
      // Refresh the session to update the UI with new user data
      await refreshSession();
      
      // Also refresh the router to update any server-side rendered components
      router.refresh();
      
      toast.success('Profile updated successfully');
    } catch (error) {
      handleApiError(error, 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const getUserInitials = () => {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    } else if (lastName) {
      return lastName.substring(0, 2).toUpperCase();
    } else {
      return user.email.substring(0, 2).toUpperCase();
    }
  };

  const getUserDisplayName = () => {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else {
      return user.email;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-sm ring-1 ring-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.profilePictureUrl || ""} alt={getUserDisplayName()} />
                <AvatarFallback className="text-lg font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{getUserDisplayName()}</CardTitle>
                <CardDescription className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                  {user.emailVerified ? (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <XCircle className="h-3 w-3 mr-1" />
                      Unverified
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <Calendar className="h-3 w-3 mr-1" />
                Joined {new Date(user.createdAt).toLocaleDateString('en-GB', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">

          {/* Basic Info Section */}
          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-redorange to-redorange/70 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                Basic Information
              </CardTitle>
              <CardDescription>
                Update your name and basic profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(handleUpdateProfile)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your first name" 
                              {...field}
                              disabled={isUpdating}
                            />
                          </FormControl>
                          <FormDescription>
                            Your first name as it appears on your profile
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your last name" 
                              {...field}
                              disabled={isUpdating}
                            />
                          </FormControl>
                          <FormDescription>
                            Your last name as it appears on your profile
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isUpdating || !profileForm.formState.isValid}
                      className="bg-gradient-to-r from-redorange to-redorange/70 hover:from-redorange/80 hover:to-redorange/80"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Profile"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange to-orange/70 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                Account Information
              </CardTitle>
              <CardDescription>
                View your account details and verification status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Email Address</h4>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.emailVerified ? (
                      <Badge variant="secondary">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <XCircle className="h-3 w-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Account Created</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Last Updated</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(user.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">User ID</h4>
                    <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(user.id);
                      toast.success('User ID copied to clipboard');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow to-yellow/70 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and authentication preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Account Security</AlertTitle>
                  <AlertDescription>
                    Your account uses WorkOS authentication for enhanced security.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4">

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Session Management</h4>
                      <p className="text-sm text-muted-foreground">
                        Automatic session refresh and activity tracking
                      </p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        Enhanced security for your account
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      Coming Soon
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Active Sessions</h4>
                      <p className="text-sm text-muted-foreground">
                        View and manage your active sessions
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

          {/* Privacy Notice */}
          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-chartreuse to-chartreuse/70 flex items-center justify-center">
                  <Info className="h-4 w-4 text-white" />
                </div>
                Privacy & Data
              </CardTitle>
              <CardDescription>
                Information about your data and privacy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Your personal information is stored securely and processed in accordance with our Privacy Policy and Terms of Service.
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-4">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/privacy-policy" target="_blank" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Privacy Policy
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/terms-of-service" target="_blank" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Terms of Service
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}