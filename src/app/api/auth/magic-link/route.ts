// src/app/api/auth/magic-link/route.ts

import { NextRequest, NextResponse } from "next/server";

import { workos } from "@/lib/workos";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  try {
    await workos.userManagement.createMagicAuth({
      email,
    })
    
    // Create a verification URL with the email encoded
    const verificationUrl = `${req.nextUrl.origin}/verify-code?email=${encodeURIComponent(email)}`;
    
    return NextResponse.json({
      message: "Verification code sent to your email",
      success: true,
      authorizationUrl: verificationUrl,
    });
  } catch (error: unknown) {
    console.error("Magic auth code sending failed:", error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStatus = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
    const errorCode = error && typeof error === 'object' && 'code' in error ? (error as unknown as { code: unknown }).code : undefined;
    const errorData = error && typeof error === 'object' && 'data' in error ? (error as unknown as { data: unknown }).data : undefined;
    
    console.error("Error details:", {
      message: errorMessage,
      status: errorStatus,
      code: errorCode,
      data: errorData,
    });

    return NextResponse.json(
      { 
        error: "Failed to send verification code. Please try again.",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
} 