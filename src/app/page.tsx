import Link from 'next/link';
import { withAuth, getSignInUrl, getSignUpUrl, signOut } from '@workos-inc/authkit-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function HomePage() {
  // Check if user is authenticated
  const { user } = await withAuth();

  if (!user) {
    // User is not authenticated - show sign-in/sign-up options
    const signInUrl = await getSignInUrl();
    const signUpUrl = await getSignUpUrl();

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Welcome to LangChain Platform
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Get started by signing in to your account or creating a new one
            </p>
          </div>
          
          <Card className="shadow-xl">
            <CardHeader className="text-center space-y-1">
              <CardTitle className="text-2xl">
                Get Started
              </CardTitle>
              <CardDescription>
                Choose an option below to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href={signInUrl}>
                  <Button variant="default" size="lg" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href={signUpUrl}>
                  <Button variant="outline" size="lg" className="w-full">
                    Sign Up
                  </Button>
                </Link>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Or visit our dedicated pages:{' '}
                  <Link href="/sign-in" className="text-blue-600 hover:text-blue-500">
                    Sign In
                  </Link>
                  {' | '}
                  <Link href="/sign-up" className="text-blue-600 hover:text-blue-500">
                    Sign Up
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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
            You're successfully signed in to LangChain Platform
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
              </div>
              
              <form action={async () => {
                'use server';
                await signOut();
              }}>
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
