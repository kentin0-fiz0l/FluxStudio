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
import { ConnectorsProvider } from './contexts/ConnectorsContext';
import { FilesProvider } from './contexts/FilesContext';
import { AssetsProvider } from './contexts/AssetsContext';
import { MetMapProvider } from './contexts/MetMapContext';
import { ToastContainer } from './components/notifications/ToastContainer';
import ErrorBoundary from './components/error/ErrorBoundary';
import { performanceMonitoring } from './services/performanceMonitoring';
import { apiService } from './services/apiService';
import { lazyLoadWithRetry, DefaultLoadingFallback } from './utils/lazyLoad';
import { queryClient } from './lib/queryClient';

// Critical pages - loaded immediately
import { SimpleHomePage } from './pages/SimpleHomePage';
import { Login } from './pages/Login';
import Settings from './pages/Settings';
import { MessagesNew } from './pages/MessagesNew';
import OAuthCallback from './pages/OAuthCallback';
import { useAuth } from './contexts/AuthContext';

// Tools page - uses DashboardLayout like other authenticated pages
const { Component: Tools } = lazyLoadWithRetry(() => import('./pages/Tools'));
const { Component: ToolsMetMap } = lazyLoadWithRetry(() => import('./pages/ToolsMetMap'));

// Lazy load non-critical pages and components
const { Component: Home } = lazyLoadWithRetry(() => import('./pages/Home'));
const { Component: Signup } = lazyLoadWithRetry(() => import('./pages/Signup'));
const { Component: SignupWizard } = lazyLoadWithRetry(() => import('./pages/SignupWizard'));
const { Component: EmailVerification } = lazyLoadWithRetry(() => import('./pages/EmailVerification'));
const { Component: WelcomeFlow } = lazyLoadWithRetry(() => import('./pages/WelcomeFlow'));
const { Component: AdaptiveDashboard } = lazyLoadWithRetry(() => import('./components/AdaptiveDashboard'));
const { Component: Connectors } = lazyLoadWithRetry(() => import('./pages/Connectors'));

// Legacy pages (original design)
const { Component: MessagesPage } = lazyLoadWithRetry(() => import('./pages/MessagesPage'));
const { Component: OrganizationPage } = lazyLoadWithRetry(() => import('./pages/Organization'));
const { Component: TeamPage } = lazyLoadWithRetry(() => import('./pages/Team'));
const { Component: ProjectsOld } = lazyLoadWithRetry(() => import('./pages/Projects'));
const { Component: FilePage } = lazyLoadWithRetry(() => import('./pages/File'));

// Redesigned pages (Flux Design Language)
const { Component: ProjectsNew } = lazyLoadWithRetry(() => import('./pages/ProjectsNew'));
const { Component: ProjectDetail } = lazyLoadWithRetry(() => import('./pages/ProjectDetail'));
const { Component: FileNew } = lazyLoadWithRetry(() => import('./pages/FileNew'));
const { Component: Assets } = lazyLoadWithRetry(() => import('./pages/Assets'));
const { Component: TeamNew } = lazyLoadWithRetry(() => import('./pages/TeamNew'));
const { Component: OrganizationNew } = lazyLoadWithRetry(() => import('./pages/OrganizationNew'));
const { Component: Profile } = lazyLoadWithRetry(() => import('./pages/Profile'));
const { Component: Notifications } = lazyLoadWithRetry(() => import('./pages/Notifications'));
const { Component: OrganizationDashboard } = lazyLoadWithRetry(() => import('./components/OrganizationDashboard'));
const { Component: TeamDashboard } = lazyLoadWithRetry(() => import('./components/TeamDashboard'));
const { Component: ProjectDashboard } = lazyLoadWithRetry(() => import('./components/ProjectDashboard'));
const { Component: CreateOrganization } = lazyLoadWithRetry(() => import('./pages/CreateOrganization'));

// Lazy load comprehensive platform components
const { Component: ClientOnboarding } = lazyLoadWithRetry(() => import('./components/onboarding/ClientOnboarding'));
const { Component: ProjectWorkflow } = lazyLoadWithRetry(() => import('./components/project/ProjectWorkflow'));
const { Component: DesignReviewWorkflow } = lazyLoadWithRetry(() => import('./components/review/DesignReviewWorkflow'));
const { Component: PortfolioShowcase } = lazyLoadWithRetry(() => import('./components/portfolio/PortfolioShowcase'));
const { Component: BusinessDashboard } = lazyLoadWithRetry(() => import('./components/analytics/BusinessDashboard'));
const { Component: TeamManagement } = lazyLoadWithRetry(() => import('./components/team/TeamManagement'));
const { Component: RealTimeCollaboration } = lazyLoadWithRetry(() => import('./components/collaboration/RealTimeCollaboration'));
const { Component: WorkspaceManager } = lazyLoadWithRetry(() => import('./components/workspace/WorkspaceManager'));

