import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import { MessagingProvider } from './contexts/MessagingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ActiveProjectProvider } from './contexts/ActiveProjectContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { SessionProvider } from './contexts/SessionProvider';
import { WorkingContextProvider } from './contexts/WorkingContext';
import { ConnectorsProvider } from './contexts/ConnectorsContext';
import { FilesProvider } from './contexts/FilesContext';
import { AssetsProvider } from './contexts/AssetsContext';
import { MetMapProvider } from './contexts/MetMapContext';
import { ToastContainer } from './components/notifications/ToastContainer';
import { ProjectContextBar } from './components/projects/ProjectContextBar';
import { MomentumCapture } from './components/momentum/MomentumCapture';
import { QuickActions, useQuickActions } from './components/pulse/QuickActions';
import ErrorBoundary, {
  FilesErrorBoundary,
  ToolsErrorBoundary,
  ProjectsErrorBoundary,
  MessagingErrorBoundary,
} from './components/error/ErrorBoundary';
import { performanceMonitoring } from './services/performanceMonitoring';
import { apiService } from './services/apiService';
import { lazyLoadWithRetry, DefaultLoadingFallback } from './utils/lazyLoad';
import { queryClient } from './lib/queryClient';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useTheme } from './hooks/useTheme';
import { CommandPalette, useCommandPalette } from './components/CommandPalette';

// Critical pages - loaded immediately (minimal for fast initial load)
import { SimpleHomePage } from './pages/SimpleHomePage';
import { Login } from './pages/Login';
import OAuthCallback from './pages/OAuthCallback';
import { useAuth } from './contexts/AuthContext';

// Large pages - lazy loaded for better initial bundle
const { Component: Settings } = lazyLoadWithRetry(() => import('./pages/Settings'));
const { Component: MessagesNew } = lazyLoadWithRetry(() => import('./pages/MessagesNew'));

// Tools page - uses DashboardLayout like other authenticated pages
const { Component: Tools } = lazyLoadWithRetry(() => import('./pages/Tools'));
const { Component: ToolsMetMap } = lazyLoadWithRetry(() => import('./pages/ToolsMetMap'));
const { Component: ToolsFiles } = lazyLoadWithRetry(() => import('./pages/ToolsFiles'));
const { Component: ToolsAssets } = lazyLoadWithRetry(() => import('./pages/ToolsAssets'));
const { Component: DesignBoardPage } = lazyLoadWithRetry(() => import('./pages/DesignBoardPage'));

// Lazy load non-critical pages and components
const { Component: Home } = lazyLoadWithRetry(() => import('./pages/Home'));
const { Component: Signup } = lazyLoadWithRetry(() => import('./pages/Signup'));
const { Component: SignupWizard } = lazyLoadWithRetry(() => import('./pages/SignupWizard'));
const { Component: EmailVerification } = lazyLoadWithRetry(() => import('./pages/EmailVerification'));
const { Component: WelcomeFlow } = lazyLoadWithRetry(() => import('./pages/WelcomeFlow'));
const { Component: AdaptiveDashboard } = lazyLoadWithRetry(() => import('./components/AdaptiveDashboard'));
const { Component: Connectors } = lazyLoadWithRetry(() => import('./pages/Connectors'));

// Legacy pages removed - redirects handle backwards compatibility
// These imports are no longer needed as legacy routes now redirect to new pages

// Redesigned pages (Flux Design Language)
const { Component: ProjectsNew } = lazyLoadWithRetry(() => import('./pages/ProjectsNew'));
const { Component: ProjectDetail } = lazyLoadWithRetry(() => import('./pages/ProjectDetail'));
const { Component: ProjectOverview } = lazyLoadWithRetry(() => import('./pages/ProjectOverview'));
const { Component: FileNew } = lazyLoadWithRetry(() => import('./pages/FileNew'));
const { Component: Assets } = lazyLoadWithRetry(() => import('./pages/Assets'));
const { Component: TeamNew } = lazyLoadWithRetry(() => import('./pages/TeamNew'));
const { Component: OrganizationNew } = lazyLoadWithRetry(() => import('./pages/OrganizationNew'));
const { Component: Profile } = lazyLoadWithRetry(() => import('./pages/Profile'));
const { Component: Notifications } = lazyLoadWithRetry(() => import('./pages/Notifications'));
const { Component: SearchResults } = lazyLoadWithRetry(() => import('./pages/SearchResults'));
const { Component: AdminDashboard } = lazyLoadWithRetry(() => import('./pages/admin/Dashboard'));
const { Component: AdminUsers } = lazyLoadWithRetry(() => import('./pages/admin/Users'));
const { Component: AdminAuditLogs } = lazyLoadWithRetry(() => import('./pages/admin/AuditLogs'));
const { Component: OrganizationDashboard } = lazyLoadWithRetry(() => import('./components/OrganizationDashboard'));
const { Component: TeamDashboard } = lazyLoadWithRetry(() => import('./components/TeamDashboard'));
const { Component: ProjectDashboard } = lazyLoadWithRetry(() => import('./components/ProjectDashboard'));
const { Component: CreateOrganization } = lazyLoadWithRetry(() => import('./pages/CreateOrganization'));

