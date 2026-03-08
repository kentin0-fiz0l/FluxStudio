/**
 * SyncStatusIndicator - Enhanced sync status display
 *
 * Shows network status, sync state, pending action count, last sync time,
 * conflict count, and a manual sync button. More informative than OfflineIndicator.
 */

import * as React from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Check,
  Clock,
} from 'lucide-react';
import { useSyncStatus, useOffline } from '@/store';
import { formatDistanceToNow } from 'date-fns';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';

interface SyncStatusIndicatorProps {
  className?: string;
}

export function SyncStatusIndicator({ className = '' }: SyncStatusIndicatorProps) {
  const { syncStatus, networkStatus, pendingCount, lastSyncedAt, isOnline, sync } =
    useSyncStatus();
  const { conflicts } = useOffline();

  const [isSyncing, setIsSyncing] = React.useState(false);
  const [showConflicts, setShowConflicts] = React.useState(false);

  const unresolvedCount = conflicts.filter((c) => !c.resolved).length;

  const handleSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    try {
      await sync();
    } finally {
      setIsSyncing(false);
    }
  };

  const getIcon = () => {
    if (!isOnline) return <CloudOff className="w-4 h-4" aria-hidden="true" />;
    if (syncStatus === 'syncing' || isSyncing)
      return <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />;
    if (syncStatus === 'error')
      return <AlertTriangle className="w-4 h-4" aria-hidden="true" />;
    if (syncStatus === 'pending')
      return <Cloud className="w-4 h-4" aria-hidden="true" />;
    return <Check className="w-4 h-4" aria-hidden="true" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus === 'syncing' || isSyncing) return 'Syncing...';
    if (syncStatus === 'error') return 'Sync error';
    if (syncStatus === 'pending') return 'Changes pending';
    return 'Synced';
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-600 dark:text-red-400';
    if (syncStatus === 'error') return 'text-orange-600 dark:text-orange-400';
    if (syncStatus === 'syncing' || isSyncing)
      return 'text-blue-600 dark:text-blue-400';
    if (syncStatus === 'pending') return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <>
      <div
        className={`inline-flex items-center gap-2 text-sm ${getStatusColor()} ${className}`}
      >
        {/* Status icon and text */}
        {getIcon()}
        <span className="font-medium">{getStatusText()}</span>

        {/* Pending count */}
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-xs font-medium">
            {pendingCount}
          </span>
        )}

        {/* Conflict count badge */}
        {unresolvedCount > 0 && (
          <button
            onClick={() => setShowConflicts(true)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 text-xs font-medium hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
          >
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            {unresolvedCount} conflict{unresolvedCount !== 1 ? 's' : ''}
          </button>
        )}

        {/* Last sync timestamp */}
        {lastSyncedAt && networkStatus === 'online' && syncStatus === 'synced' && (
          <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}
          </span>
        )}

        {/* Manual sync button */}
        {isOnline && pendingCount > 0 && syncStatus !== 'syncing' && !isSyncing && (
          <button
            onClick={handleSync}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Sync now"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Render the conflict dialog when triggered or when conflicts exist */}
      {(showConflicts || unresolvedCount > 0) && <ConflictResolutionDialog />}
    </>
  );
}

export default SyncStatusIndicator;
