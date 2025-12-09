'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Music, AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'Access was denied. You may not have permission to sign in.',
    Verification: 'The verification link may have expired or already been used.',
    OAuthSignin: 'Error starting the sign in process.',
    OAuthCallback: 'Error completing the sign in process.',
    OAuthCreateAccount: 'Could not create account with this provider.',
    EmailCreateAccount: 'Could not create account with this email.',
    Callback: 'Error during the authentication callback.',
    OAuthAccountNotLinked: 'This email is already associated with another account.',
    EmailSignin: 'Error sending the sign in email.',
    CredentialsSignin: 'Invalid email or password.',
    SessionRequired: 'You must be signed in to access this page.',
    Default: 'An error occurred during authentication.',
  };

  const message = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <>
      <div className="bg-red-500/10 p-4 rounded-full mb-6">
        <AlertCircle className="w-12 h-12 text-red-500" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Authentication Error</h1>
      <p className="text-gray-400 text-center mb-8 max-w-sm">{message}</p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/auth/login"
          className="w-full py-3 px-4 bg-metmap-500 hover:bg-metmap-600 text-white font-medium rounded-lg text-center transition-colors"
        >
          Try again
        </Link>
        <Link
          href="/"
          className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg text-center transition-colors"
        >
          Go home
        </Link>
      </div>
    </>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Music className="w-8 h-8 text-metmap-500" />
        <span className="text-2xl font-bold text-white">MetMap</span>
      </Link>

      <div className="bg-gray-900 rounded-2xl p-8 shadow-xl flex flex-col items-center">
        <Suspense fallback={<div className="animate-pulse h-40 w-full bg-gray-800 rounded" />}>
          <ErrorContent />
        </Suspense>
      </div>
    </div>
  );
}
