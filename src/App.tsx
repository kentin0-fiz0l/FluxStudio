import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ThemeProvider } from './contexts/ThemeContext';
import { RootProviders } from './components/providers';
import { ToastContainer } from './components/notifications/ToastContainer';
import { UpdateBanner } from './components/common/UpdateBanner';
import { ProjectContextBar } from './components/projects/ProjectContextBar';
import { MomentumCapture } from './components/momentum/MomentumCapture';
import { QuickActions, useQuickActions } from './components/pulse/QuickActions';
import ErrorBoundary, {
  ToolsErrorBoundary,
  ProjectsErrorBoundary,
  MessagingErrorBoundary,
} from './components/error/ErrorBoundary';
import { performanceMonitoring } from './services/performanceMonitoring';
import { apiService } from './services/apiService';
import { logger } from './lib/logger';
import { lazyLoadWithRetry, DefaultLoadingFallback } from './utils/lazyLoad';
import { queryClient } from './lib/queryClient';
import { queryPersister } from './lib/queryPersister';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useTheme } from './hooks/useTheme';
import { CommandPalette, useCommandPalette } from './components/CommandPalette';

import { useAuth, AuthProvider } from './contexts/AuthContext';

// All pages lazy loaded for smaller initial bundle
// SimpleHomePage kept as backup -- replaced by LandingPage
// const { Component: SimpleHomePage } = lazyLoadWithRetry(
//   () => import('./pages/SimpleHomePage').then(m => ({ default: m.SimpleHomePage })) as Promise<{ default: React.ComponentType<Record<string, unknown>> }>
// );

// Landing page - synthesized from best sections of 3 design variants
const LandingPage = React.lazy(() => import('./pages/landing/LandingPage'));

const { Component: Login } = lazyLoadWithRetry(
  () => import('./pages/Login').then(m => ({ default: m.Login })) as Promise<{ default: React.ComponentType<Record<string, unknown>> }>
);
const { Component: OAuthCallback } = lazyLoadWithRetry(
  () => import('./pages/OAuthCallback') as unknown as Promise<{ default: React.ComponentType<Record<string, unknown>> }>
);

// Large pages - lazy loaded for better initial bundle
const { Component: Settings } = lazyLoadWithRetry(() => import('./pages/Settings'));
const { Component: MessagesNew } = lazyLoadWithRetry(() => import('./pages/MessagesNew'));

// Tools page - uses DashboardLayout like other authenticated pages
const { Component: Tools } = lazyLoadWithRetry(() => import('./pages/Tools'));
const { Component: ToolsMetMap } = lazyLoadWithRetry(() => import('./pages/ToolsMetMap'));
const { Component: DesignBoardPage } = lazyLoadWithRetry(() => import('./pages/DesignBoardPage'));

// Lazy load non-critical pages and components
const { Component: Signup } = lazyLoadWithRetry(() => import('./pages/Signup'));
const { Component: SignupWizard } = lazyLoadWithRetry(() => import('./pages/SignupWizard'));
const { Component: EmailVerification } = lazyLoadWithRetry(() => import('./pages/EmailVerification'));
const { Component: ForgotPassword } = lazyLoadWithRetry(() => import('./pages/ForgotPassword'));
const { Component: ResetPassword } = lazyLoadWithRetry(() => import('./pages/ResetPassword'));
const { Component: Checkout } = lazyLoadWithRetry(() => import('./pages/Checkout'));
const { Component: CheckoutSuccess } = lazyLoadWithRetry(() => import('./pages/CheckoutSuccess'));
const { Component: Billing } = lazyLoadWithRetry(() => import('./pages/Billing'));
const { Component: Pricing } = lazyLoadWithRetry(() => import('./pages/Pricing'));
const { Component: WelcomeFlow } = lazyLoadWithRetry(() => import('./pages/WelcomeFlow'));
const { Component: AdaptiveDashboard } = lazyLoadWithRetry(() => import('./components/AdaptiveDashboard'));
const { Component: Connectors } = lazyLoadWithRetry(() => import('./pages/Connectors'));
const { Component: PluginManagerPage } = lazyLoadWithRetry(() => import('./pages/PluginManagerPage'));

// Legacy pages removed - redirects handle backwards compatibility
// These imports are no longer needed as legacy routes now redirect to new pages

