// src/app/api/auth/oauth/route.ts

import { NextRequest, NextResponse } from "next/server";

import { workos, WORKOS_CLIENT_ID } from "@/lib/workos";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    const returnTo = searchParams.get("returnTo") || "/";

    if (!provider || !["google", "github"].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid or missing provider. Use "google" or "github"' },
        { status: 400 }
      );
    }

    // Generate OAuth authorization URL with correct provider names for WorkOS
    const providerMap: Record<string, string> = {
      "google": "GoogleOAuth",
      "github": "GitHubOAuth",
    };

    const workosProvider = providerMap[provider];
    
    const authorizationUrl = workos.userManagement.getAuthorizationUrl({
      provider: workosProvider,
      clientId: WORKOS_CLIENT_ID,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/oauth/callback`,
      state: returnTo, // Pass the return URL as state
    });

    return NextResponse.redirect(authorizationUrl);

  } catch (error) {
    console.error("OAuth initiation error:", error);
    
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
} 