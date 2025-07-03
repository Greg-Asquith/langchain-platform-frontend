// src/app/page.tsx

import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/session';

import { handleSignOut } from '@/lib/logout';

export default async function HomePage() {
  // Check if user is authenticated using our custom session management
  const { user } = await getSession();

  if (!user) {
    // User is not authenticated - redirect to sign-in page
    redirect('/sign-in');
  }

  // User is authenticated - show welcome message and sign out option
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Welcome back{user.firstName && `, ${user.firstName}`}!
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            You&apos;re successfully signed in to LangChain Platform
          </p>
        </div>
        
        <div className="mt-10 max-w-md mx-auto">
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email: <span className="font-normal">{user.email}</span>
                </p>
                {user.firstName && (
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    First Name: <span className="font-normal">{user.firstName}</span>
                  </p>
                )}
                {user.lastName && (
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Name: <span className="font-normal">{user.lastName}</span>
                  </p>
                )}
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  User ID: <span className="font-normal text-xs">{user.id}</span>
                </p>
              </div>
              
              <form action={handleSignOut}>
                <Button type="submit" variant="outline" className="w-full">
                  Sign Out
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