// Lazy load comprehensive platform components
const { Component: ClientOnboarding } = lazyLoadWithRetry(() => import('./components/onboarding/ClientOnboarding'));
// Future: Route components for advanced features - see docs/ROUTE_WRAPPERS.md for implementation guide

// FluxPrint Integration - 3D Printing Dashboard
const PrintingDashboard = React.lazy(() => import('./components/printing/PrintingDashboard'));

// Root redirect component - redirects authenticated users to Projects
function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <DefaultLoadingFallback />;
  }

  // If authenticated, redirect to Projects (the primary hub)
  if (user) {
    return <Navigate to="/projects" replace />;
  }

  // If not authenticated, show the landing page
  return <SimpleHomePage />;
}

// Global Quick Actions wrapper - provides keyboard shortcut handler
function GlobalQuickActions({ children }: { children: React.ReactNode }) {
  const quickActions = useQuickActions();
  return (
    <>
      {children}
      <QuickActions
        isOpen={quickActions.isOpen}
        onClose={quickActions.close}
      />
    </>
  );
}

// Authenticated app wrapper - contains all providers for authenticated routes
function AuthenticatedRoutes() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MessagingProvider>
          <NotificationProvider>
            <ActiveProjectProvider>
            <ProjectProvider>
            <SessionProvider>
            <WorkingContextProvider>
            <OrganizationProvider>
              <WorkspaceProvider>
                <ConnectorsProvider>
                  <FilesProvider>
                    <AssetsProvider>
                      <MetMapProvider>
                {/* Project Context Bar - shows when a project is focused */}
                <ProjectContextBar />
                {/* Work Momentum - passive context capture */}
                <MomentumCapture />
                {/* Global Quick Actions - Cmd/Ctrl+K to open */}
                <GlobalQuickActions>
                <Suspense fallback={<DefaultLoadingFallback />}>
                  <Routes>
                  {/* Root route - redirects based on auth state */}
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/login" element={<Login />} />

                  {/* Lazy-loaded auth pages */}
                  <Route path="/signup" element={<SignupWizard />} />
                  <Route path="/signup/classic" element={<Signup />} />
                  <Route path="/verify-email" element={<EmailVerification />} />
                  <Route path="/welcome" element={<WelcomeFlow />} />

                  {/* OAuth callback routes */}
                  <Route path="/auth/callback/google" element={<OAuthCallback provider="google" />} />
                  <Route path="/auth/callback/figma" element={<OAuthCallback provider="figma" />} />
                  <Route path="/auth/callback/slack" element={<OAuthCallback provider="slack" />} />
                  <Route path="/auth/callback/github" element={<OAuthCallback provider="github" />} />

                  {/* Redesigned Page Routes (Flux Design Language) - Protected with Error Boundaries */}
                  <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                  <Route path="/organization" element={<ProtectedRoute><OrganizationNew /></ProtectedRoute>} />
                  <Route path="/team" element={<ProtectedRoute><TeamNew /></ProtectedRoute>} />
                  <Route path="/file" element={<ProtectedRoute><FilesErrorBoundary><FileNew /></FilesErrorBoundary></ProtectedRoute>} />
                  <Route path="/assets" element={<ProtectedRoute><FilesErrorBoundary><Assets /></FilesErrorBoundary></ProtectedRoute>} />
                  <Route path="/projects" element={<ProtectedRoute><ProjectsErrorBoundary><ProjectsNew /></ProjectsErrorBoundary></ProtectedRoute>} />
                  <Route path="/projects/:projectId/overview" element={<ProtectedRoute><ProjectsErrorBoundary><ProjectOverview /></ProjectsErrorBoundary></ProtectedRoute>} />
                  <Route path="/projects/:id" element={<ProtectedRoute><ProjectsErrorBoundary><ProjectDetail /></ProjectsErrorBoundary></ProtectedRoute>} />
                  <Route path="/boards/:boardId" element={<ProtectedRoute><DesignBoardPage /></ProtectedRoute>} />
                  <Route path="/messages" element={<ProtectedRoute><MessagingErrorBoundary><MessagesNew /></MessagingErrorBoundary></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/search" element={<ProtectedRoute><SearchResults /></ProtectedRoute>} />
                  <Route path="/connectors" element={<ProtectedRoute><Connectors /></ProtectedRoute>} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
                  <Route path="/admin/audit" element={<ProtectedRoute><AdminAuditLogs /></ProtectedRoute>} />
                  <Route path="/tools" element={<ProtectedRoute><ToolsErrorBoundary><Tools /></ToolsErrorBoundary></ProtectedRoute>} />
                  <Route path="/tools/metmap" element={<ProtectedRoute><ToolsErrorBoundary><ToolsMetMap /></ToolsErrorBoundary></ProtectedRoute>} />
                  <Route path="/tools/files" element={<ProtectedRoute><ToolsErrorBoundary><ToolsFiles /></ToolsErrorBoundary></ProtectedRoute>} />
                  <Route path="/tools/assets" element={<ProtectedRoute><ToolsErrorBoundary><ToolsAssets /></ToolsErrorBoundary></ProtectedRoute>} />

                  {/* Legacy routes - redirecting to new pages */}
                  <Route path="/organization/legacy" element={<Navigate to="/organization" replace />} />
                  <Route path="/team/legacy" element={<Navigate to="/team" replace />} />
                  <Route path="/file/legacy" element={<Navigate to="/file" replace />} />
                  <Route path="/messages/legacy" element={<Navigate to="/messages" replace />} />

                  {/* Unified Dashboard - adapts to user role and context - Protected */}
                  <Route path="/dashboard" element={<ProtectedRoute><AdaptiveDashboard /></ProtectedRoute>} />
                  <Route path="/dashboard/unified" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
                  <Route path="/dashboard/client" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
                  <Route path="/dashboard/designer" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
                  <Route path="/dashboard/admin" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />

                  {/* Core Platform Features - Protected */}
                  <Route path="/onboarding" element={<ProtectedRoute><ClientOnboarding /></ProtectedRoute>} />
                  {/* Future routes: /dashboard/projects/:id/workflow, /review, /collaborate, /workspace */}

                  {/* Messaging redirect - consolidate to /messages */}
                  <Route path="/dashboard/messages" element={<Navigate to="/messages" replace />} />

                  {/* Organization Hierarchy Routes - Protected */}
                  <Route path="/dashboard/organizations" element={<ProtectedRoute><OrganizationDashboard /></ProtectedRoute>} />
                  <Route path="/dashboard/organizations/create" element={<ProtectedRoute><CreateOrganization /></ProtectedRoute>} />
                  <Route path="/dashboard/organization/:organizationId" element={<ProtectedRoute><OrganizationDashboard /></ProtectedRoute>} />
                  <Route path="/dashboard/organization/:organizationId/team/:teamId" element={<ProtectedRoute><TeamDashboard /></ProtectedRoute>} />
                  <Route path="/dashboard/organization/:organizationId/team/:teamId/project/:projectId" element={<ProtectedRoute><ProjectDashboard /></ProtectedRoute>} />
                  <Route path="/dashboard/organization/:organizationId/project/:projectId" element={<ProtectedRoute><ProjectDashboard /></ProtectedRoute>} />

                  {/* Direct access routes - Protected */}
                  <Route path="/dashboard/teams/:teamId" element={<ProtectedRoute><TeamDashboard /></ProtectedRoute>} />
                  <Route path="/dashboard/projects/:projectId" element={<ProtectedRoute><ProjectDashboard /></ProtectedRoute>} />

                  {/* FluxPrint Integration - 3D Printing - Protected */}
                  <Route path="/printing" element={<ProtectedRoute><PrintingDashboard /></ProtectedRoute>} />
                  <Route path="/dashboard/printing" element={<ProtectedRoute><PrintingDashboard /></ProtectedRoute>} />
                  </Routes>
                </Suspense>
                </GlobalQuickActions>
                {/* Global Toast Notifications */}
                <ToastContainer />
                      </MetMapProvider>
                    </AssetsProvider>
                  </FilesProvider>
                </ConnectorsProvider>
              </WorkspaceProvider>
            </OrganizationProvider>
            </WorkingContextProvider>
            </SessionProvider>
            </ProjectProvider>
          </ActiveProjectProvider>
          </NotificationProvider>
        </MessagingProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default function App() {
  // Initialize theme system (Light/Dark/Auto)
  useTheme();

  // Initialize command palette
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  // Initialize performance monitoring and CSRF token
  React.useEffect(() => {
    performanceMonitoring.trackFeatureUsage('app-start');

    // Initialize CSRF token for secure API requests
    apiService.initializeCsrfToken().catch((error) => {
      console.error('Failed to initialize CSRF token:', error);
    });

    // Track route changes
    const handleRouteChange = () => {
      const startTime = performance.now();
      setTimeout(() => {
        const loadTime = performance.now() - startTime;
        performanceMonitoring.trackRouteChange(window.location.pathname, loadTime);
      }, 0);
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <ThemeProvider>
            {/* Global Command Palette - accessible via ⌘K */}
            <CommandPalette
              open={commandPaletteOpen}
              onOpenChange={setCommandPaletteOpen}
              projects={[]}
            />
            <Routes>
              {/* All routes go through authenticated providers */}
              <Route path="/*" element={<AuthenticatedRoutes />} />
            </Routes>
          </ThemeProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}