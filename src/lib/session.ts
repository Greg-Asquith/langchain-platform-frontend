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

import { User, Organization, OrganizationDomainVerificationStrategy } from "@workos-inc/node";

import { SignJWT, jwtVerify } from "jose";

import { WORKOS_COOKIE_PASSWORD, workos } from "./workos";

export interface SessionData {
  user: User;
  accessToken: string;
  refreshToken: string;
  organizations: Organization[];
  currentOrganizationId?: string;
  expiresAt?: number;
  lastActivity?: number;
  rememberMe?: boolean;
}

// Get user's organizations from WorkOS
async function fetchUserOrganizations(userId: string, userFirstName: string): Promise<Organization[]> {
  try {
    const memberships = await workos.userManagement.listOrganizationMemberships({
      userId,
      limit: 100,
    });

    if (memberships.data.length === 0) {
      // Create personal organization if user has no organizations
      const personalOrgName = userFirstName ? `${userFirstName}'s Personal Team` : `Personal Team (${userId})`;
      const personalOrg = await workos.organizations.createOrganization({
        name: personalOrgName,
        domainData: [],
        metadata: {
          personal: "true",
          colour: "#ff5c4d",
        },
      });

      // Add user as admin of their personal organization
      await workos.userManagement.createOrganizationMembership({
        userId,
        organizationId: personalOrg.id,
        roleSlug: 'admin',
      });

      return [{
        object: "organization",
        allowProfilesOutsideOrganization: false,
        createdAt: personalOrg.createdAt,
        updatedAt: personalOrg.updatedAt,
        externalId: personalOrg.externalId,
        id: personalOrg.id,
        name: personalOrg.name,
        domains: personalOrg.domains?.map(d => ({
          object: "organization_domain",
          organizationId: personalOrg.id,
          verificationStrategy: OrganizationDomainVerificationStrategy.Manual,
          id: d.id,
          domain: d.domain,
          state: d.state,
        })) || [],
        metadata: {
          personal: "true",
          colour: "#ff5c4d",
        },
      }];
    }

    // Fetch full organization details
    const organizations: Organization[] = [];
    for (const membership of memberships.data) {
      if (membership.organizationId) {
        try {
          const org = await workos.organizations.getOrganization(membership.organizationId);
          organizations.push({
            object: "organization",
            allowProfilesOutsideOrganization: false,
            createdAt: org.createdAt,
            updatedAt: org.updatedAt,
            externalId: org.externalId,
            id: org.id,
            name: org.name,
            domains: org.domains?.map(d => ({
              object: "organization_domain",
              organizationId: org.id,
              verificationStrategy: OrganizationDomainVerificationStrategy.Manual,
              id: d.id,
              domain: d.domain,
              state: d.state,
            })) || [],
            metadata: {
              personal: org.metadata?.personal === "true" ? "true" : "false",
              colour: org.metadata?.colour,
              createdBy: org.metadata?.createdBy,
              createdAt: org.metadata?.createdAt,
              description: org.metadata?.description,
            },
          });
        } catch (error) {
          console.error(`Failed to fetch organization ${membership.organizationId}:`, error);
        }
      }
    }

    return organizations;
  } catch (error) {
    console.error('Failed to fetch user organizations:', error);
    return [];
  }
}

