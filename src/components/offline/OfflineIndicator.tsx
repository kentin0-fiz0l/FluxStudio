/**
 * OfflineIndicator - Visual indicator for network status
 *
 * Shows current network status and sync state.
 * Displays pending actions count when offline.
 */

import * as React from 'react';
import { WifiOff, Cloud, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { useSyncStatus } from '@/store';

interface OfflineIndicatorProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'badge' | 'bar' | 'minimal';
}

export function OfflineIndicator({
  className = '',
  showLabel = true,
  variant = 'badge',
}: OfflineIndicatorProps) {
  const {
    syncStatus,
    pendingCount,
    isOnline,
    isSynced,
    sync,
  } = useSyncStatus();

  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    if (isRetrying || !isOnline) return;

    setIsRetrying(true);
    try {
      await sync();
    } finally {
      setIsRetrying(false);
    }
  };

  // Don't show anything if online and synced (minimal variant)
  if (variant === 'minimal' && isOnline && isSynced) {
    return null;
  }

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (syncStatus === 'error') return 'bg-orange-500';
    if (syncStatus === 'syncing') return 'bg-blue-500';
    if (syncStatus === 'pending') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" aria-hidden="true" />;
    if (syncStatus === 'error') return <AlertCircle className="w-4 h-4" aria-hidden="true" />;
    if (syncStatus === 'syncing') return <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />;
    if (syncStatus === 'pending') return <Cloud className="w-4 h-4" aria-hidden="true" />;
    return <Check className="w-4 h-4" aria-hidden="true" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus === 'error') return 'Sync Error';
    if (syncStatus === 'syncing') return 'Syncing...';
    if (syncStatus === 'pending') return `${pendingCount} pending`;
    return 'Synced';
  };

  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          isOnline
            ? syncStatus === 'error'
              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
              : syncStatus === 'pending' || syncStatus === 'syncing'
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'bg-green-500/10 text-green-600 dark:text-green-400'
            : 'bg-red-500/10 text-red-600 dark:text-red-400'
        } ${className}`}
      >
        {getStatusIcon()}
        {showLabel && <span>{getStatusText()}</span>}
        {pendingCount > 0 && isOnline && syncStatus !== 'syncing' && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="ml-1 p-0.5 rounded hover:bg-white/20 transition-colors"
            title="Retry sync"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'bar') {
    if (isOnline && isSynced) return null;

    return (
      <div
        className={`flex items-center justify-between px-4 py-2 text-sm ${
          isOnline
            ? syncStatus === 'error'
              ? 'bg-orange-500 text-white'
              : 'bg-blue-500 text-white'
            : 'bg-red-500 text-white'
        } ${className}`}
      >
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span>
            {!isOnline
              ? "You're offline. Changes will sync when connected."
              : syncStatus === 'error'
              ? 'Failed to sync some changes.'
              : `Syncing ${pendingCount} pending changes...`}
          </span>
        </div>
        {isOnline && syncStatus !== 'syncing' && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-3 py-1 bg-white/20 rounded hover:bg-white/30 transition-colors flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  // Minimal variant - just a dot
  return (
    <div
      className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} ${
        syncStatus === 'syncing' ? 'animate-pulse' : ''
      } ${className}`}
      title={getStatusText()}
    />
  );
}

export default OfflineIndicator;
