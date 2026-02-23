/**
 * WebSocketStatus Component
 * Phase 3A: WebSocket Real-Time Updates
 *
 * Displays the real-time WebSocket connection status with visual indicators.
 * Shows connection state, errors, and reconnection attempts.
 *
 * Features:
 * - Visual status indicator (green/yellow/red dot)
 * - Connection state text
 * - Tooltip with detailed information
 * - Reconnection attempt counter
 * - Error message display
 */

import React from 'react';
import { Badge } from '../ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Activity, AlertTriangle, WifiOff, Wifi } from 'lucide-react';
import { WebSocketConnectionStatus } from '@/types/printing';
import { cn } from '@/lib/utils';

interface WebSocketStatusProps {
  status: WebSocketConnectionStatus;
  className?: string;
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({
  status,
  className = '',
}) => {
  /**
   * Determine status variant and icon
   */
  const getStatusInfo = () => {
    if (status.connected) {
      return {
        variant: 'success' as const,
        icon: <Activity className="h-3 w-3" aria-hidden="true" />,
        text: 'Real-Time',
        dotColor: 'bg-green-500',
        description: 'Connected to real-time updates. Receiving live printer data every 1-5 seconds.',
      };
    }

    if (status.connecting) {
      return {
        variant: 'warning' as const,
        icon: <Wifi className="h-3 w-3 animate-pulse" aria-hidden="true" />,
        text: 'Connecting...',
        dotColor: 'bg-yellow-500',
        description: 'Establishing WebSocket connection...',
      };
    }

    if (status.reconnectAttempts > 0) {
      return {
        variant: 'warning' as const,
        icon: <AlertTriangle className="h-3 w-3" aria-hidden="true" />,
        text: `Reconnecting (${status.reconnectAttempts})`,
        dotColor: 'bg-yellow-500 animate-pulse',
        description: `Connection lost. Attempting to reconnect... (Attempt ${status.reconnectAttempts})`,
      };
    }

    return {
      variant: 'secondary' as const,
      icon: <WifiOff className="h-3 w-3" aria-hidden="true" />,
      text: 'Polling Mode',
      dotColor: 'bg-gray-400',
      description: 'WebSocket disconnected. Using REST API polling (updates every 30-60 seconds).',
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('inline-flex items-center', className)}>
            <Badge variant={statusInfo.variant} className="cursor-help">
              <span className={cn('h-2 w-2 rounded-full mr-2', statusInfo.dotColor)} />
              {statusInfo.icon}
              <span className="ml-1.5 font-medium text-xs">{statusInfo.text}</span>
            </Badge>
          </div>
        </TooltipTrigger>

        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold text-sm">
              WebSocket Connection Status
            </p>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              {statusInfo.description}
            </p>

            {status.error && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                  Error:
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {status.error}
                </p>
              </div>
            )}

            {!status.connected && status.reconnectAttempts === 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Automatic reconnection is active. The system will switch back to real-time
                  updates when the connection is restored.
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default WebSocketStatus;
