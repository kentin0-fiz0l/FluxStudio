/**
 * RootProviders Component
 * Organizes all React context providers into a clean hierarchy
 *
 * Provider layers (from outermost to innermost):
 * 1. CoreProviders - Query client, Theme, Auth (foundational)
 * 2. RealtimeProviders - Socket, Notifications (real-time communication)
 * 3. ProjectProviders - Active project, Project, Organization, Workspace (project context)
 * 4. DataProviders - Connectors, Files, Assets, MetMap (data management)
 *
 * Phase 3 refactoring: Consolidated from 16+ nested providers in App.tsx
 */

import React from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { SocketProvider } from '../../contexts/SocketContext';
import { MessagingProvider } from '../../contexts/MessagingContext';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { ActiveProjectProvider } from '../../contexts/ActiveProjectContext';
import { ProjectProvider } from '../../contexts/ProjectContext';
import { SessionProvider } from '../../contexts/SessionContext';
import { WorkingContextProvider } from '../../contexts/WorkingContext';
import { OrganizationProvider } from '../../contexts/OrganizationContext';
import { WorkspaceProvider } from '../../contexts/WorkspaceContext';
import { ConnectorsProvider } from '../../contexts/ConnectorsContext';
import { FilesProvider } from '../../contexts/FilesContext';
import { AssetsProvider } from '../../contexts/AssetsContext';
import { MetMapProvider } from '../../contexts/MetMapContext';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Core providers - foundational services
 * Auth must be at the top as most other providers depend on it
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
 * Depends on Auth for user context
 */
function RealtimeProviders({ children }: ProvidersProps) {
  return (
    <SocketProvider>
      <MessagingProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </MessagingProvider>
    </SocketProvider>
  );
}

/**
 * Project context providers - organization and project state
 * Depends on Auth and Realtime
 */
function ProjectProviders({ children }: ProvidersProps) {
  return (
    <ActiveProjectProvider>
      <ProjectProvider>
        <SessionProvider>
          <WorkingContextProvider>
            <OrganizationProvider>
              <WorkspaceProvider>
                {children}
              </WorkspaceProvider>
            </OrganizationProvider>
          </WorkingContextProvider>
        </SessionProvider>
      </ProjectProvider>
    </ActiveProjectProvider>
  );
}

/**
 * Data providers - files, assets, connectors
 * Depends on Project context for scoping
 */
function DataProviders({ children }: ProvidersProps) {
  return (
    <ConnectorsProvider>
      <FilesProvider>
        <AssetsProvider>
          <MetMapProvider>
            {children}
          </MetMapProvider>
        </AssetsProvider>
      </FilesProvider>
    </ConnectorsProvider>
  );
}

/**
 * RootProviders - combines all provider layers
 * Use this component to wrap your authenticated routes
 */
export function RootProviders({ children }: ProvidersProps) {
  return (
    <CoreProviders>
      <RealtimeProviders>
        <ProjectProviders>
          <DataProviders>
            {children}
          </DataProviders>
        </ProjectProviders>
      </RealtimeProviders>
    </CoreProviders>
  );
}

/**
 * AuthenticatedProviders - same as RootProviders but excludes Core
 * Use when Auth is already provided higher in the tree
 */
export function AuthenticatedProviders({ children }: ProvidersProps) {
  return (
    <RealtimeProviders>
      <ProjectProviders>
        <DataProviders>
          {children}
        </DataProviders>
      </ProjectProviders>
    </RealtimeProviders>
  );
}

// Export individual provider groups for selective use
export { CoreProviders, RealtimeProviders, ProjectProviders, DataProviders };
