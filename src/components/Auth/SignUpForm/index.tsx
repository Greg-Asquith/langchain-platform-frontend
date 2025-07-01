// src/components/SignUpForm/index.tsx

"use client";

import { useState, useEffect } from "react";

import { useSearchParams } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for OAuth errors in URL params
    const urlError = searchParams.get("error");
    if (urlError) {
      const errorMessages: Record<string, string> = {
        "oauth_failed": "OAuth authentication failed. Please try again.",
        "no_code": "OAuth authentication was cancelled.",
        "access_denied": "Access was denied. Please try again.",
      };
      setError(errorMessages[urlError] || "Authentication failed. Please try again.");
    }
  }, [searchParams]);

  const handleMagicLinkSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim()
        }),
      });

      if (res.ok) {
        setMessage("Check your email for a magic link to complete your registration.");
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = (provider: "google" | "github") => {
    const returnTo = "/"; // Redirect to home page after successful authentication
    window.location.href = `/api/auth/oauth?provider=${provider}&returnTo=${returnTo}`;
  };

  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="grid p-0 md:grid-cols-2">
        <form onSubmit={handleMagicLinkSignUp} className="p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-xl font-bold mb-2">Create your account</h1>
              <p className="text-muted-foreground text-sm text-balance">
                Join LangChain Platform today
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert variant="success">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="firstName" className="text-sm">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="text-sm"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lastName" className="text-sm">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="text-sm"
              />
            </div>

            <Button
              type="submit"
              variant="orange"
              className="w-full text-sm h-9"
              disabled={isLoading}
            >
              {isLoading ? "Sending code..." : "Sign Up With Email"}
            </Button>

            <div className="after:border-border relative text-center text-xs after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
              <span className="bg-card text-muted-foreground relative z-10 px-2">
                Or continue with
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                type="button"
                className="w-full text-xs h-8"
                onClick={() => handleOAuthSignIn("google")}
                disabled={isLoading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-3 w-3"
                >
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="currentColor"
                  />
                </svg>
                <span className="sr-only">Sign up with Google</span>
              </Button>
              <Button
                variant="outline"
                type="button"
                className="w-full text-xs h-8"
                onClick={() => handleOAuthSignIn("github")}
                disabled={isLoading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-3 w-3"
                >
                  <path
                    d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                    fill="currentColor"
                  />
                </svg>
                <span className="sr-only">Sign up with GitHub</span>
              </Button>
            </div>

            <div className="text-center text-xs">
              Already have an account?{" "}
              <a href="/sign-in" className="underline underline-offset-4">
                Sign in
              </a>
            </div>
          </div>
        </form>
        <div className="bg-muted relative hidden md:block">
          <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-redorange via-orange to-yellow dark:from-redorange dark:via-orange dark:to-chartreuse">
            <div className="absolute inset-0 bg-black/20 dark:bg-black/50" />
                      <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white space-y-3 p-6">
              <h2 className="text-2xl font-bold">LangChain Platform</h2>
              <p className="text-base opacity-90">
                The ultimate platform for building and deploying AI applications via LangChain
              </p>
              <div className="space-y-2 text-xs opacity-75">
                <p>⚒️ Build your own AI Agents</p>
                <p>🤖 Manage Ambient Agents</p>
                <p>🔎 Custom RAG server</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 