'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { OAuthButtons } from './OAuthButtons';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    error === 'CredentialsSignin' ? 'Invalid email or password' : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMessage('Invalid email or password');
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-hw-surface rounded-2xl shadow-xl overflow-hidden">
        {/* Brass accent strip */}
        <div className="h-1.5 bg-gradient-to-r from-hw-brass via-hw-peach to-hw-brass" />

        <div className="p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-gray-400 mb-6">Sign in to access your saved songs</p>

          {errorMessage && (
            <div className="mb-4 p-3 bg-hw-red/10 border border-hw-red/20 rounded-lg text-hw-red text-sm">
              {errorMessage}
            </div>
          )}

          <OAuthButtons callbackUrl={callbackUrl} />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-hw-surface text-gray-400">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-hw-charcoal border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-hw-brass focus:border-transparent transition-all"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-hw-charcoal border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-hw-brass focus:border-transparent transition-all"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-hw-brass hover:bg-hw-brass/90 text-hw-charcoal font-medium rounded-lg transition-all shadow-pad active:shadow-pad-active disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Don&apos;t have an account?{' '}
            <Link
              href={`/auth/signup${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
              className="text-hw-brass hover:text-hw-peach transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-gray-500 text-xs">
        You can also{' '}
        <Link href="/" className="text-gray-400 hover:text-gray-300 transition-colors">
          continue without an account
        </Link>
      </p>
    </div>
  );
}
