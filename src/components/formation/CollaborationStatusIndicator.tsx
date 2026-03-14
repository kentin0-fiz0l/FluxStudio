/**
 * CollaborationStatusIndicator — Connection status dot + offline banner
 *
 * Shows real-time collaboration connection state in the formation editor header:
 * - Green dot: connected and synced
 * - Yellow dot: connecting or syncing
 * - Red dot: disconnected
 *
 * Shows an "offline changes pending" banner when disconnected with queued updates.
 * Shows a toast notification when reconnection succeeds.
 */

import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, Users, AlertTriangle } from 'lucide-react';

interface CollaborationStatusProps {
  isConnected: boolean;
  isSyncing: boolean;
  hasPendingChanges: boolean;
  lastSyncedAt: Date | null;
  collaboratorCount: number;
  documentSizeBytes?: number;
}

const DOC_SIZE_WARNING_THRESHOLD = 5 * 1024 * 1024; // 5MB

export function CollaborationStatusIndicator({
  isConnected,
  isSyncing,
  hasPendingChanges,
  lastSyncedAt,
  collaboratorCount,
  documentSizeBytes,
}: CollaborationStatusProps) {
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);
  const [wasDisconnected, setWasDisconnected] = useState(false);
  const [showDocSizeWarning, setShowDocSizeWarning] = useState(false);

  // Track disconnect → reconnect transitions for toast
  useEffect(() => {
    if (!isConnected) {
      setWasDisconnected(true);
    } else if (wasDisconnected && isConnected) {
      setShowReconnectedToast(true);
      setWasDisconnected(false);
      const timer = setTimeout(() => setShowReconnectedToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, wasDisconnected]);

  // Document size monitoring
  useEffect(() => {
    if (documentSizeBytes && documentSizeBytes > DOC_SIZE_WARNING_THRESHOLD) {
      setShowDocSizeWarning(true);
    } else {
      setShowDocSizeWarning(false);
    }
  }, [documentSizeBytes]);

  // Status dot color
  const statusColor = !isConnected
    ? 'bg-red-500'
    : isSyncing
    ? 'bg-yellow-500 animate-pulse'
    : 'bg-green-500';

  const statusLabel = !isConnected
    ? 'Disconnected'
    : isSyncing
    ? 'Syncing...'
    : 'Connected';

  const formatTimeSince = useCallback((date: Date | null) => {
    if (!date) return '';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  }, []);

  return (
    <>
      {/* Connection Status Badge */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800" title={`${statusLabel}${lastSyncedAt ? ` | Last synced: ${formatTimeSince(lastSyncedAt)}` : ''}`}>
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          {isConnected ? (
            <Cloud className="w-3 h-3 text-neutral-500" aria-hidden="true" />
          ) : (
            <CloudOff className="w-3 h-3 text-red-500" aria-hidden="true" />
          )}
          {collaboratorCount > 0 && (
            <span className="flex items-center gap-0.5 text-neutral-500 dark:text-neutral-400">
              <Users className="w-3 h-3" aria-hidden="true" />
              {collaboratorCount}
            </span>
          )}
        </div>
      </div>

      {/* Offline Changes Pending Banner */}
      {!isConnected && hasPendingChanges && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-amber-500/90 text-white text-xs py-1.5 px-4 flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
          <span>You're offline. Changes will sync when reconnected.</span>
        </div>
      )}

      {/* Reconnection Success Toast */}
      {showReconnectedToast && (
        <div className="fixed top-4 right-4 z-[9999] bg-green-600 text-white text-sm py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 fade-in">
          <Wifi className="w-4 h-4" aria-hidden="true" />
          <span>Reconnected! Changes synced.</span>
        </div>
      )}

      {/* Document Size Warning */}
      {showDocSizeWarning && (
        <div className="fixed bottom-4 right-4 z-[9999] bg-amber-600 text-white text-sm py-2 px-4 rounded-lg shadow-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          <span>
            Large document ({documentSizeBytes ? `${(documentSizeBytes / 1024 / 1024).toFixed(1)}MB` : ''}).
            Performance may be affected.
          </span>
          <button
            onClick={() => setShowDocSizeWarning(false)}
            className="ml-2 text-white/70 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}

export default CollaborationStatusIndicator;
