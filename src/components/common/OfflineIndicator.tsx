/**
 * OfflineIndicator - Shows connection state and pending sync count.
 *
 * Renders as a small inline badge when offline, syncing, or error.
 * Hidden when online and fully synced.
 */

import { useSyncStatus } from '@/store';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

export function OfflineIndicator() {
  const { networkStatus, syncStatus, pendingCount, isOnline, sync } = useSyncStatus();

  // Fully online and synced — nothing to show
  if (isOnline && syncStatus === 'synced') return null;

  const isOffline = networkStatus === 'offline';
  const isSyncing = syncStatus === 'syncing';
  const isError = syncStatus === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        isOffline
          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          : isError
            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
            : isSyncing
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>Offline</span>
          {pendingCount > 0 && (
            <span className="ml-1 tabular-nums">
              ({pendingCount} pending)
            </span>
          )}
        </>
      ) : isError ? (
        <>
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Sync failed</span>
          <button
            onClick={() => sync()}
            className="ml-1 underline underline-offset-2 hover:text-red-300"
          >
            Retry
          </button>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Syncing{pendingCount > 0 ? ` ${pendingCount}` : ''}...</span>
        </>
      ) : (
        <>
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{pendingCount} pending</span>
          <button
            onClick={() => sync()}
            className="ml-1 underline underline-offset-2 hover:text-orange-300"
          >
            Sync now
          </button>
        </>
      )}
    </div>
  );
}
