// src/app/api/user/profile/route.ts

import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { withCSRFProtection } from "@/lib/csrf";
import { handleApiError, createAuthenticationError, createValidationError, createNotFoundError, createInternalError } from "@/lib/error-handler";
import { logError } from "@/lib/logger";
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

// Get user profile
export async function GET() {
  try {
    const { user } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    // Get fresh user data from WorkOS
    let freshUserData;
    try {
      freshUserData = await workos.userManagement.getUser(user.id);
    } catch (error: unknown) {
      await logError(
        'Failed to fetch user data',
        { component: 'GET /api/user/profile' },
        error as Error
      );
      return handleApiError(createInternalError("Failed to fetch user data", error as Error));
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

  } catch (error: unknown) {
    await logError(
      'Failed to get user profile',
      { component: 'GET /api/user/profile' },
      error as Error
    );
    
    return handleApiError(error);
  }
}

// Update user profile
export const PUT = withCSRFProtection(async (request: NextRequest) => {
  try {
    const { user } = await getSession();
    
    if (!user) {
      return handleApiError(createAuthenticationError());
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error: unknown) {
      await logError(
        'Error parsing JSON in request body',
        { component: 'PUT /api/user/profile' },
        error as Error
      );
      return handleApiError(createValidationError("Invalid JSON in request body"));
    }

    // Validate input data
    const validationResult = updateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(createValidationError(
        "Invalid input data",
        { details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })) }
      ));
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
    } catch (error: unknown) {
      await logError(
        'Failed to update user profile',
        { component: 'PUT /api/user/profile' },
        error as Error
      );
      
      // Handle specific WorkOS errors
      if (error instanceof Error && error.message.includes('not found')) {
        return handleApiError(createNotFoundError("User not found"));
      }
      
      return handleApiError(createInternalError("Failed to update profile", error as Error));
    }

    // Update the session with the new user data
    const sessionUpdated = await updateSessionWithUserData(updatedUser);
    if (!sessionUpdated) {
      await logError(
        'Failed to update session with new user data',
        { component: 'PUT /api/user/profile' }
      );
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

  } catch (error: unknown) {
    await logError(
      'Failed to update user profile',
      { component: 'PUT /api/user/profile' },
      error as Error
    );
    
    return handleApiError(error);
  }
});