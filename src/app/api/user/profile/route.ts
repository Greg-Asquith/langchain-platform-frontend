// src/app/api/user/profile/route.ts

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { getSession, updateSessionWithUserData } from "@/lib/session";
import { workos } from "@/lib/workos";

// Input validation schema
const updateProfileSchema = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "First name can only contain letters, spaces, hyphens, and apostrophes"),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "Last name can only contain letters, spaces, hyphens, and apostrophes"),
});

interface ApiError {
  error: string
  details?: Array<{
    field: string
    message: string
  }>
}

// Get user profile
export async function GET() {
  try {
    const { user } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get fresh user data from WorkOS
    let freshUserData;
    try {
      freshUserData = await workos.userManagement.getUser(user.id);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: {
        id: freshUserData.id,
        email: freshUserData.email,
        firstName: freshUserData.firstName,
        lastName: freshUserData.lastName,
        profilePictureUrl: freshUserData.profilePictureUrl,
        emailVerified: freshUserData.emailVerified,
        createdAt: freshUserData.createdAt,
        updatedAt: freshUserData.updatedAt,
      },
    });

  } catch (error) {
    console.error("Failed to get user profile:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Update user profile
export async function PUT(request: NextRequest) {
  try {
    const { user } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate input data
    const validationResult = updateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid input data",
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const { firstName, lastName } = validationResult.data;

    // Update user profile in WorkOS
    let updatedUser;
    try {
      updatedUser = await workos.userManagement.updateUser({
        userId: user.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
    } catch (error) {
      console.error('Failed to update user profile:', error);
      
      // Handle specific WorkOS errors
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }
      }
      
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    // Update the session with the new user data
    const sessionUpdated = await updateSessionWithUserData(updatedUser);
    if (!sessionUpdated) {
      console.warn('Failed to update session with new user data');
      // Don't fail the request, just log the warning
    }

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        profilePictureUrl: updatedUser.profilePictureUrl,
        emailVerified: updatedUser.emailVerified,
        updatedAt: updatedUser.updatedAt,
      },
      message: "Profile updated successfully"
    });

  } catch (error) {
    console.error("Failed to update user profile:", error);
    
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}