/**
 * ConnectionStatus — Thin banner showing collaboration connection state.
 *
 * Sprint 31: Reconnection resilience UI.
 * - Hidden when connected
 * - Yellow "Reconnecting..." during reconnection
 * - Red "Offline — changes saved locally" after extended failure
 */

import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import type { CollaborationStatus } from '../../services/metmapCollaboration';

interface ConnectionStatusProps {
  status: CollaborationStatus;
  reconnectAttempts: number;
  onRetry: () => void;
  className?: string;
}

export const ConnectionStatus = React.memo(function ConnectionStatus({
  status,
  reconnectAttempts,
  onRetry,
  className = '',
}: ConnectionStatusProps) {
  // Don't show when connected/synced
  if (status === 'synced') return null;
  if (status === 'disconnected' && reconnectAttempts === 0) return null;

  const isOffline = reconnectAttempts >= 10;
  const isReconnecting = status === 'connecting' || (status === 'disconnected' && reconnectAttempts > 0 && reconnectAttempts < 10);

  if (!isOffline && !isReconnecting) return null;

  return (
    <div
      className={`
        flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium
        transition-all duration-300
        ${isOffline
          ? 'bg-red-50 text-red-700 border-b border-red-200'
          : 'bg-amber-50 text-amber-700 border-b border-amber-200'
        }
        ${className}
      `}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Offline — changes saved locally</span>
          <button
            onClick={onRetry}
            className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 hover:bg-red-200 text-red-800 transition-colors"
          >
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
            Retry
          </button>
        </>
      ) : (
        <>
          <Wifi className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />
          <span>Reconnecting...</span>
        </>
      )}
    </div>
  );
});
