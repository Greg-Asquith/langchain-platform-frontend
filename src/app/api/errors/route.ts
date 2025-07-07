// src/app/api/errors/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { logError, logInfo } from '@/lib/logger';

interface ErrorData {
  message: string;
  stack?: string;
  name: string;
  digest?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getSession();
    
    // Parse error data from request body
    let errorData: ErrorData;
    try {
      errorData = await request.json();
    } catch (error: unknown) {
      console.error("Error parsing JSON in request body:", error);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Add user context if available
    const enrichedErrorData = {
      ...errorData,
      userId: user?.id || 'anonymous',
      userEmail: user?.email || 'anonymous',
      sessionId: request.cookies.get('wos-session')?.value ? 'authenticated' : 'anonymous',
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown',
      referer: request.headers.get('referer') || 'unknown',
    };

    // Log the error using centralized logging system
    await logError(
      `Client Error Report: ${errorData.message}`,
      {
        userId: enrichedErrorData.userId,
        userEmail: enrichedErrorData.userEmail,
        sessionId: enrichedErrorData.sessionId,
        url: errorData.url,
        userAgent: errorData.userAgent,
        ip: enrichedErrorData.ip,
        component: 'API Error Handler',
        metadata: {
          digest: errorData.digest,
          componentStack: errorData.componentStack,
          referer: enrichedErrorData.referer,
          clientTimestamp: errorData.timestamp,
          source: 'client',
        },
      },
      new Error(errorData.message)
    );

    // Log successful error processing
    await logInfo('Client error successfully processed and logged', {
      userId: enrichedErrorData.userId,
      component: 'API Error Handler',
    });

    return NextResponse.json({
      success: true,
      message: 'Error logged successfully',
    });

  } catch (error: unknown) {
    console.error('Failed to log client error:', error);
    
    return NextResponse.json(
      { error: 'Failed to log error' },
      { status: 500 }
    );
  }
}

// Helper function to send errors to monitoring service
// async function sendToMonitoringService(errorData: any) {
//   // Example integrations:
//   
//   // Sentry
//   // Sentry.captureException(new Error(errorData.error.message), {
//   //   extra: errorData.context,
//   //   tags: {
//   //     source: 'client',
//   //     userId: errorData.context.userId,
//   //   },
//   // });
//   
//   // LogRocket
//   // LogRocket.captureException(new Error(errorData.error.message));
//   
//   // DataDog
//   // await fetch('https://http-intake.logs.datadoghq.com/v1/input/YOUR_API_KEY', {
//   //   method: 'POST',
//   //   headers: {
//   //     'Content-Type': 'application/json',
//   //   },
//   //   body: JSON.stringify(errorData),
//   // });
// } 