// FluxPrint Integration - 3D Printing Dashboard
const PrintingDashboard = React.lazy(() => import('./components/printing/PrintingDashboard'));

// Root redirect component - redirects authenticated users to Projects
function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <DefaultLoadingFallback />;
  }

  // If authenticated, redirect to Projects (the primary hub)
  if (user) {
    return <Navigate to="/projects" replace />;
  }

  // If not authenticated, show the landing page
  return <SimpleHomePage />;
}

// Authenticated app wrapper - contains all providers for authenticated routes
function AuthenticatedRoutes() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MessagingProvider>
          <NotificationProvider>
            <OrganizationProvider>
              <WorkspaceProvider>
                <ConnectorsProvider>
                  <FilesProvider>
                    <AssetsProvider>
                      <MetMapProvider>
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

                  {/* Redesigned Page Routes (Flux Design Language) */}
                  <Route path="/home" element={<Home />} />
                  <Route path="/organization" element={<OrganizationNew />} />
                  <Route path="/team" element={<TeamNew />} />
                  <Route path="/file" element={<FileNew />} />
                  <Route path="/assets" element={<Assets />} />
                  <Route path="/projects" element={<ProjectsNew />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/messages" element={<MessagesNew />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/connectors" element={<Connectors />} />
                  <Route path="/tools" element={<Tools />} />
                  <Route path="/tools/metmap" element={<ToolsMetMap />} />

                  {/* Legacy routes for backward compatibility */}
                  <Route path="/organization/legacy" element={<OrganizationPage />} />
                  <Route path="/team/legacy" element={<TeamPage />} />
                  <Route path="/file/legacy" element={<FilePage />} />
                  <Route path="/messages/legacy" element={<MessagesPage />} />

                  {/* Unified Dashboard - adapts to user role and context */}
                  <Route path="/dashboard" element={<AdaptiveDashboard />} />
                  <Route path="/dashboard/unified" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard/client" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard/designer" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard/admin" element={<Navigate to="/dashboard" replace />} />

                  {/* Core Platform Features */}
                  <Route path="/onboarding" element={<ClientOnboarding />} />
                  <Route path="/dashboard/projects/:projectId/workflow" element={<ProjectWorkflow />} />
                  <Route path="/dashboard/projects/:projectId/review" element={<DesignReviewWorkflow />} />
                  <Route path="/dashboard/projects/:projectId/collaborate" element={<RealTimeCollaboration />} />
                  <Route path="/dashboard/projects/:projectId/workspace" element={<WorkspaceManager />} />
                  <Route path="/dashboard/portfolio" element={<PortfolioShowcase />} />
                  <Route path="/dashboard/analytics" element={<BusinessDashboard />} />
                  <Route path="/dashboard/team" element={<TeamManagement />} />

                  {/* Messaging with redesigned interface */}
                  <Route path="/dashboard/messages" element={<MessagesNew />} />

                  {/* Organization Hierarchy Routes */}
                  <Route path="/dashboard/organizations" element={<OrganizationDashboard />} />
                  <Route path="/dashboard/organizations/create" element={<CreateOrganization />} />
                  <Route path="/dashboard/organization/:organizationId" element={<OrganizationDashboard />} />
                  <Route path="/dashboard/organization/:organizationId/team/:teamId" element={<TeamDashboard />} />
                  <Route path="/dashboard/organization/:organizationId/team/:teamId/project/:projectId" element={<ProjectDashboard />} />
                  <Route path="/dashboard/organization/:organizationId/project/:projectId" element={<ProjectDashboard />} />

                  {/* Direct access routes */}
                  <Route path="/dashboard/teams/:teamId" element={<TeamDashboard />} />
                  <Route path="/dashboard/projects/:projectId" element={<ProjectDashboard />} />

                  {/* FluxPrint Integration - 3D Printing */}
                  <Route path="/printing" element={<PrintingDashboard />} />
                  <Route path="/dashboard/printing" element={<PrintingDashboard />} />
                  </Routes>
                </Suspense>
                {/* Global Toast Notifications */}
                <ToastContainer />
                      </MetMapProvider>
                    </AssetsProvider>
                  </FilesProvider>
                </ConnectorsProvider>
              </WorkspaceProvider>
            </OrganizationProvider>
          </NotificationProvider>
        </MessagingProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default function App() {
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