// Redesigned pages (Flux Design Language)
const { Component: FormationEditor } = lazyLoadWithRetry(() => import('./pages/FormationEditor'));
const { Component: ProjectsHub } = lazyLoadWithRetry(() => import('./pages/ProjectsHub'));
const { Component: ProjectDetail } = lazyLoadWithRetry(() => import('./pages/ProjectDetail'));
const { Component: ProjectOverview } = lazyLoadWithRetry(() => import('./pages/ProjectOverview'));
const { Component: NewProject } = lazyLoadWithRetry(() => import('./pages/NewProject'));
const { Component: OrganizationNew } = lazyLoadWithRetry(() => import('./pages/OrganizationNew'));
const { Component: Profile } = lazyLoadWithRetry(() => import('./pages/Profile'));
const { Component: Notifications } = lazyLoadWithRetry(() => import('./pages/Notifications'));
const { Component: SearchResults } = lazyLoadWithRetry(() => import('./pages/SearchResults'));
const { Component: AdminDashboard } = lazyLoadWithRetry(() => import('./pages/admin/Dashboard'));
const { Component: AdminUsers } = lazyLoadWithRetry(() => import('./pages/admin/Users'));
const { Component: AdminAuditLogs } = lazyLoadWithRetry(() => import('./pages/admin/AuditLogs'));
const { Component: AdminMetrics } = lazyLoadWithRetry(() => import('./pages/AdminMetrics'));
const { Component: OrganizationDashboard } = lazyLoadWithRetry(() => import('./components/OrganizationDashboard'));
const { Component: TeamDashboard } = lazyLoadWithRetry(() => import('./components/TeamDashboard'));
const { Component: ProjectDashboard } = lazyLoadWithRetry(() => import('./components/ProjectDashboard'));
const { Component: CreateOrganization } = lazyLoadWithRetry(() => import('./pages/CreateOrganization'));

// Lazy load comprehensive platform components
const { Component: ClientOnboarding } = lazyLoadWithRetry(() => import('./components/onboarding/ClientOnboarding'));
const { Component: QuickOnboarding } = lazyLoadWithRetry(() => import('./components/onboarding/QuickOnboarding'));

// Legal pages
const { Component: Terms } = lazyLoadWithRetry(() => import('./pages/Terms'));
const { Component: Privacy } = lazyLoadWithRetry(() => import('./pages/Privacy'));

// Help & Support pages - Phase 4 User Adoption
const { Component: HelpCenter } = lazyLoadWithRetry(() => import('./pages/HelpCenter'));
const { Component: HelpArticle } = lazyLoadWithRetry(() => import('./pages/HelpArticle'));
const { Component: Support } = lazyLoadWithRetry(() => import('./pages/Support'));
// Future: Route components for advanced features - see docs/ROUTE_WRAPPERS.md for implementation guide

// FluxPrint Integration - 3D Printing Dashboard
const PrintingDashboard = React.lazy(() => import('./components/printing/PrintingDashboard'));

// AI Agent Panel
const { Component: AgentPanel } = lazyLoadWithRetry(() => import('./components/agent/AgentPanel'));

// 404 Not Found page
const { Component: NotFound } = lazyLoadWithRetry(() => import('./pages/NotFound'));

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
  return <LandingPage />;
}

