// src/app/sign-up/page.tsx

import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/skeleton";

import SignUpForm from "@/components/Auth/signup-form";

// Metadata for the sign-up page
export const metadata: Metadata = {
  title: "Sign Up | Praxis AI",
  description: "Create your Praxis AI account to start building and deploying advanced AI applications with powerful language models.",
  keywords: ["sign up", "register", "create account", "praxis", "ai", "platform"],
  robots: {
    index: false, // Don't index auth pages
    follow: true,
  },
  openGraph: {
    title: "Sign Up | Praxis AI",
    description: "Create your Praxis AI account to start building and deploying advanced AI applications with powerful language models.",
    type: "website",
  },
  twitter: {
    title: "Sign Up | Praxis AI",
    description: "Create your Praxis AI account to start building with AI.",
    card: "summary",
  },
};

export default async function SignUpPage() {

  const { user } = await getSession();

  if (user) {
    redirect('/');
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div className={cn("flex flex-col gap-4")}>
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <SignUpForm />
          </Suspense>
          <div className="text-muted-foreground text-center text-xs text-balance">
            By creating an account, you agree to our{" "}
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
  );
} 