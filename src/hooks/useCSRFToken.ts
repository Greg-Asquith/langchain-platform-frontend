// src/hooks/useCSRFToken.ts

"use client"

import { useState, useEffect, useCallback } from 'react';

interface CSRFTokenResponse {
  csrfToken: string;
  message: string;
}

interface UseCSRFTokenReturn {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
}

// Cache for CSRF token with expiration
let cachedToken: string | null = null;
let tokenExpiry: number = 0;
const TOKEN_CACHE_DURATION = 50 * 60 * 1000; // 50 minutes (tokens expire in 1 hour)

export function useCSRFToken(): UseCSRFTokenReturn {
  const [token, setToken] = useState<string | null>(cachedToken);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCSRFToken = useCallback(async (): Promise<void> => {
    // Check if cached token is still valid
    if (cachedToken && Date.now() < tokenExpiry) {
      setToken(cachedToken);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data: CSRFTokenResponse = await response.json();
      
      // Cache the token
      cachedToken = data.csrfToken;
      tokenExpiry = Date.now() + TOKEN_CACHE_DURATION;
      
      setToken(data.csrfToken);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch CSRF token';
      setError(errorMessage);
      console.error('CSRF token fetch failed:', err);
      
      // Clear cached token on error
      cachedToken = null;
      tokenExpiry = 0;
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<void> => {
    // Force refresh by clearing cache
    cachedToken = null;
    tokenExpiry = 0;
    await fetchCSRFToken();
  }, [fetchCSRFToken]);

  useEffect(() => {
    fetchCSRFToken();
  }, [fetchCSRFToken]);

  return {
    token,
    isLoading,
    error,
    refreshToken,
  };
}

// Utility function to get CSRF token synchronously (for use outside React components)
export async function getCSRFToken(): Promise<string | null> {
  // Check if cached token is still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await fetch('/api/auth/csrf-token', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }

    const data: CSRFTokenResponse = await response.json();
    
    // Cache the token
    cachedToken = data.csrfToken;
    tokenExpiry = Date.now() + TOKEN_CACHE_DURATION;
    
    return data.csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    
    // Clear cached token on error
    cachedToken = null;
    tokenExpiry = 0;
    
    return null;
  }
}

// Clear cached token (useful for logout)
export function clearCSRFTokenCache(): void {
  cachedToken = null;
  tokenExpiry = 0;
}