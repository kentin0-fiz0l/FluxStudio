/**
 * RootProviders Component
 *
 * Streamlined provider hierarchy after Zustand migration.
 * Most state now lives in the Zustand store (slices/).
 *
 * Remaining providers:
 * 1. AuthProvider (useAuthInit hook) - manages auth side effects
 * 2. SocketProvider - singleton WebSocket connection (side-effect heavy)
 * 3. NotificationInit (useNotificationInit hook) - real-time notification listener
 * 4. MessagingSocketBridge - connects Socket.IO events to Zustand messaging slice
 * 5. SessionProvider - session tracking side effects
 * 6. OrganizationProvider - org sync side effects
 *
 * Removed (migrated to Zustand):
 * - WorkspaceProvider → uiSlice
 * - WorkingContextProvider → uiSlice
 * - ActiveProjectProvider → projectSlice
 * - ProjectProvider → projectSlice
 * - ConnectorsProvider → connectorSlice
 * - FilesProvider → assetSlice
 * - AssetsProvider → assetSlice
 * - NotificationProvider → notificationSlice (useNotificationInit)
 * - MetMapProvider → kept as lazy-loaded context (tool-specific)
 */

import React from 'react';
import { SocketProvider } from '../../contexts/SocketContext';
import { RealtimeNotifications } from '../notifications/RealtimeNotifications';
import { MessagingSocketBridge } from '../../contexts/MessagingContext';
import { SessionProvider } from '../../contexts/SessionContext';
import { OrganizationProvider } from '../../contexts/OrganizationContext';
import { useAuth, useAuthInit } from '@/store/slices/authSlice';
import { useNotificationInit } from '@/store/slices/notificationSlice';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Core providers - foundational services
 * Auth initialization now handled by useAuthInit() hook (replaces AuthProvider).
 */
function CoreProviders({ children }: ProvidersProps) {
  useAuthInit();
  return <>{children}</>;
}

/**
 * Realtime providers - socket connections and live updates
 * Skips initialization for unauthenticated users to avoid unnecessary overhead.
 */
function RealtimeProviders({ children }: ProvidersProps) {
  const { isAuthenticated } = useAuth();
  useNotificationInit();

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <SocketProvider>
      <RealtimeNotifications enabled={true} soundEnabled={true} />
      <MessagingSocketBridge />
      {children}
    </SocketProvider>
  );
}

/**
 * Session/Org providers - still need side effects from these
 * Skips initialization for unauthenticated users.
 */
function SessionProviders({ children }: ProvidersProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <SessionProvider>
      <OrganizationProvider>
        {children}
      </OrganizationProvider>
    </SessionProvider>
  );
}

/**
 * RootProviders - combines all provider layers
 */
export function RootProviders({ children }: ProvidersProps) {
  return (
    <CoreProviders>
      <RealtimeProviders>
        <SessionProviders>
          {children}
        </SessionProviders>
      </RealtimeProviders>
    </CoreProviders>
  );
}

/**
 * AuthenticatedProviders - same as RootProviders but excludes Core
 */
export function AuthenticatedProviders({ children }: ProvidersProps) {
  return (
    <RealtimeProviders>
      <SessionProviders>
        {children}
      </SessionProviders>
    </RealtimeProviders>
  );
}

export { CoreProviders, RealtimeProviders, SessionProviders };
