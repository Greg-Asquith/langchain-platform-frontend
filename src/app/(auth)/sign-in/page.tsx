// src/app/sign-in/page.tsx

import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/skeleton";

import SignInForm from "@/components/Auth/signin-form";

// Metadata for the sign-in page
export const metadata: Metadata = {
  title: "Sign In | Praxis AI",
  description: "Sign in to your Praxis AI account to access powerful AI tools and build advanced language model applications.",
  keywords: ["sign in", "login", "praxis", "ai", "authentication", "platform"],
  robots: {
    index: false, // Don't index auth pages
    follow: true,
  },
  openGraph: {
    title: "Sign In | Praxis AI",
    description: "Sign in to your Praxis AI account to access powerful AI tools and build advanced language model applications.",
    type: "website",
  },
  twitter: {
    title: "Sign In | Praxis AI",
    description: "Sign in to your Praxis AI account to access powerful AI tools.",
    card: "summary",
  },
};

export default async function SignInPage() {

  const { user } = await getSession();

  if (user) {
    redirect('/');
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div className={cn("flex flex-col gap-4")}>
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <SignInForm />
          </Suspense>
          <div className="text-muted-foreground text-center text-xs text-balance">
            By signing in, you agree to our{" "}
            <a href="/terms-of-service" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy-policy" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </a>.
          </div>
        </div>
      </div>
    </div>
  )
} 