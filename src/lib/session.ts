// src/lib/session.ts

/*
 * This file contains session management functions
 * createSession() is used to create a session
 * getSession() is used to get a session
 * setSessionCookie() is used to set a session
 * clearSessionCookie() is used to clear a session
 * updateSessionActivity() is used to update the session activity
 * refreshSession() is used to refresh the session
 * getSessionInfo() is used to get the session info
 * isSessionValid() is used to check if the session is valid
 */

import { cookies } from "next/headers";

import { User } from "@workos-inc/node";

import { SignJWT, jwtVerify } from "jose";

import { WORKOS_COOKIE_PASSWORD } from "./workos";

export interface SessionData {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  lastActivity?: number;
  rememberMe?: boolean;
}

// Enhanced JWT-based session management for custom auth
export async function createSession(sessionData: SessionData): Promise<string> {
  if (!WORKOS_COOKIE_PASSWORD) {
    throw new Error("WORKOS_COOKIE_PASSWORD is required");
  }

  const secret = new TextEncoder().encode(WORKOS_COOKIE_PASSWORD);
  const rememberMe = sessionData.rememberMe || false;
  const expiryTime = rememberMe ? "30d" : "7d";

  const jwt = await new SignJWT({
    user: sessionData.user,
    accessToken: sessionData.accessToken,
    refreshToken: sessionData.refreshToken,
    expiresAt: sessionData.expiresAt || Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000),
    lastActivity: sessionData.lastActivity || Date.now(),
    rememberMe,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiryTime)
    .sign(secret);

  return jwt;
}

// Check for an active session from the wos-session cookie
export async function getSession(): Promise<{ user: User | null; accessToken?: string }> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("wos-session")?.value;

    if (!sessionCookie || !WORKOS_COOKIE_PASSWORD) {
      return { user: null };
    }

    const secret = new TextEncoder().encode(WORKOS_COOKIE_PASSWORD);
    const { payload } = await jwtVerify(sessionCookie, secret);

    const user = payload.user as User;
    const accessToken = payload.accessToken as string;

    if (user) {
      return { user, accessToken };
    }

    return { user: null };
  } catch (error) {
    console.error('Session validation error:', error);
    return { user: null };
  }
}

// Set the wos session cookie
export async function setSessionCookie(sealedSession: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "wos-session",
    value: sealedSession,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

// Clear the wos session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("wos-session");
}

// Enhanced session management functions

export async function updateSessionActivity(): Promise<boolean> {
  try {
    const { user } = await getSession();
    if (!user) return false;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("wos-session")?.value;

    if (!sessionCookie || !WORKOS_COOKIE_PASSWORD) {
      return false;
    }

    const secret = new TextEncoder().encode(WORKOS_COOKIE_PASSWORD);
    const { payload } = await jwtVerify(sessionCookie, secret);

    // Update last activity timestamp
    const updatedPayload = {
      ...payload,
      lastActivity: Date.now(),
    };

    const jwt = await new SignJWT(updatedPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    await setSessionCookie(jwt);
    return true;
  } catch (error) {
    console.error('Failed to update session activity:', error);
    return false;
  }
}

// Refresh the session
export async function refreshSession(): Promise<boolean> {
  try {
    const { user } = await getSession();
    if (!user) return false;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("wos-session")?.value;

    if (!sessionCookie || !WORKOS_COOKIE_PASSWORD) {
      return false;
    }

    const secret = new TextEncoder().encode(WORKOS_COOKIE_PASSWORD);
    const { payload } = await jwtVerify(sessionCookie, secret);

    const rememberMe = payload.rememberMe as boolean || false;
    const newExpiry = rememberMe ? "30d" : "7d";

    // Refresh session with new expiry
    const refreshedPayload = {
      ...payload,
      lastActivity: Date.now(),
      expiresAt: Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000),
    };

    const jwt = await new SignJWT(refreshedPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(newExpiry)
      .sign(secret);

    await setSessionCookie(jwt);
    return true;
  } catch (error) {
    console.error('Failed to refresh session:', error);
    return false;
  }
}

// Get the session info
export async function getSessionInfo(): Promise<{
  isActive: boolean;
  expiresAt?: number;
  lastActivity?: number;
  rememberMe?: boolean;
  timeUntilExpiry?: number;
  isNearExpiry?: boolean;
} | null> {
  try {
    const { user } = await getSession();
    if (!user) {
      return { isActive: false };
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("wos-session")?.value;

    if (!sessionCookie || !WORKOS_COOKIE_PASSWORD) {
      return { isActive: false };
    }

    const secret = new TextEncoder().encode(WORKOS_COOKIE_PASSWORD);
    const { payload } = await jwtVerify(sessionCookie, secret);

    const expiresAt = payload.expiresAt as number;
    const lastActivity = payload.lastActivity as number;
    const rememberMe = (payload.rememberMe as boolean) || false;

    const now = Date.now();
    const timeUntilExpiry = expiresAt ? expiresAt - now : undefined;
    const isNearExpiry = timeUntilExpiry ? timeUntilExpiry < (60 * 60 * 1000) : false; // Less than 1 hour

    return {
      isActive: true,
      expiresAt,
      lastActivity,
      rememberMe,
      timeUntilExpiry,
      isNearExpiry,
    };
  } catch (error) {
    console.error('Failed to get session info:', error);
    return { isActive: false };
  }
}

// Check if the session is valid
export async function isSessionValid(): Promise<boolean> {
  try {
    const { user } = await getSession();
    if (!user) return false;

    const sessionInfo = await getSessionInfo();
    if (!sessionInfo?.isActive) return false;

    // Check for session inactivity
    if (sessionInfo.lastActivity) {
      const inactivityTimeout = sessionInfo.rememberMe 
        ? 7 * 24 * 60 * 60 * 1000 // 7 days for remember me
        : 2 * 60 * 60 * 1000; // 2 hours for normal session
      
      if (Date.now() - sessionInfo.lastActivity > inactivityTimeout) {
        await clearSessionCookie();
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}