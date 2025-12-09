'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const [hasLocalData, setHasLocalData] = useState(false);

  useEffect(() => {
    // Check if there's existing localStorage data to migrate
    if (typeof window !== 'undefined') {
      const songs = localStorage.getItem('metmap-songs');
      setHasLocalData(!!songs && songs !== '[]');
    }
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-hw-charcoal flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-hw-brass border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-hw-charcoal flex flex-col items-center justify-center px-4 py-12">
        <p className="text-gray-400 mb-4">You need to be signed in to view this page.</p>
        <Link
          href="/auth/login"
          className="px-4 py-2 bg-hw-brass hover:bg-hw-brass/90 text-hw-charcoal font-medium rounded-lg shadow-pad"
        >
          Sign in
        </Link>
      </div>
    );
  }

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

      <div className="bg-hw-surface rounded-2xl overflow-hidden shadow-xl max-w-md w-full text-center">
        <div className="h-1.5 bg-gradient-to-r from-hw-brass via-hw-peach to-hw-brass" />
        <div className="p-8">
        <div className="bg-green-500/10 p-4 rounded-full inline-flex mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Welcome{session.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-gray-400 mb-6">
          Your account is set up. You can now save songs and track your practice progress.
        </p>

        {hasLocalData && (
          <div className="bg-hw-brass/10 border border-hw-brass/20 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-medium text-hw-brass mb-1">
              Local data found
            </h2>
            <p className="text-xs text-gray-400">
              You have practice data saved on this device. Use the sync button to save it to your account.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-hw-brass hover:bg-hw-brass/90 text-hw-charcoal font-medium rounded-lg transition-all shadow-pad active:shadow-pad-active"
          >
            Start practicing
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}
