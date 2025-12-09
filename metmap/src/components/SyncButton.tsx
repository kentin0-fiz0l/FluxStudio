'use client';

import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useSync } from '@/hooks/useSync';
import Link from 'next/link';

interface SyncButtonProps {
  compact?: boolean;
}

export function SyncButton({ compact = false }: SyncButtonProps) {
  const { sync, syncStatus, isAuthenticated, isLoading, error } = useSync();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
        <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <Link
        href="/auth/login"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-hw-surface hover:bg-hw-surface/80 transition-colors ${
          compact ? 'text-sm' : ''
        }`}
        title="Sign in to sync your data"
      >
        <CloudOff className="w-4 h-4 text-gray-500" />
        {!compact && <span className="text-gray-400">Sign in to sync</span>}
      </Link>
    );
  }

  // Syncing state
  if (syncStatus === 'syncing') {
    return (
      <button
        disabled
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-hw-surface cursor-wait ${
          compact ? 'text-sm' : ''
        }`}
      >
        <RefreshCw className="w-4 h-4 animate-spin text-hw-brass" />
        {!compact && <span className="text-gray-400">Syncing...</span>}
      </button>
    );
  }

  // Error state
  if (syncStatus === 'error') {
    return (
      <button
        onClick={sync}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-hw-red/10 hover:bg-hw-red/20 transition-colors ${
          compact ? 'text-sm' : ''
        }`}
        title={error || 'Sync failed. Click to retry.'}
      >
        <AlertCircle className="w-4 h-4 text-hw-red" />
        {!compact && <span className="text-hw-red">Retry sync</span>}
      </button>
    );
  }

  // Success state (show briefly then return to idle)
  if (syncStatus === 'success') {
    return (
      <button
        onClick={sync}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors ${
          compact ? 'text-sm' : ''
        }`}
      >
        <Check className="w-4 h-4 text-green-500" />
        {!compact && <span className="text-green-500">Synced</span>}
      </button>
    );
  }

  // Idle state - ready to sync
  return (
    <button
      onClick={sync}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-hw-surface hover:bg-hw-brass/20 transition-colors ${
        compact ? 'text-sm' : ''
      }`}
      title="Sync your data to the cloud"
    >
      <Cloud className="w-4 h-4 text-hw-brass" />
      {!compact && <span className="text-gray-300">Sync</span>}
    </button>
  );
}

/**
 * Compact sync indicator for headers/nav
 */
export function SyncIndicator() {
  return <SyncButton compact />;
}
