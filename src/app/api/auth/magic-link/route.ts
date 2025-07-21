// src/app/api/auth/magic-link/route.ts

import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/error-handler";
import { logError } from "@/lib/logger";
import { workos } from "@/lib/workos";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  // Validate email
  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address" },
      { status: 400 }
    );
  }

  try {
    // Check if user exists first (for sign in, user should already exist)
    const existingUsers = await workos.userManagement.listUsers({
      email: email.toLowerCase().trim(),
    });
    
    if (existingUsers.data.length === 0) {
      return NextResponse.json(
        { error: "No account found with this email address. Please sign up first." },
        { status: 404 }
      );
    }

    // Send magic auth code for sign in
    await workos.userManagement.createMagicAuth({
      email: email.toLowerCase().trim(),
    });
    
    // Create a verification URL with the email encoded
    const verificationUrl = `${req.nextUrl.origin}/verify-code?email=${encodeURIComponent(email.toLowerCase().trim())}`;
    
    return NextResponse.json({
      message: "Verification code sent to your email",
      success: true,
      authorizationUrl: verificationUrl,
    });
  } catch (error: unknown) {
    await logError(
      'Magic auth code sending failed',
      { component: 'POST /api/auth/magic-link' },
      error as Error
    );
    return handleApiError(error);
  }
}