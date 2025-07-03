// src/components/Auth/VerifyCode/index.tsx

"use client";

import { useState, useEffect } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VerifyCodeForm() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    } else {
      // If no email provided, redirect back to sign-in
      router.push("/sign-in");
    }
  }, [searchParams, router]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Authentication successful! Redirecting...");
        // Redirect to home page or dashboard
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        setError(data.error || "Invalid verification code");
        console.error(data);
      }
    } catch (error) {
      setError("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("New verification code sent to your email");
      } else {
        setError(data.error || "Failed to resend verification code");
      }
    } catch (error) {
      setError("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    router.push("/sign-in");
  };

  if (!email) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="grid p-0 md:grid-cols-2">
        <form onSubmit={handleVerifyCode} className="p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-xl font-bold mb-2">Verify Your Email</h1>
              <p className="text-muted-foreground text-sm text-balance">
                We&apos;ve sent a 6-digit code to your email
              </p>
              <p className="font-medium text-sm mt-1">{email}</p>
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

            <div className="grid gap-2">
              <Label htmlFor="code" className="text-sm">
                Verification Code
              </Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="000000"
                maxLength={6}
                disabled={isLoading}
                className="text-center font-mono tracking-widest text-sm"
                autoComplete="one-time-code"
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code from your email
              </p>
            </div>

            <Button 
              type="submit" 
              variant="orange"
              className="w-full text-sm h-9"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? "Verifying..." : "Verify Code"}
            </Button>

            <div className="grid gap-2">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full text-sm h-9"
                onClick={handleResendCode}
                disabled={isLoading}
              >
                Resend Code
              </Button>

              <Button 
                type="button" 
                variant="ghost" 
                className="w-full text-sm h-9"
                onClick={handleBackToSignIn}
                disabled={isLoading}
              >
                Back to Sign In
              </Button>
            </div>

            <div className="text-center text-xs">
              Having trouble?{" "}
              <a href="/sign-in" className="underline underline-offset-4">
                Try again
              </a>
            </div>
          </div>
        </form>
        <div className="bg-muted relative hidden md:block">
          <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-redorange via-orange to-yellow dark:from-redorange dark:via-orange dark:to-chartreuse">
            <div className="absolute inset-0 bg-black/20 dark:bg-black/50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white space-y-3 p-6">
                <h2 className="text-2xl font-bold">Almost There!</h2>
                <p className="text-base opacity-90">
                  Check your email for the verification code to complete your login
                </p>
                <div className="space-y-2 text-xs opacity-75">
                  <p>🔐 Secure authentication</p>
                  <p>📧 Code expires in 10 minutes</p>
                  <p>✨ One-time use only</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 