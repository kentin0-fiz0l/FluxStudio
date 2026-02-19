/**
 * OfflineIndicator — slim banner shown when the app is offline or syncing
 *
 * States:
 * - Offline → amber banner with "You're offline" message
 * - Syncing → blue banner with pending action count
 * - Sync error → red banner with retry button
 * - Synced → auto-dismiss after 3 seconds
 */

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { useSyncStatus } from '../store/slices/offlineSlice';
import { cn } from '../lib/utils';

export function OfflineIndicator() {
  const { syncStatus, networkStatus, pendingCount, isOnline, isSynced, sync } =
    useSyncStatus();

  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show when offline, syncing, pending, or error
  useEffect(() => {
    if (!isOnline || syncStatus === 'syncing' || syncStatus === 'pending' || syncStatus === 'error') {
      setVisible(true);
      setDismissed(false);
    } else if (isSynced && visible && !dismissed) {
      // Auto-dismiss 3 seconds after returning to synced
      const timer = setTimeout(() => {
        setVisible(false);
        setDismissed(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, syncStatus, isSynced, visible, dismissed]);

  if (!visible) return null;

  const isOffline = !isOnline || networkStatus === 'offline';
  const isSyncError = syncStatus === 'error';
  const isSyncing = syncStatus === 'syncing';
  const justSynced = isSynced && visible;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-1.5 text-sm font-medium transition-all duration-300',
        isOffline && 'bg-amber-500/90 text-white',
        isSyncing && 'bg-blue-500/90 text-white',
        isSyncError && 'bg-red-500/90 text-white',
        justSynced && 'bg-emerald-500/90 text-white',
        !isOffline && !isSyncing && !isSyncError && !justSynced && 'bg-amber-500/90 text-white',
      )}
    >
      {isOffline && (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Changes will sync when you're back online.</span>
          {pendingCount > 0 && (
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {pendingCount} pending
            </span>
          )}
        </>
      )}

      {isSyncing && !isOffline && (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}...</span>
        </>
      )}

      {isSyncError && !isOffline && (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>Some changes failed to sync.</span>
          <button
            onClick={() => sync()}
            className="ml-2 rounded bg-white/20 px-2 py-0.5 text-xs font-semibold hover:bg-white/30 transition-colors"
          >
            Retry
          </button>
        </>
      )}

      {justSynced && !isOffline && !isSyncing && !isSyncError && (
        <>
          <Check className="h-4 w-4" />
          <span>All changes synced.</span>
        </>
      )}
    </div>
  );
}
