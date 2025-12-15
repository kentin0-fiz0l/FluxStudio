/**
 * SyncStatusBar - Detailed sync status panel
 *
 * Shows detailed information about pending actions and sync state.
 * Can be expanded to show individual pending items.
 */

import * as React from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle,
  WifiOff,
} from 'lucide-react';
import { useSyncStatus, useOffline } from '@/store';
import { offlineStorage } from '@/services/offlineStorage';

interface SyncStatusBarProps {
  className?: string;
  collapsible?: boolean;
}

export function SyncStatusBar({ className = '', collapsible = true }: SyncStatusBarProps) {
  const { syncStatus, pendingCount, lastSyncedAt, isOnline, sync } = useSyncStatus();
  const offline = useOffline();

  const [isExpanded, setIsExpanded] = React.useState(false);
  const [pendingActions, setPendingActions] = React.useState<
    Array<{ id: string; type: string; timestamp: number; retryCount: number }>
  >([]);
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Load pending actions from IndexedDB
  React.useEffect(() => {
    const loadPendingActions = async () => {
      try {
        const actions = await offlineStorage.pendingActions.getAll();
        setPendingActions(actions);
      } catch (e) {
        console.error('Failed to load pending actions:', e);
      }
    };

    loadPendingActions();

    // Refresh on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadPendingActions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pendingCount]);

  const handleSync = async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      await sync();
      // Refresh pending actions list
      const actions = await offlineStorage.pendingActions.getAll();
      setPendingActions(actions);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearPending = async () => {
    if (!confirm('Are you sure you want to discard all pending changes?')) return;

    await offlineStorage.pendingActions.clear();
    offline.clearPending();
    setPendingActions([]);
  };

  const handleRemoveAction = async (id: string) => {
    await offlineStorage.pendingActions.remove(id);
    offline.removeAction(id);
    setPendingActions((prev) => prev.filter((a) => a.id !== id));
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-5 h-5 text-red-500" />;
    if (syncStatus === 'error') return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    if (syncStatus === 'syncing' || isSyncing)
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    if (syncStatus === 'pending') return <Cloud className="w-5 h-5 text-yellow-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus === 'error') return 'Sync Failed';
    if (syncStatus === 'syncing' || isSyncing) return 'Syncing...';
    if (syncStatus === 'pending') return `${pendingCount} Pending`;
    return 'All Synced';
  };

  return (
    <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 ${
          collapsible ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50' : ''
        }`}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{getStatusText()}</div>
            {lastSyncedAt && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last synced: {formatTimestamp(new Date(lastSyncedAt).getTime())}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOnline && pendingCount > 0 && !isSyncing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSync();
              }}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync Now
            </button>
          )}
          {collapsible && (
            <button className="p-1 text-gray-400 hover:text-gray-600">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {pendingActions.length > 0 ? (
            <>
              <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700/50 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {pendingActions.length} pending change{pendingActions.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleClearPending}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All
                </button>
              </div>
              <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                {pendingActions.map((action) => (
                  <li
                    key={action.id}
                    className="px-4 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {action.type}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimestamp(action.timestamp)}
                          {action.retryCount > 0 && (
                            <span className="ml-2 text-orange-500">
                              ({action.retryCount} retries)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAction(action.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <CloudOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No pending changes</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SyncStatusBar;
