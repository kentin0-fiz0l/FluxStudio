/**
 * OfflineIndicator - Shows connection state and pending sync count.
 *
 * Renders as a small banner when offline or syncing.
 * Hidden when online and fully synced.
 */

import { useSyncStatus } from '@/store';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function OfflineIndicator() {
  const { networkStatus, syncStatus, pendingCount, isOnline, sync } = useSyncStatus();

  // Fully online and synced — nothing to show
  if (isOnline && syncStatus === 'synced') return null;

  const isOffline = networkStatus === 'offline';
  const isSyncing = syncStatus === 'syncing';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        isOffline
          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
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
      ) : isSyncing ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Syncing{pendingCount > 0 ? ` ${pendingCount} items` : ''}...</span>
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5" />
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
