// src/app/verify-code/page.tsx

import { Metadata } from "next";
import { Suspense } from "react";

import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/skeleton";
import VerifyCodeForm from "@/components/Auth/verify-code";

// Metadata for the verify code page
export const metadata: Metadata = {
  title: "Verify Email | Praxis AI",
  description: "Enter the verification code sent to your email to complete your sign-in to Praxis AI.",
  keywords: ["verify", "email", "verification", "code", "praxis", "authentication"],
  robots: {
    index: false, // Don't index auth pages
    follow: true,
  },
  openGraph: {
    title: "Verify Email | Praxis AI",
    description: "Enter the verification code sent to your email to complete your sign-in to Praxis AI.",
    type: "website",
  },
  twitter: {
    title: "Verify Email | Praxis AI",
    description: "Enter the verification code sent to your email to complete your sign-in.",
    card: "summary",
  },
};

export default function VerifyCodePage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div className={cn("flex flex-col gap-4")}>
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <VerifyCodeForm />
          </Suspense>
          <div className="text-muted-foreground text-center text-xs text-balance">
            Didn&apos;t receive the code?{" "}
            <a href="/sign-in" className="underline underline-offset-4 hover:text-primary">
              Try signing in again
            </a>{" "}
            or check your spam folder.
          </div>
        </div>
      </div>
    </div>
  );
} 