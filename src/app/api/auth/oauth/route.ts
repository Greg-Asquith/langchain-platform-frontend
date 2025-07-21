// src/app/api/auth/oauth/route.ts

import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/error-handler";
import { logError } from "@/lib/logger";
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
    await logError(
      'OAuth initiation error',
      { component: 'GET /api/auth/oauth' },
      error as Error
    );
    return handleApiError(error);
  }
} 