// OAuth callback routes wrapper - minimal providers (only AuthProvider)
// This avoids ConnectorsContext which interferes with Google login OAuth
function OAuthCallbackRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="google" element={<OAuthCallback provider="google" />} />
        <Route path="figma" element={<OAuthCallback provider="figma" />} />
        <Route path="slack" element={<OAuthCallback provider="slack" />} />
        <Route path="github" element={<OAuthCallback provider="github" />} />
      </Routes>
    </AuthProvider>
  );
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
    <RootProviders>
      {/* Project Context Bar - shows when a project is focused */}
      <ProjectContextBar />
      {/* Work Momentum - passive context capture */}
      <MomentumCapture />
      {/* AI Agent Panel - accessible from anywhere */}
      <Suspense fallback={null}>
        <AgentPanel />
      </Suspense>
      {/* Global Quick Actions - Cmd/Ctrl+K to open */}
      <GlobalQuickActions>
        <Suspense fallback={<DefaultLoadingFallback />}>
          <Routes>
                  {/* Root route - redirects based on auth state */}
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/login" element={<Login />} />

                  {/* Dev preview: mock auth prevents seeing landing at / */}
                  <Route path="/landing" element={<LandingPage />} />

                  {/* Lazy-loaded auth pages */}
                  <Route path="/signup" element={<SignupWizard />} />
                  <Route path="/signup/classic" element={<Signup />} />
                  <Route path="/verify-email" element={<EmailVerification />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/checkout/success" element={<CheckoutSuccess />} />
                  <Route path="/checkout/cancel" element={<Checkout />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
                  <Route path="/welcome" element={<WelcomeFlow />} />

                  {/* OAuth callback routes moved to App level to avoid ConnectorsContext interference */}

                  {/* Legal pages - public */}
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />

                  {/* Help & Support pages - public but with optional auth */}
                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/help/article/:articleId" element={<HelpArticle />} />
                  <Route path="/support" element={<Support />} />

                  {/* ================================================
                      PRIMARY ROUTES (3-Space Architecture)

                      /projects - The main hub, where users land
                      /organization - Team & company management
                      /settings - Personal preferences
                      ================================================ */}

                  {/* Projects Hub - THE primary landing page */}
                  <Route path="/projects" element={<ProtectedRoute><ProjectsErrorBoundary><ProjectsHub /></ProjectsErrorBoundary></ProtectedRoute>} />
                  <Route path="/projects/new" element={<ProtectedRoute><ProjectsErrorBoundary><NewProject /></ProjectsErrorBoundary></ProtectedRoute>} />

                  {/* Quick Onboarding - For new users */}
                  <Route path="/get-started" element={<ProtectedRoute><QuickOnboarding /></ProtectedRoute>} />

                  {/* Organization & Settings */}
                  <Route path="/organization" element={<ProtectedRoute><OrganizationNew /></ProtectedRoute>} />
                  <Route path="/projects/:projectId/overview" element={<ProtectedRoute><ProjectsErrorBoundary><ProjectOverview /></ProjectsErrorBoundary></ProtectedRoute>} />
                  <Route path="/projects/:id" element={<ProtectedRoute><ProjectsErrorBoundary><ProjectDetail /></ProjectsErrorBoundary></ProtectedRoute>} />
                  <Route path="/projects/:projectId/formations" element={<ProtectedRoute><FormationEditor /></ProtectedRoute>} />
                  <Route path="/projects/:projectId/formations/:formationId" element={<ProtectedRoute><FormationEditor /></ProtectedRoute>} />
                  <Route path="/boards/:boardId" element={<ProtectedRoute><DesignBoardPage /></ProtectedRoute>} />
                  <Route path="/messages" element={<ProtectedRoute><MessagingErrorBoundary><MessagesNew /></MessagingErrorBoundary></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/search" element={<ProtectedRoute><SearchResults /></ProtectedRoute>} />
                  <Route path="/connectors" element={<ProtectedRoute><Connectors /></ProtectedRoute>} />
                  <Route path="/plugins" element={<ProtectedRoute><PluginManagerPage /></ProtectedRoute>} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
                  <Route path="/admin/audit" element={<ProtectedRoute><AdminAuditLogs /></ProtectedRoute>} />
                  <Route path="/admin/metrics" element={<ProtectedRoute><AdminMetrics /></ProtectedRoute>} />
                  <Route path="/tools" element={<ProtectedRoute><ToolsErrorBoundary><Tools /></ToolsErrorBoundary></ProtectedRoute>} />
                  <Route path="/tools/metmap" element={<ProtectedRoute><ToolsErrorBoundary><ToolsMetMap /></ToolsErrorBoundary></ProtectedRoute>} />
                  {/* /tools/files and /tools/assets now redirect to /projects (consolidated) */}

                  {/* ================================================
                      ROUTE CONSOLIDATION (UX Redesign)

                      3-Space Architecture:
                      1. /projects - Primary hub (everything lives in projects)
                      2. /organization - Team management, billing
                      3. /settings - Personal preferences

                      Legacy routes redirect to consolidated locations.
                      ================================================ */}

                  {/* Primary Consolidation Redirects */}
                  <Route path="/home" element={<Navigate to="/projects" replace />} />
                  <Route path="/dashboard" element={<Navigate to="/projects" replace />} />
                  <Route path="/file" element={<Navigate to="/projects?view=files" replace />} />
                  <Route path="/assets" element={<Navigate to="/projects?view=assets" replace />} />
                  <Route path="/tools/files" element={<Navigate to="/projects?view=files" replace />} />
                  <Route path="/tools/assets" element={<Navigate to="/projects?view=assets" replace />} />
                  <Route path="/team" element={<Navigate to="/organization?tab=team" replace />} />

                  {/* Legacy routes - redirecting to new pages */}
                  <Route path="/organization/legacy" element={<Navigate to="/organization" replace />} />
                  <Route path="/team/legacy" element={<Navigate to="/team" replace />} />
                  <Route path="/file/legacy" element={<Navigate to="/projects?view=files" replace />} />
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

                  {/* 404 Not Found - catch all unmatched routes */}
                  <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </GlobalQuickActions>
      {/* Global Toast Notifications */}
      <ToastContainer />
      {/* SW Update Banner */}
      <UpdateBanner />
    </RootProviders>
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
      logger.error('Failed to initialize CSRF token', error);
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
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: queryPersister, maxAge: 1000 * 60 * 60 * 24 }}
      >
        <Router>
          <ThemeProvider>
            {/* Global Command Palette - accessible via ⌘K */}
            <CommandPalette
              open={commandPaletteOpen}
              onOpenChange={setCommandPaletteOpen}
              projects={[]}
            />
            <Routes>
              {/* OAuth callback routes - minimal providers to avoid ConnectorsContext interference */}
              <Route path="/auth/callback/*" element={<OAuthCallbackRoutes />} />
              {/* All other routes go through authenticated providers */}
              <Route path="/*" element={<AuthenticatedRoutes />} />
            </Routes>
          </ThemeProvider>
        </Router>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}