// src/app/sign-in/page.tsx

import { Metadata } from "next";
import { Suspense } from "react";

import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/skeleton";
import SignInForm from "@/components/Auth/SignInForm";

// Metadata for the sign-in page
export const metadata: Metadata = {
  title: "Sign In | LangChain Platform",
  description: "Sign in to your LangChain Platform account to access powerful AI tools and build advanced language model applications.",
  keywords: ["sign in", "login", "langchain", "ai", "authentication", "platform"],
  robots: {
    index: false, // Don't index auth pages
    follow: true,
  },
  openGraph: {
    title: "Sign In | LangChain Platform",
    description: "Sign in to your LangChain Platform account to access powerful AI tools and build advanced language model applications.",
    type: "website",
  },
  twitter: {
    title: "Sign In | LangChain Platform",
    description: "Sign in to your LangChain Platform account to access powerful AI tools.",
    card: "summary",
  },
};

export default function SignInPage() {
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