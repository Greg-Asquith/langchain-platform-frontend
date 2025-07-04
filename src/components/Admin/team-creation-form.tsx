// src/components/Admin/team-creation-form.tsx

"use client"

import * as React from "react";

import { useRouter } from "next/navigation";

import { Plus, X, Building, Globe, Info, Loader2, Check } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { TEAM_COLORS } from "@/lib/teams";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "../ui/textarea";


const formSchema = z.object({
  name: z.string()
    .min(1, "Team name is required")
    .max(50, "Team name must be less than 50 characters")
    .regex(/^[a-zA-Z0-9\s\-_]+$/, "Team name can only contain letters, numbers, spaces, hyphens, and underscores"),
  description: z.string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
  color: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format")
    .min(1, "Please select a team color"),
  domains: z.array(z.string().regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, "Invalid domain format"))
    .max(10, "Maximum 10 domains allowed"),
})

type FormData = z.infer<typeof formSchema>

interface ApiError {
  error: string
  details?: Array<{
    field: string
    message: string
  }>
}

export function TeamCreationForm() {

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [domainInput, setDomainInput] = React.useState("");
  const [domainError, setDomainError] = React.useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: TEAM_COLORS[0].value,
      domains: [],
      description: "",
    },
  });

  const watchedDomains = form.watch("domains");
  const watchedColor = form.watch("color");
  const watchedName = form.watch("name"); 
  const watchedDescription = form.watch("description");

  // Enhanced error handling function
  const handleApiError = (error: unknown, defaultMessage: string) => {
    console.error(defaultMessage, error);
    
    if (error instanceof Error) {
      try {
        const apiError: ApiError = JSON.parse(error.message)
        if (apiError.details) {
          // Show field-specific validation errors
          apiError.details.forEach(detail => {
            toast.error(`${detail.field}: ${detail.message}`)
          })
        } else {
          toast.error(apiError.error || defaultMessage)
        }
      } catch {
        toast.error(error.message || defaultMessage)
      }
    } else {
      toast.error(defaultMessage)
    }
  }

  const validateDomain = (domain: string): string | null => {
    if (!domain.trim()) return "Domain is required";
    
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!domainRegex.test(domain)) return "Invalid domain format";
    
    if (watchedDomains.includes(domain.toLowerCase())) return "Domain already added";
    
    if (watchedDomains.length >= 10) return "Maximum 10 domains allowed";
    
    return null;
  }

  const handleAddDomain = () => {
    if (!domainInput.trim()) return;
    
    const domain = domainInput.trim().toLowerCase();
    const error = validateDomain(domain);
    
    if (error) {
      setDomainError(error);
      return;
    }

    form.setValue("domains", [...watchedDomains, domain]);
    setDomainInput("");
    setDomainError("");
    toast.success(`Domain ${domain} added successfully`);
  }

  const handleRemoveDomain = (domainToRemove: string) => {
    form.setValue("domains", watchedDomains.filter(domain => domain !== domainToRemove));
    setDomainError("");
    toast.success(`Domain ${domainToRemove} removed`);
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDomain();
    }
  }

  const handleDomainInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDomainInput(value);
    
    // Clear error when user starts typing
    if (domainError) {
      setDomainError("");
    }
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);  
    
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          color: data.color,
          domains: data.domains,
          description: data.description,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(result));
      }

      toast.success('Team created successfully!');
      
      // Navigate to team settings for the new team
      router.push('/admin/teams/settings');
    } catch (error) {
      handleApiError(error, 'Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedColorInfo = TEAM_COLORS.find(color => color.value === watchedColor);

  return (
    <div className="space-y-6">

      {/* Team Preview Card */}
      {watchedName && (
        <Card className="border-0 shadow-sm ring-1 ring-border bg-gradient-to-br from-background to-muted/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-lg shadow-lg"
                style={{ backgroundColor: watchedColor }}
              >
                {watchedName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <h3 className="font-semibold text-lg">{watchedName}</h3>
                <p className="text-sm text-muted-foreground">{watchedDescription}</p>
                <p className="text-sm text-muted-foreground">
                  {watchedDomains.length > 0 
                    ? `${watchedDomains.length} domain${watchedDomains.length !== 1 ? 's' : ''} configured`
                    : 'No domains configured'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Team Basic Info */}
          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow to-yellow/70 flex items-center justify-center">
                  <Building className="h-4 w-4 text-white" />
                </div>
                Basic Info
              </CardTitle>
              <CardDescription className="text-base">
                Choose a name and color for your team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-sm font-medium">Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter team name" 
                        {...field}
                        disabled={isSubmitting}
                        className="h-12 text-base"
                      />
                    </FormControl>
                    <FormDescription className="text-sm">
                      This will be the display name for your team across Praxis AI. Only letters, numbers, spaces, hyphens, and underscores are allowed.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-sm font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter team description"
                        {...field}
                        disabled={isSubmitting}
                        className="h-12 text-base"
                      />
                      </FormControl>
                      <FormDescription className="text-sm">
                        This will be the description for your team across Praxis AI. Only letters, numbers, spaces, hyphens, and underscores are allowed.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="flex items-center gap-3 text-sm font-medium">
                      Team Color
                    </FormLabel>
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
                              disabled={isSubmitting}
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
                    <FormDescription className="text-sm">
                      Choose a color for your team's icon and branding
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Domain Management */}
          <Card className="border-0 shadow-sm ring-1 ring-border">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange to-orange/70 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-white" />
                </div>
                Domain-Based Access
              </CardTitle>
              <CardDescription className="text-base">
                Automatically add users to this team when they sign up with specific email domains
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  Users with email addresses from these domains will automatically be added to this team when they sign up. You can add up to 10 domains.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Label htmlFor="domain-input" className="text-sm font-medium">Add Domain</Label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Input
                      id="domain-input"
                      placeholder="company.com"
                      value={domainInput}
                      onChange={handleDomainInputChange}
                      onKeyPress={handleKeyPress}
                      disabled={isSubmitting}
                      className={`h-12 text-base pl-4 ${domainError ? 'border-destructive' : ''}`}
                    />
                    {domainError && (
                      <p className="text-sm text-destructive mt-1">{domainError}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddDomain}
                    disabled={isSubmitting || !domainInput.trim() || watchedDomains.length >= 10}
                    className="h-12 px-6"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter a domain name (e.g., company.com) and press Enter or click Add. 
                  {watchedDomains.length >= 10 && (
                    <span className="text-destructive ml-1">Maximum 10 domains allowed.</span>
                  )}
                </p>
              </div>

              {watchedDomains.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Configured Domains</Label>
                    <Badge variant="secondary" className="text-xs">
                      {watchedDomains.length}/10 domain{watchedDomains.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="grid gap-2">
                    {watchedDomains.map((domain, index) => (
                      <div
                        key={domain}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border transition-colors hover:bg-muted/70"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="font-medium">{domain}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDomain(domain)}
                          disabled={isSubmitting}
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Actions */}
          <Card className="border-0 shadow-sm ring-1 ring-border bg-muted/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:justify-end">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                  className="h-12 px-8"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !watchedName || !form.formState.isValid}
                  className="h-12 px-8 bg-gradient-to-r from-redorange to-redorange/70 hover:from-redorange/90 hover:to-redorange/70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Team...
                    </>
                  ) : (
                    <>
                      <Building className="h-4 w-4 mr-2" />
                      Create Team
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}