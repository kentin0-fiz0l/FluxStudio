/**
 * RootProviders Component
 *
 * Streamlined provider hierarchy after Zustand migration.
 * Most state now lives in the Zustand store (slices/).
 *
 * Remaining providers:
 * 1. AuthProvider - manages auth side effects (token refresh, etc.)
 * 2. SocketProvider - singleton WebSocket connection (side-effect heavy)
 * 3. NotificationProvider - real-time notification listener
 * 4. MessagingSocketBridge - connects Socket.IO events to Zustand messaging slice
 * 5. SessionProvider - session tracking side effects
 * 6. OrganizationProvider - org sync side effects
 *
 * Removed (migrated to Zustand):
 * - WorkspaceProvider → uiSlice (workspace state)
 * - WorkingContextProvider → uiSlice (working context)
 * - ActiveProjectProvider → projectSlice
 * - ProjectProvider → projectSlice
 * - ConnectorsProvider → connectorSlice
 * - FilesProvider → assetSlice
 * - AssetsProvider → assetSlice
 * - MetMapProvider → kept as lazy-loaded context (tool-specific)
 */

import React from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import { SocketProvider } from '../../contexts/SocketContext';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { RealtimeNotifications } from '../notifications/RealtimeNotifications';
import { SessionProvider } from '../../contexts/SessionContext';
import { OrganizationProvider } from '../../contexts/OrganizationContext';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Core providers - foundational services
 */
function CoreProviders({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

/**
 * Realtime providers - socket connections and live updates
 */
function RealtimeProviders({ children }: ProvidersProps) {
  return (
    <SocketProvider>
      <NotificationProvider>
        <RealtimeNotifications enabled={true} soundEnabled={true} />
        {children}
      </NotificationProvider>
    </SocketProvider>
  );
}

/**
 * Session/Org providers - still need side effects from these
 */
function SessionProviders({ children }: ProvidersProps) {
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
