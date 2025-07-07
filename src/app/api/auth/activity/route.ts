// src/app/api/auth/activity/route.ts

import { NextRequest, NextResponse } from "next/server";

import { jwtVerify, SignJWT } from "jose";

const SECRET_KEY = new TextEncoder().encode(process.env.WORKOS_COOKIE_PASSWORD);

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("session");
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "No active session found" },
        { status: 401 }
      );
    }

    // Verify and decode the current session
    const { payload } = await jwtVerify(sessionCookie.value, SECRET_KEY);

    // Update last activity timestamp
    const updatedSessionData = {
      ...payload,
      lastActivity: Date.now(),
    };

    // Create new session JWT with updated activity
    const jwt = await new SignJWT(updatedSessionData)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(SECRET_KEY);

    // Set updated session cookie
    const response = NextResponse.json({
      success: true,
      lastActivity: updatedSessionData.lastActivity,
    });

    response.cookies.set("wos-session", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("Activity tracking error:", error);
    
    return NextResponse.json(
      { error: "Failed to update session activity" },
      { status: 500 }
    );
  }
} 