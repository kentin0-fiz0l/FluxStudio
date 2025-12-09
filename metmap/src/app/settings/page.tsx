'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import {
  ArrowLeft,
  User,
  Cloud,
  Bell,
  Palette,
  HelpCircle,
  LogOut,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { useSync } from '@/hooks/useSync';
import { useMetMapStore } from '@/stores/useMetMapStore';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { sync, syncStatus, isAuthenticated, lastSyncedAt } = useSync();
  const clearAllData = useMetMapStore((state) => state.clearAllData);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const handleClearData = () => {
    if (
      confirm(
        'Are you sure you want to clear all local data? This cannot be undone. If you have synced data, you can restore it by signing in again.'
      )
    ) {
      clearAllData();
    }
  };

  return (
    <div className="min-h-screen bg-hw-charcoal">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-hw-charcoal/95 backdrop-blur-sm border-b border-hw-surface px-4 py-4">
        <div className="flex items-center gap-4 max-w-2xl mx-auto">
          <Link
            href="/"
            className="p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-hw-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Account Section */}
        <section>
          <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
            Account
          </h2>
          <div className="bg-hw-surface rounded-xl overflow-hidden divide-y divide-hw-charcoal">
            {status === 'loading' ? (
              <div className="p-4 animate-pulse">
                <div className="h-10 bg-gray-700 rounded" />
              </div>
            ) : isAuthenticated && session?.user ? (
              <>
                <Link
                  href="/settings/account"
                  className="flex items-center gap-4 p-4 hover:bg-hw-charcoal/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-hw-brass flex items-center justify-center shadow-knob overflow-hidden">
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <span className="text-hw-charcoal font-bold text-lg">
                        {(session.user.name || session.user.email || 'U')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {session.user.name || 'User'}
                    </p>
                    <p className="text-sm text-gray-400 truncate">
                      {session.user.email}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </Link>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-4 p-4 w-full text-left hover:bg-hw-charcoal/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="text-gray-300">Sign out</span>
                </button>
              </>
            ) : (
              <Link
                href="/auth/login?callbackUrl=/settings"
                className="flex items-center gap-4 p-4 hover:bg-hw-charcoal/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-hw-brass/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-hw-brass" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Sign in</p>
                  <p className="text-sm text-gray-400">
                    Sync your data across devices
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </Link>
            )}
          </div>
        </section>

        {/* Sync Section */}
        <section>
          <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
            Data
          </h2>
          <div className="bg-hw-surface rounded-xl overflow-hidden divide-y divide-hw-charcoal">
            <button
              onClick={sync}
              disabled={!isAuthenticated || syncStatus === 'syncing'}
              className="flex items-center gap-4 p-4 w-full text-left hover:bg-hw-charcoal/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                <Cloud
                  className={`w-5 h-5 ${
                    syncStatus === 'syncing'
                      ? 'text-hw-brass animate-pulse'
                      : 'text-gray-400'
                  }`}
                />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">
                  {syncStatus === 'syncing' ? 'Syncing...' : 'Sync now'}
                </p>
                <p className="text-sm text-gray-400">
                  {!isAuthenticated
                    ? 'Sign in to sync'
                    : lastSyncedAt
                    ? `Last synced: ${new Date(lastSyncedAt).toLocaleString()}`
                    : 'Not synced yet'}
                </p>
              </div>
            </button>

            <button
              onClick={handleClearData}
              className="flex items-center gap-4 p-4 w-full text-left hover:bg-hw-charcoal/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-hw-red/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-hw-red" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-hw-red">Clear local data</p>
                <p className="text-sm text-gray-400">
                  Remove all songs and practice history from this device
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* Preferences Section */}
        <section>
          <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
            Preferences
          </h2>
          <div className="bg-hw-surface rounded-xl overflow-hidden divide-y divide-hw-charcoal">
            <Link
              href="/settings/notifications"
              className="flex items-center gap-4 p-4 hover:bg-hw-charcoal/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Notifications</p>
                <p className="text-sm text-gray-400">Practice reminders</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </Link>

            <Link
              href="/settings/appearance"
              className="flex items-center gap-4 p-4 hover:bg-hw-charcoal/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                <Palette className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Appearance</p>
                <p className="text-sm text-gray-400">Theme and display</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </Link>
          </div>
        </section>

        {/* About Section */}
        <section>
          <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
            About
          </h2>
          <div className="bg-hw-surface rounded-xl overflow-hidden divide-y divide-hw-charcoal">
            <Link
              href="/settings/help"
              className="flex items-center gap-4 p-4 hover:bg-hw-charcoal/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Help & Feedback</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </Link>
          </div>

          <p className="text-center text-gray-500 text-xs mt-4">
            MetMap v1.0.0 - Part of Flux Studio
          </p>
        </section>
      </main>
    </div>
  );
}
