// src/app/error.tsx

"use client";

import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logError } from '@/lib/logger';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  React.useEffect(() => {
    // Log the error using centralized logging system
    const logAppError = async () => {
      try {
        await logError(
          `App Router Error: ${error.message}`,
          {
            component: 'ErrorPage',
            url: window.location.href,
            userAgent: navigator.userAgent,
            metadata: {
              digest: error.digest,
              appRouter: true,
            },
          },
          error
        );
      } catch (loggingError: unknown) {
        console.error('Failed to log error via centralized logger:', loggingError);
      }
    };

    logAppError();
  }, [error]);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReportBug = () => {
    const subject = encodeURIComponent('Bug Report: Application Error');
    const body = encodeURIComponent(
      `Error Message: ${error.message}\n\nDigest: ${error.digest || 'N/A'}\n\nURL: ${window.location.href}\n\nTimestamp: ${new Date().toISOString()}`
    );
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Oops! Something went wrong
          </CardTitle>
          <CardDescription className="text-gray-600">
            We&apos;re sorry for the inconvenience. Our team has been automatically notified and is working to resolve this issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">
                <p className="font-medium">Error Details (Development Only):</p>
                <p className="mt-1 font-mono text-xs">{error.message}</p>
                {error.digest && (
                  <p className="mt-1 text-xs">
                    <span className="font-medium">Digest:</span> {error.digest}
                  </p>
                )}
                {error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-red-600 hover:text-red-800">
                      Stack trace
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={reset}
              variant="default"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Go to Homepage
            </Button>
            <Button
              onClick={handleReportBug}
              variant="ghost"
              className="w-full"
            >
              <Bug className="mr-2 h-4 w-4" />
              Report Bug
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Error ID: {error.digest || 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 