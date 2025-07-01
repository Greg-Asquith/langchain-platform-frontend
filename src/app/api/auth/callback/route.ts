// src/app/api/auth/callback/route.ts

import { NextRequest, NextResponse } from "next/server";

import { createSession } from "@/lib/session";
import { WORKOS_CLIENT_ID } from "@/lib/workos";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      console.error("Missing email or code");
      return NextResponse.json(
        { error: "Email and verification code are required" },
        { status: 400 }
      );
    }

    // Authenticate with the magic auth code using the User Management authenticate endpoint
    const response = await fetch("https://api.workos.com/user_management/authenticate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.WORKOS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: WORKOS_CLIENT_ID,
        client_secret: process.env.WORKOS_API_KEY,
        grant_type: "urn:workos:oauth:grant-type:magic-auth:code",
        code,
        email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Authentication failed: ${errorData.message || response.statusText}`);
    }

    const authResult = await response.json();

    // Create a session for the authenticated user
    const sessionToken = await createSession({
      user: authResult.user,
      accessToken: authResult.access_token || "",
      refreshToken: authResult.refresh_token || "",
    });

    // Create response and set cookie
    const jsonResponse = NextResponse.json({
      message: "Authentication successful",
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        firstName: authResult.user.first_name,
        lastName: authResult.user.last_name,
      },
    });

    jsonResponse.cookies.set({
      name: "wos-session",
      value: sessionToken,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return jsonResponse;
  } catch (error: unknown) {
    console.error("Magic auth verification failed:", error);

    return NextResponse.json(
      { 
        error: "Invalid verification code. Please try again.",
        details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined
      },
      { status: 401 }
    );
  }
} 