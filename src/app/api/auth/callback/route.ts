// src/app/api/auth/callback/route.ts

import { NextRequest, NextResponse } from "next/server";

import { createAuthenticationError, handleApiError } from "@/lib/error-handler";
import { logError } from "@/lib/logger";
import { createSession } from "@/lib/session";
import { WORKOS_CLIENT_ID, workos } from "@/lib/workos";



export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      await logError(
        'Missing email or code',
        { component: 'POST /api/auth/callback' }
      );
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
        email: email.toLowerCase().trim(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Authentication failed: ${errorData.message || response.statusText}`);
    }

    const authResult = await response.json();

    // Fetch the complete user data to ensure we have firstName and lastName
    let completeUser = authResult.user;
    try {
      completeUser = await workos.userManagement.getUser(authResult.user.id);
    } catch (error) {
      await logError(
        'Failed to fetch complete user data',
        { component: 'POST /api/auth/callback' },
        error as Error
      );
      // Continue with the original user object if we can't fetch the complete data
    }

    // If authentication was successful, ensure the user's email is marked as verified
    // (since they successfully completed magic auth verification)
    try {
      if (completeUser && !completeUser.emailVerified) {
        await workos.userManagement.updateUser({
          userId: completeUser.id,
          emailVerified: true,
        });
        
        // Update the user object to reflect the verification
        completeUser.emailVerified = true;
      }
    } catch (updateError) {
      await logError(
        'Failed to update user email verification status',
        { component: 'POST /api/auth/callback' },
        updateError as Error
      );
      // Don't fail the authentication if we can't update verification status
    }

    // Create a session for the authenticated user
    const sessionToken = await createSession({
      user: completeUser,
      accessToken: authResult.access_token || "",
      refreshToken: authResult.refresh_token || "",
    });

    // Create response and set cookie
    const jsonResponse = NextResponse.json({
      message: "Authentication successful",
      user: {
        id: completeUser.id,
        email: completeUser.email,
        firstName: completeUser.firstName,
        lastName: completeUser.lastName,
        emailVerified: completeUser.emailVerified,
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
    await logError(
      'Magic auth verification failed',
      { component: 'POST /api/auth/callback' },
      error as Error
    );

    // Provide more specific error messages
    let errorMessage = "Invalid verification code. Please try again.";
    
    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        errorMessage = "Verification code has expired. Please request a new one.";
      } else if (error.message.includes("invalid")) {
        errorMessage = "Invalid verification code. Please check the code and try again.";
      } else if (error.message.includes("user not found")) {
        errorMessage = "Account not found. Please sign up first.";
      }
    }

    return handleApiError(createAuthenticationError(errorMessage));
  }
}