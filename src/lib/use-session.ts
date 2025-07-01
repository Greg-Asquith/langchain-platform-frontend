// src/lib/use-session.ts

/**
 * @fileoverview React hook for managing user authentication sessions with automatic refresh,
 * activity tracking, and session validation.
 * 
 * This module provides a comprehensive session management solution that handles:
 * - Session state tracking and validation
 * - Automatic session refresh when near expiry
 * - User activity monitoring for session extension
 * - Secure sign-out functionality
 * - Real-time session status updates
 * 
 * The hook integrates with backend authentication APIs and provides a consistent interface for session management across the application.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, isLoading, signOut } = useSession();
 * 
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!isAuthenticated) return <div>Please sign in</div>;
 * 
 *   return (
 *     <div>
 *       <h1>Welcome, {user.firstName}!</h1>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 */

"use client";

import { useState, useEffect, useCallback } from "react";

import { useRouter } from "next/navigation";

interface SessionInfo {
  isActive: boolean;
  expiresAt?: number;
  lastActivity?: number;
  rememberMe?: boolean;
  timeUntilExpiry?: number;
  isNearExpiry?: boolean;
}

interface SessionUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
}

export function useSession() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check session status
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSessionInfo({
          isActive: true,
          expiresAt: data.expiresAt,
          lastActivity: data.lastActivity,
          rememberMe: data.rememberMe,
          timeUntilExpiry: data.timeUntilExpiry,
          isNearExpiry: data.isNearExpiry,
        });
      } else {
        setUser(null);
        setSessionInfo({ isActive: false });
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
      setSessionInfo({ isActive: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update session activity
  const updateActivity = useCallback(async () => {
    try {
      await fetch('/api/auth/activity', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }, []);

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        await checkSession(); // Re-check session after refresh
        return true;
      }
      return false;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  }, [checkSession]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setUser(null);
      setSessionInfo({ isActive: false });
      router.push('/sign-in');
    }
  }, [router]);

  // Initial session check
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Auto-refresh session when near expiry
  useEffect(() => {
    if (sessionInfo?.isNearExpiry && sessionInfo.isActive) {
      refreshSession();
    }
  }, [sessionInfo?.isNearExpiry, sessionInfo?.isActive, refreshSession]);

  // Track user activity for session management
  useEffect(() => {
    if (!sessionInfo?.isActive) return;

    const events = ['click', 'keydown', 'scroll', 'mousemove'];
    let activityTimeout: NodeJS.Timeout;

    const handleActivity = () => {
      // Debounce activity updates to avoid too many requests
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        updateActivity();
      }, 30000); // Update activity every 30 seconds of user activity
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimeout(activityTimeout);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [sessionInfo?.isActive, updateActivity]);

  // Periodic session validation
  useEffect(() => {
    if (!sessionInfo?.isActive) return;

    const interval = setInterval(() => {
      checkSession();
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [sessionInfo?.isActive, checkSession]);

  return {
    user,
    sessionInfo,
    isLoading,
    isAuthenticated: !!user && sessionInfo?.isActive,
    checkSession,
    updateActivity,
    refreshSession,
    signOut,
  };
} 