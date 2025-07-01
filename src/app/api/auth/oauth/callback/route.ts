// src/app/api/auth/oauth/callback/route.ts

import { NextRequest, NextResponse } from "next/server";

import { createSession } from "@/lib/session";
import { workos, WORKOS_CLIENT_ID } from "@/lib/workos";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      const returnUrl = state || "/sign-in";
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${returnUrl}?error=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sign-in?error=no_code`
      );
    }

    // Exchange code for user information
    const authResponse = await workos.userManagement.authenticateWithCode({
      clientId: WORKOS_CLIENT_ID,
      code,
    });

    // Create session JWT
    const sessionToken = await createSession({
      user: authResponse.user,
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
    });

    // Create response and set cookie
    const returnUrl = state || '/';
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${returnUrl}`
    );

    response.cookies.set({
      name: "wos-session",
      value: sessionToken,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;

  } catch (error) {
    console.error("OAuth callback error:", error);
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sign-in?error=${encodeURIComponent("oauth_failed")}`
    );
  }
} 