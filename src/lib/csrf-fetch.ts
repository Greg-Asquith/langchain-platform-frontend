import { getCSRFToken } from '@/hooks/useCSRFToken';
import { handleCSRFApiResponse } from '@/lib/csrf-error-handler';

interface CSRFFetchOptions extends RequestInit {
  skipCSRF?: boolean;
  autoHandle?: boolean; // Whether to automatically handle success/error responses
}

/**
 * Enhanced fetch wrapper that automatically includes CSRF tokens for state-changing requests
 */
export async function csrfFetch(url: string, options: CSRFFetchOptions = {}): Promise<Response> {
  const { skipCSRF = false, ...fetchOptions } = options;
  
  // Determine if this is a state-changing request that needs CSRF protection
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const needsCSRF = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  
  // Skip CSRF for safe methods or if explicitly disabled
  if (!needsCSRF || skipCSRF) {
    return fetch(url, fetchOptions);
  }

  try {
    // Get CSRF token
    const csrfToken = await getCSRFToken();
    
    if (!csrfToken) {
      throw new Error('CSRF token not available');
    }

    // Add CSRF token to headers
    const headers = new Headers(fetchOptions.headers);
    headers.set('x-csrf-token', csrfToken);
    
    // Default to JSON content type if not specified and body is present
    if (fetchOptions.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    // Make the request with CSRF token
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // If we get a 403 with CSRF error, the token might be invalid
    if (response.status === 403) {
      try {
        const errorData = await response.clone().json();
        if (errorData.error && errorData.error.toLowerCase().includes('csrf')) {
          // Token might be expired, clear cache and retry once
          const { clearCSRFTokenCache } = await import('@/hooks/useCSRFToken');
          clearCSRFTokenCache();
          
          // Retry with fresh token
          const freshToken = await getCSRFToken();
          if (freshToken) {
            headers.set('x-csrf-token', freshToken);
            return fetch(url, {
              ...fetchOptions,
              headers,
            });
          }
        }
      } catch (parseError) {
        // If we can't parse the error, just return the original response
        console.warn('Failed to parse CSRF error response:', parseError);
      }
    }

    return response;
  } catch (error) {
    console.error('CSRF fetch error:', error);
    
    // Fallback to regular fetch without CSRF token
    // This allows the app to continue working even if CSRF token fetch fails
    console.warn('Falling back to regular fetch without CSRF token');
    return fetch(url, fetchOptions);
  }
}

/**
 * Convenience wrapper for JSON POST requests with CSRF protection
 */
export async function csrfPost(url: string, data: unknown, options: CSRFFetchOptions = {}): Promise<Response> {
  return csrfFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * Convenience wrapper for JSON PUT requests with CSRF protection
 */
export async function csrfPut(url: string, data: unknown, options: CSRFFetchOptions = {}): Promise<Response> {
  return csrfFetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * Convenience wrapper for DELETE requests with CSRF protection
 */
export async function csrfDelete(url: string, options: CSRFFetchOptions = {}): Promise<Response> {
  return csrfFetch(url, {
    method: 'DELETE',
    ...options,
  });
}

/**
 * Convenience wrapper for PATCH requests with CSRF protection
 */
export async function csrfPatch(url: string, data: unknown, options: CSRFFetchOptions = {}): Promise<Response> {
  return csrfFetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    ...options,
  });
}

// Auto-handling versions that automatically process success/error responses

/**
 * POST request with automatic response handling (shows toast messages)
 */
export async function csrfPostAndHandle(
  url: string, 
  data: unknown, 
  successMessage?: string, 
  options: CSRFFetchOptions = {}
): Promise<unknown> {
  const response = await csrfPost(url, data, options);
  return handleCSRFApiResponse(response, successMessage);
}

/**
 * PUT request with automatic response handling (shows toast messages)  
 */
export async function csrfPutAndHandle(
  url: string, 
  data: unknown, 
  successMessage?: string, 
  options: CSRFFetchOptions = {}
): Promise<unknown> {
  const response = await csrfPut(url, data, options);
  return handleCSRFApiResponse(response, successMessage);
}

/**
 * DELETE request with automatic response handling (shows toast messages)
 */
export async function csrfDeleteAndHandle(
  url: string, 
  successMessage?: string, 
  options: CSRFFetchOptions = {}
): Promise<unknown> {
  const response = await csrfDelete(url, options);
  return handleCSRFApiResponse(response, successMessage);
}

/**
 * PATCH request with automatic response handling (shows toast messages)
 */
export async function csrfPatchAndHandle(
  url: string, 
  data: unknown, 
  successMessage?: string, 
  options: CSRFFetchOptions = {}
): Promise<unknown> {
  const response = await csrfPatch(url, data, options);
  return handleCSRFApiResponse(response, successMessage);
}