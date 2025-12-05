import { Suspense } from 'react';
import { SignupForm } from '@/components/auth/SignupForm';
import Link from 'next/link';
import { Music } from 'lucide-react';

export const metadata = {
  title: 'Create Account - MetMap',
  description: 'Create a MetMap account to sync your practice data across devices',
};

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Music className="w-8 h-8 text-metmap-500" />
        <span className="text-2xl font-bold text-white">MetMap</span>
      </Link>

      <Suspense fallback={<SignupFormSkeleton />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}

function SignupFormSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-gray-900 rounded-2xl p-8 shadow-xl animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-2/3 mb-2" />
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
          <div className="h-12 bg-gray-700 rounded" />
          <div className="h-12 bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}
