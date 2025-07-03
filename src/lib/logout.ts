// src/lib/logout.ts

/*
 * This file contains the logout function
 */

"use server";

import { redirect } from "next/navigation";

export async function logout(): Promise<{ success: boolean; error?: string; status?: number }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Log the error for debugging
      console.error(`Logout failed with status ${response.status}: ${response.statusText}`);
      
      // Try to get error message from response body
      let errorMessage = 'Logout failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // If response body isn't JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      return { success: false, error: errorMessage, status: response.status };
    }

    // Successful logout
    redirect('/sign-in');

  } catch (error) {
    // Handle network errors, fetch failures, etc.
    console.error('Logout error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred during logout';

    return { success: false, error: errorMessage };
  }
}