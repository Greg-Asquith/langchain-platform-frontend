import { getSignUpUrl } from '@workos-inc/authkit-nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';

export default async function SignUpPage() {
  const signUpUrl = await getSignUpUrl();

  const handleSignUp = async () => {
    'use server';
    redirect(signUpUrl);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Get started with your free account today
          </p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-center">
              Sign Up
            </CardTitle>
            <CardDescription className="text-center">
              Create your account securely with WorkOS AuthKit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={handleSignUp}>
              <Button type="submit" className="w-full" size="lg">
                Continue to Sign Up
              </Button>
            </form>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Powered by WorkOS AuthKit for secure authentication
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <a
              href="/sign-in"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 