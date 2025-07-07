// src/lib/error-handler.ts

import { NextResponse } from 'next/server';

// Error types for better categorization
export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  EXTERNAL_SERVICE = 'external_service',
  INTERNAL = 'internal',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
}

export interface AppError {
  type: ErrorType;
  message: string;
  statusCode: number;
  originalError?: Error;
  context?: Record<string, any>;
}

export class AppErrorClass extends Error implements AppError {
  public type: ErrorType;
  public statusCode: number;
  public originalError?: Error;
  public context?: Record<string, any>;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.context = context;
  }
}

// Error factory functions
export const createValidationError = (message: string, context?: Record<string, any>) =>
  new AppErrorClass(ErrorType.VALIDATION, message, 400, undefined, context);

export const createAuthenticationError = (message: string = 'Authentication required') =>
  new AppErrorClass(ErrorType.AUTHENTICATION, message, 401);

export const createAuthorizationError = (message: string = 'Insufficient permissions') =>
  new AppErrorClass(ErrorType.AUTHORIZATION, message, 403);

export const createNotFoundError = (message: string = 'Resource not found') =>
  new AppErrorClass(ErrorType.NOT_FOUND, message, 404);

export const createConflictError = (message: string, context?: Record<string, any>) =>
  new AppErrorClass(ErrorType.CONFLICT, message, 409, undefined, context);

export const createExternalServiceError = (message: string, originalError?: Error) =>
  new AppErrorClass(ErrorType.EXTERNAL_SERVICE, message, 502, originalError);

export const createInternalError = (message: string = 'Internal server error', originalError?: Error) =>
  new AppErrorClass(ErrorType.INTERNAL, message, 500, originalError);

export const createRateLimitError = (message: string = 'Rate limit exceeded') =>
  new AppErrorClass(ErrorType.RATE_LIMIT, message, 429);

export const createNetworkError = (message: string = 'Network error occurred') =>
  new AppErrorClass(ErrorType.NETWORK, message, 503);

// API Error Handler for consistent API responses
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // If it's our custom AppError, use it directly
  if (error instanceof AppErrorClass) {
    return NextResponse.json(
      {
        error: error.message,
        type: error.type,
        ...(error.context && { context: error.context }),
      },
      { status: error.statusCode }
    );
  }

  // Handle common JavaScript errors
  if (error instanceof Error) {
    // Log the full error for debugging
    console.error('Unhandled Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    // Check for specific error patterns
    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      return NextResponse.json(
        { error: 'Authentication required', type: ErrorType.AUTHENTICATION },
        { status: 401 }
      );
    }

    if (error.message.includes('forbidden') || error.message.includes('permission')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', type: ErrorType.AUTHORIZATION },
        { status: 403 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Resource not found', type: ErrorType.NOT_FOUND },
        { status: 404 }
      );
    }

    if (error.message.includes('conflict') || error.message.includes('already exists')) {
      return NextResponse.json(
        { error: error.message, type: ErrorType.CONFLICT },
        { status: 409 }
      );
    }

    // Default to internal server error
    return NextResponse.json(
      { 
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
        type: ErrorType.INTERNAL 
      },
      { status: 500 }
    );
  }

  // Handle unknown errors
  return NextResponse.json(
    { error: 'An unexpected error occurred', type: ErrorType.INTERNAL },
    { status: 500 }
  );
}

// Client-side error handling utilities
export interface ClientErrorOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  onError?: (error: AppError) => void;
}

export function handleClientError(
  error: unknown,
  options: ClientErrorOptions = {}
): AppError {
  const {
    showToast = true,
    fallbackMessage = 'An unexpected error occurred',
    onError,
  } = options;

  let appError: AppError;

  if (error instanceof AppErrorClass) {
    appError = error;
  } else if (error instanceof Error) {
    // Try to parse API error responses
    if (error.message.includes('fetch')) {
      appError = createNetworkError('Network request failed');
    } else {
      appError = createInternalError(error.message, error);
    }
  } else {
    appError = createInternalError(fallbackMessage);
  }

  // Log the error
  console.error('Client Error:', appError);

  // Call custom error handler if provided
  if (onError) {
    onError(appError);
  }

  // Show toast notification (you can replace this with your toast library)
  if (showToast && typeof window !== 'undefined') {
    // Example: toast.error(appError.message);
    console.error('Toast Error:', appError.message);
  }

  return appError;
}

// Utility to handle fetch responses consistently
export async function handleFetchResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'An error occurred' };
    }

    const errorMessage = errorData.error || errorData.message || 'Request failed';
    const errorType = errorData.type || ErrorType.INTERNAL;

    throw new AppErrorClass(
      errorType,
      errorMessage,
      response.status,
      undefined,
      errorData.context
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw createInternalError('Failed to parse response', error as Error);
  }
}

// Async operation wrapper with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorContext?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw handleClientError(error, { 
      fallbackMessage: `Operation failed${errorContext ? `: ${errorContext}` : ''}` 
    });
  }
} 