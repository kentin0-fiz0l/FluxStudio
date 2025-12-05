'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Music, CheckCircle2, ArrowRight } from 'lucide-react';
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-metmap-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
        <p className="text-gray-400 mb-4">You need to be signed in to view this page.</p>
        <Link
          href="/auth/login"
          className="px-4 py-2 bg-metmap-500 hover:bg-metmap-600 text-white rounded-lg"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Music className="w-8 h-8 text-metmap-500" />
        <span className="text-2xl font-bold text-white">MetMap</span>
      </Link>

      <div className="bg-gray-900 rounded-2xl p-8 shadow-xl max-w-md w-full text-center">
        <div className="bg-green-500/10 p-4 rounded-full inline-flex mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Welcome{session.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-gray-400 mb-6">
          Your account is set up. Your practice data will now sync across all your devices.
        </p>

        {hasLocalData && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-medium text-blue-400 mb-1">
              Existing data found
            </h2>
            <p className="text-xs text-gray-400">
              We found practice data on this device. It will be synced to your account automatically.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-metmap-500 hover:bg-metmap-600 text-white font-medium rounded-lg transition-colors"
          >
            Start practicing
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
