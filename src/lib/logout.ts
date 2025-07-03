// src/lib/logout.ts

/*
 * This file contains the logout function - which removes the session cookie from the browser
 */

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logout(): Promise<{ success: boolean; error?: string; status?: number }> {

  try {
    // Attempt to log out by deleting the session cookie
    const cookieStore = await cookies();
    cookieStore.delete('wos-session');

  } catch (error) {
    // Handle network errors, fetch failures, etc.
    console.error('Logout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during logout';
    return { success: false, error: errorMessage };

  } finally {
    // Redirect outside of try-catch to avoid catching NEXT_REDIRECT error
    redirect('/sign-in');
  }

}