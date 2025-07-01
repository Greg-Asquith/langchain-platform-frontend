// src/app/api/auth/logout/route.ts

import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json({ success: true });
    
    // Clear the session cookie
    response.cookies.set({
      name: "wos-session",
      value: "",
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
    });

    return response;

  } catch (error) {
    console.error("Logout error:", error);
    
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
} 