// src/app/api/auth/csrf-token/route.ts

import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/error-handler';
import { logError } from '@/lib/logger';
import { generateCSRFToken, getSession } from '@/lib/session';

export async function GET() {
  try {
    const { user } = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const csrfToken = await generateCSRFToken();
    
    return NextResponse.json({
      csrfToken,
      message: 'CSRF token generated successfully'
    });
  } catch (error) {
    await logError(
      'Failed to generate CSRF token',
      { component: 'GET /api/auth/csrf-token' },
      error as Error
    );
    return handleApiError(error);
  }
} 