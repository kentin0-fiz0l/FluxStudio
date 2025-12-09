import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import Link from 'next/link';

export const metadata = {
  title: 'Sign In - MetMap',
  description: 'Sign in to MetMap to sync your practice data across devices',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-hw-charcoal flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-lg bg-hw-brass flex items-center justify-center shadow-knob">
          <span className="text-hw-charcoal font-bold text-lg">M</span>
        </div>
        <span className="text-2xl font-bold text-white">
          <span className="text-hw-brass">Met</span>Map
        </span>
      </Link>

      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-hw-surface rounded-2xl overflow-hidden shadow-xl animate-pulse">
        <div className="h-1.5 bg-gray-700" />
        <div className="p-8">
          <div className="h-8 bg-gray-700 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-6" />
          <div className="space-y-3">
            <div className="h-12 bg-gray-700 rounded" />
            <div className="h-12 bg-gray-700 rounded" />
          </div>
          <div className="my-6 h-px bg-gray-700" />
          <div className="space-y-4">
            <div className="h-12 bg-gray-700 rounded" />
            <div className="h-12 bg-gray-700 rounded" />
            <div className="h-12 bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
