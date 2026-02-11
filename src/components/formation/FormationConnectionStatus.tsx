/**
 * FormationConnectionStatus Component
 *
 * Displays the real-time collaboration connection status on the formation canvas.
 * Shows connected/disconnected state with visual indicators and optional
 * collaborator count.
 *
 * UX Spec:
 * - Green dot + "Connected" when online
 * - Red dot + "Disconnected" when offline (with reconnection hint)
 * - Yellow dot + "Syncing..." during initial sync
 * - Shows number of active collaborators when > 0
 */

import { useMemo } from 'react';
import { Wifi, WifiOff, Loader2, Users } from 'lucide-react';

export interface FormationConnectionStatusProps {
  /** Is connected to collaboration server */
  isConnected: boolean;
  /** Is syncing initial state */
  isSyncing: boolean;
  /** Connection error message if any */
  error: string | null;
  /** Number of other collaborators in the session */
  collaboratorCount?: number;
  /** Optional class name */
  className?: string;
}

export function FormationConnectionStatus({
  isConnected,
  isSyncing,
  error,
  collaboratorCount = 0,
  className = '',
}: FormationConnectionStatusProps) {
  // Determine status state
  const status = useMemo(() => {
    if (error) {
      return {
        color: 'bg-red-500',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: WifiOff,
        label: 'Disconnected',
        description: 'Reconnecting...',
      };
    }
    if (isSyncing) {
      return {
        color: 'bg-yellow-500',
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: Loader2,
        label: 'Syncing',
        description: 'Loading document...',
        animate: true,
      };
    }
    if (isConnected) {
      return {
        color: 'bg-green-500',
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: Wifi,
        label: 'Connected',
        description: collaboratorCount > 0
          ? `${collaboratorCount} collaborator${collaboratorCount !== 1 ? 's' : ''} online`
          : 'Real-time collaboration active',
      };
    }
    return {
      color: 'bg-gray-400',
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: WifiOff,
      label: 'Offline',
      description: 'Working locally',
    };
  }, [isConnected, isSyncing, error, collaboratorCount]);

  const StatusIcon = status.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${status.bgColor} ${status.borderColor} ${status.textColor} shadow-sm ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Status dot with pulse animation when connected */}
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${status.color} ${isConnected && !isSyncing && !error ? 'animate-ping' : ''}`}
        />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${status.color}`} />
      </span>

      {/* Status icon */}
      <StatusIcon
        className={`h-3.5 w-3.5 ${status.animate ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />

      {/* Status label */}
      <span>{status.label}</span>

      {/* Collaborator count badge */}
      {isConnected && !isSyncing && collaboratorCount > 0 && (
        <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full bg-white/50 text-[10px]">
          <Users className="h-3 w-3" aria-hidden="true" />
          <span>{collaboratorCount}</span>
        </span>
      )}

      {/* Screen reader description */}
      <span className="sr-only">{status.description}</span>
    </div>
  );
}

/**
 * Minimal connection indicator (just a dot)
 * For use in tight spaces or when full status is not needed
 */
export function FormationConnectionDot({
  isConnected,
  isSyncing,
  error,
  className = '',
}: Pick<FormationConnectionStatusProps, 'isConnected' | 'isSyncing' | 'error' | 'className'>) {
  const color = useMemo(() => {
    if (error) return 'bg-red-500';
    if (isSyncing) return 'bg-yellow-500';
    if (isConnected) return 'bg-green-500';
    return 'bg-gray-400';
  }, [isConnected, isSyncing, error]);

  const label = useMemo(() => {
    if (error) return 'Disconnected';
    if (isSyncing) return 'Syncing';
    if (isConnected) return 'Connected';
    return 'Offline';
  }, [isConnected, isSyncing, error]);

  return (
    <span
      className={`relative inline-flex h-3 w-3 ${className}`}
      role="status"
      aria-label={label}
      title={label}
    >
      {isConnected && !isSyncing && !error && (
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${color} animate-ping`} />
      )}
      <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`} />
    </span>
  );
}

export default FormationConnectionStatus;
