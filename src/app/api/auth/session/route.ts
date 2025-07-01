// src/app/api/auth/session/route.ts

import { NextRequest, NextResponse } from "next/server";

import { createSession, getSession, getSessionInfo } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { user, accessToken, refreshToken, rememberMe = false } = await request.json();

    if (!user || !accessToken || !refreshToken) {
      return NextResponse.json(
        { error: "Missing required session data" },
        { status: 400 }
      );
    }

    // Create sealed session
    const sealedSession = await createSession({
      user,
      accessToken,
      refreshToken,
      rememberMe,
    });

    // Create response
    const response = NextResponse.json({ success: true });

    // Set session cookie with appropriate expiry
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7; // 30 days or 7 days
    
    response.cookies.set({
      name: "wos-session",
      value: sealedSession,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
    });

    return response;

  } catch (error) {
    console.error("Session creation error:", error);
    
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { user } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "No active session" },
        { status: 401 }
      );
    }

    const sessionInfo = await getSessionInfo();

    return NextResponse.json({
      user,
      ...sessionInfo,
    });

  } catch (error) {
    console.error("Session retrieval error:", error);
    
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
} 