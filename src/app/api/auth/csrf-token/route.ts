// src/app/api/auth/csrf-token/route.ts

import { NextResponse } from 'next/server';
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
    console.error('Failed to generate CSRF token:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
} 