// src/lib/csrf-error-handler.ts

import { toast } from 'sonner';
import { clearCSRFTokenCache } from '@/hooks/useCSRFToken';

interface CSRFErrorResponse {
  error: string;
  details?: unknown;
}

/**
 * Enhanced error handler that can specifically handle CSRF-related errors
 */
export async function handleCSRFResponse(response: Response): Promise<void> {
  if (!response.ok) {
    try {
      const errorData: CSRFErrorResponse = await response.json();
      
      // Handle CSRF-specific errors
      if (response.status === 403 && errorData.error) {
        const errorMessage = errorData.error.toLowerCase();
        
        if (errorMessage.includes('csrf')) {
          // Clear the cached token since it's likely invalid
          clearCSRFTokenCache();
          
          // Show user-friendly CSRF error message
          toast.error('Security token expired. Please try again.');
          
          // Optionally, you could refresh the page to get a fresh token
          // window.location.reload();
          
          return;
        }
      }
      
      // Handle authentication errors
      if (response.status === 401) {
        toast.error('Please sign in to continue');
        
        // Redirect to sign-in page
        window.location.href = '/sign-in';
        return;
      }
      
      // Handle other specific error cases
      switch (response.status) {
        case 400:
          toast.error(errorData.error || 'Invalid request data');
          break;
        case 404:
          toast.error('Resource not found');
          break;
        case 409:
          toast.error(errorData.error || 'Conflict - resource already exists');
          break;
        case 429:
          toast.error('Too many requests. Please wait before trying again.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(errorData.error || `Request failed (${response.status})`);
      }
      
    } catch (parseError) {
      // If we can't parse the error response, show a generic error
      console.error('Failed to parse error response:', parseError);
      toast.error(`Request failed (${response.status})`);
    }
  }
}

/**
 * Helper function to handle successful responses and show success messages
 */
export async function handleCSRFSuccess(response: Response, defaultMessage = 'Action completed successfully'): Promise<unknown> {
  try {
    const data = await response.json();
    
    // Show success message if provided
    if (data.message) {
      toast.success(data.message);
    } else {
      toast.success(defaultMessage);
    }
    
    return data;
  } catch (parseError) {
    // If there's no JSON body, just show the default success message
    toast.success(defaultMessage);
    return null;
  }
}

/**
 * Combined handler that processes both success and error responses
 */
export async function handleCSRFApiResponse(
  response: Response, 
  successMessage?: string
): Promise<unknown> {
  if (response.ok) {
    return handleCSRFSuccess(response, successMessage);
  } else {
    await handleCSRFResponse(response);
    throw new Error(`Request failed with status ${response.status}`);
  }
}