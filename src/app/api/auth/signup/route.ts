// src/app/api/auth/signup/route.ts

import { NextRequest, NextResponse } from "next/server";

import { workos } from "@/lib/workos";

export async function POST(req: NextRequest) {
  try {
    const { email, firstName, lastName } = await req.json();

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, first name, and last name are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Check if user already exists
    try {
      const existingUsers = await workos.userManagement.listUsers({
        email: email.toLowerCase().trim(),
      });
      
      if (existingUsers.data.length > 0) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in instead." },
          { status: 409 }
        );
      }
    } catch (error) {
      console.error("Error checking existing user:", error);
      // Continue with user creation if check fails
    }

    // Create the user account
    let newUser;
    try {
      newUser = await workos.userManagement.createUser({
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailVerified: false, // Will be verified when they complete magic auth
      });
    } catch (error: unknown) {
      console.error("Error creating user:", error);
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message?.includes("already exists")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in instead." },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }

    // Send magic auth code for immediate verification and sign in
    try {
      await workos.userManagement.createMagicAuth({
        email: email.toLowerCase().trim(),
      });
      
      // Create a verification URL with the email encoded
      const verificationUrl = `${req.nextUrl.origin}/verify-code?email=${encodeURIComponent(email.toLowerCase().trim())}`;
      
      return NextResponse.json({
        message: "Account created! Check your email for a verification code to complete setup.",
        success: true,
        authorizationUrl: verificationUrl,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
      });
      
    } catch (error: unknown) {
      console.error("Error sending verification code:", error);
      
      // If we created the user but failed to send verification, we should clean up by deleting the user
      try {
        await workos.userManagement.deleteUser(newUser.id);
      } catch (cleanupError) {
        console.error("Failed to cleanup user after verification failure:", cleanupError);
      }
      
      return NextResponse.json(
        { error: "Failed to send verification code. Please try again." },
        { status: 500 }
      );
    }
    
  } catch (error: unknown) {
    console.error("Signup failed:", error);
    
    return NextResponse.json(
      { 
        error: "An unexpected error occurred during signup. Please try again.",
        details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}