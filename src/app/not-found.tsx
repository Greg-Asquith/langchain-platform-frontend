// src/app/not-found.tsx

"use client";

import React from 'react';
import Link from 'next/link';
import { Home, ArrowLeft, FileQuestion, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFoundPage() {

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <FileQuestion className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Page Not Found
          </CardTitle>
          <CardDescription className="text-gray-600">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. The page may have been moved, deleted, or you may have entered the wrong URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Helpful Links */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Try one of these links:
            </p>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Homepage
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={goBack}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/admin/teams">
                  <Compass className="mr-2 h-4 w-4" />
                  Browse Teams
                </Link>
              </Button>
            </div>
          </div>

          {/* Common Issues */}
          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Common reasons for this error:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• The page URL was typed incorrectly</li>
              <li>• The page has been moved or deleted</li>
              <li>• You don&apos;t have permission to access this page</li>
              <li>• The link you followed is broken or outdated</li>
            </ul>
          </div>

          {/* Contact Support */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              Still need help?{' '}
              <a
                href="mailto:support@example.com"
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                Contact Support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 