// Enhanced JWT-based session management for custom auth
export async function createSession(sessionData: Omit<SessionData, 'organizations' | 'currentOrganizationId'>): Promise<string> {
  if (!WORKOS_COOKIE_PASSWORD) {
    throw new Error("WORKOS_COOKIE_PASSWORD is required");
  }

  // Fetch user's organizations
  const organizations = await fetchUserOrganizations(sessionData.user.id, sessionData.user.firstName || '');
  const currentOrganizationId = organizations.length > 0 ? organizations[0].id : undefined;

  const secret = new TextEncoder().encode(WORKOS_COOKIE_PASSWORD);
  const rememberMe = sessionData.rememberMe || false;
  const expiryTime = rememberMe ? "30d" : "7d";

  const jwt = await new SignJWT({
    user: sessionData.user,
    accessToken: sessionData.accessToken,
    refreshToken: sessionData.refreshToken,
    organizations,
    currentOrganizationId,
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
export async function getSession(): Promise<{ 
  user: User | null; 
  accessToken?: string;
  organizations?: Organization[];
  currentOrganizationId?: string;
}> {
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
    const organizations = payload.organizations as Organization[];
    const currentOrganizationId = payload.currentOrganizationId as string;

    if (user) {
      if(!organizations || organizations.length === 0) {
        const serverOrganizations = await fetchUserOrganizations(user.id, user.firstName || '');
        const defaultOrganizationId = serverOrganizations[0].id;
        return { user, accessToken, organizations: serverOrganizations, currentOrganizationId: defaultOrganizationId };
      }
      return { user, accessToken, organizations, currentOrganizationId };
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
    sameSite: 'strict', // Changed from 'lax' to 'strict' for better CSRF protection
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

// Generate CSRF token
export async function generateCSRFToken(): Promise<string> {
  const { user } = await getSession();
  if (!user) {
    throw new Error('No active session');
  }

  const payload = {
    userId: user.id,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
  };

  if (!WORKOS_COOKIE_PASSWORD) {
    throw new Error('Missing WORKOS_COOKIE_PASSWORD');
  }

  const secret = new TextEncoder().encode(WORKOS_COOKIE_PASSWORD);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h') // CSRF tokens should be short-lived
    .sign(secret);

  return token;
}

// Verify CSRF token
export async function verifyCSRFToken(token: string): Promise<boolean> {
  try {
    const { user } = await getSession();
    if (!user) {
      return false;
    }

    if (!WORKOS_COOKIE_PASSWORD) {
      return false;
    }

    const secret = new TextEncoder().encode(WORKOS_COOKIE_PASSWORD);
    const { payload } = await jwtVerify(token, secret);

    // Verify the token is for the current user
    if (payload.userId !== user.id) {
      return false;
    }

    // Check if token is not too old (additional safety check)
    const timestamp = payload.timestamp as number;
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - timestamp > oneHour) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('CSRF token verification failed:', error);
    return false;
  }
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

// Update the session with fresh user data
export async function updateSessionWithUserData(updatedUser: User): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("wos-session")?.value;

    if (!sessionCookie || !WORKOS_COOKIE_PASSWORD) {
      return false;
    }

    const secret = new TextEncoder().encode(WORKOS_COOKIE_PASSWORD);
    const { payload } = await jwtVerify(sessionCookie, secret);

    // Update the session with the new user data while preserving other session data
    const updatedPayload = {
      ...payload,
      user: updatedUser,
      lastActivity: Date.now(),
    };

    const rememberMe = payload.rememberMe as boolean || false;
    const newExpiry = rememberMe ? "30d" : "7d";

    const jwt = await new SignJWT(updatedPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(newExpiry)
      .sign(secret);

    await setSessionCookie(jwt);
    return true;
  } catch (error) {
    console.error('Failed to update session with user data:', error);
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

// Switch to a different organization
export async function switchOrganization(organizationId: string): Promise<boolean> {
  try {
    const { user, organizations } = await getSession();
    if (!user || !organizations) return false;

    // Verify user has access to this organization
    const hasAccess = organizations.some(org => org.id === organizationId);
    if (!hasAccess) return false;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("wos-session")?.value;

    if (!sessionCookie || !WORKOS_COOKIE_PASSWORD) {
      return false;
    }

    const secret = new TextEncoder().encode(WORKOS_COOKIE_PASSWORD);
    const { payload } = await jwtVerify(sessionCookie, secret);

    // Update current organization
    const updatedPayload = {
      ...payload,
      currentOrganizationId: organizationId,
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
    console.error('Failed to switch organization:', error);
    return false;
  }
}

// Refresh organizations in session (call after creating/joining organizations)
export async function refreshOrganizations(): Promise<boolean> {
  try {
    const { user } = await getSession();
    if (!user) return false;

    const organizations = await fetchUserOrganizations(user.id, user.firstName || '');
    
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("wos-session")?.value;

    if (!sessionCookie || !WORKOS_COOKIE_PASSWORD) {
      return false;
    }

    const secret = new TextEncoder().encode(WORKOS_COOKIE_PASSWORD);
    const { payload } = await jwtVerify(sessionCookie, secret);

    // Update organizations and ensure current org is still valid
    const currentOrgStillExists = organizations.some(org => org.id === payload.currentOrganizationId);
    const currentOrganizationId = currentOrgStillExists 
      ? payload.currentOrganizationId as string
      : (organizations.length > 0 ? organizations[0].id : undefined);

    const updatedPayload = {
      ...payload,
      organizations,
      currentOrganizationId,
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
    console.error('Failed to refresh organizations:', error);
    return false;
  }
}