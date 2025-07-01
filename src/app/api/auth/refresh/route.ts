// src/app/api/auth/refresh/route.ts

import { NextRequest, NextResponse } from "next/server";

import { jwtVerify, SignJWT } from "jose";

const SECRET_KEY = new TextEncoder().encode(process.env.WORKOS_COOKIE_PASSWORD);

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from request body or cookies
    let refreshToken: string | undefined;
    
    const body = await request.json().catch(() => ({}));
    refreshToken = body.refreshToken;

    // If no refresh token in body, try to get from cookies
    if (!refreshToken) {
      const sessionCookie = request.cookies.get("session");
      if (sessionCookie) {
        try {
          const { payload } = await jwtVerify(sessionCookie.value, SECRET_KEY);
          refreshToken = payload.refreshToken as string;
        } catch (error) {
          console.error("Failed to parse session cookie:", error);
        }
      }
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 401 }
      );
    }

    // TODO: For now, we'll extend the current session since WorkOS token refresh
    // methods might not be available in this SDK version
    // In a production environment, you'd implement proper token refresh
    
    // Get current session data
    const sessionCookie = request.cookies.get("session");
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "No active session found" },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(sessionCookie.value, SECRET_KEY);
    
    // Create refreshed session JWT with extended expiry
    const sessionData = {
      ...payload,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
      lastActivity: Date.now(),
    };

    const jwt = await new SignJWT(sessionData)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(SECRET_KEY);

    // Set refreshed session cookie
    const response = NextResponse.json({
      success: true,
      user: payload.user,
      message: "Session refreshed successfully",
    });

    response.cookies.set("session", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return response;

  } catch (error: unknown) {
    console.error("Session refresh error:", error);
    
    let errorMessage = "Failed to refresh session";
    
    // Handle specific WorkOS errors
    if (error instanceof Error && (error.message.includes("invalid") || error.message.includes("expired"))) {
      errorMessage = "Session has expired. Please sign in again.";
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 401 }
    );
  }
} 