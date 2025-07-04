// src/middleware.ts

/*
 * This file is used to protect routes that are not authenticated
 * It is used to redirect users to the sign-in page if they are not authenticated
 * It is also used to redirect users to the sign-in page if they are not authenticated
 * It is also used to redirect users to the sign-in page if they are not authenticated
*/

import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/session";

// Define public API routes that don't need authentication
const PUBLIC_API_ROUTES = [
  "/api/auth/", // All auth routes are public
];

// Define private API routes that need authentication
const PRIVATE_API_ROUTES: string[] = [
    '/api/teams/',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Handle API routes
  if (pathname.startsWith("/api/")) {
    // Check if it's a public API route
    const isPublicAPI = PUBLIC_API_ROUTES.some((route) =>
      pathname.startsWith(route)
    );
    if (isPublicAPI) {
      return NextResponse.next();
    }

    // Check if it's a private API route that needs protection
    const isPrivateAPI = PRIVATE_API_ROUTES.some((route) =>
      pathname.startsWith(route)
    );
    if (isPrivateAPI) {
      try {
        const { user } = await getSession();
        if (!user) {
          return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }
        return NextResponse.next();
      } catch (error) {
        console.error("API authentication error:", error);
        return NextResponse.json(
          { error: "Authentication failed" },
          { status: 401 }
        );
      }
    }

    // For unspecified API routes, allow them through (you can change this behavior)
    return NextResponse.next();
  }

  // Skip middleware for auth pages
  if (
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname === "/verify-code" ||
    pathname === "/callback"
  ) {
    return NextResponse.next();
  }

  try {
    // Check authentication using our custom session management
    const { user } = await getSession();

    if (!user) {
      // User is not authenticated, redirect to sign-in
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // User is authenticated, continue
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware authentication error:", error);
    // On error, redirect to sign-in
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
