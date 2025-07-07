// src/lib/csrf.ts

import { NextRequest, NextResponse } from 'next/server';

import { verifyCSRFToken } from '@/lib/session';

export async function validateCSRFToken(request: NextRequest): Promise<NextResponse | null> {
  // Only check CSRF tokens for state-changing operations
  const method = request.method;
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null; // No CSRF check needed for safe methods
  }

  const csrfToken = request.headers.get('x-csrf-token');
  
  if (!csrfToken) {
    return NextResponse.json(
      { error: 'CSRF token required' },
      { status: 403 }
    );
  }

  const isValid = await verifyCSRFToken(csrfToken);
  
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  return null; // Token is valid, continue with request
}

export function withCSRFProtection(handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>) {
  return async (request: NextRequest, ...args: unknown[]) => {
    const csrfError = await validateCSRFToken(request);
    if (csrfError) {
      return csrfError;
    }
    
    return handler(request, ...args);
  };
} 