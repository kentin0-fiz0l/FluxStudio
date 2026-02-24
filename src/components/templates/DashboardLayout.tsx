/**
 * DashboardLayout Template - Flux Design Language
 *
 * Complete application layout combining NavigationSidebar and TopBar.
 * Provides responsive behavior with mobile menu support.
 *
 * @example
 * <DashboardLayout
 *   user={{ name: 'John Doe', email: 'john@example.com' }}
 *   breadcrumbs={[{ label: 'Projects', path: '/projects' }]}
 * >
 *   <YourPageContent />
 * </DashboardLayout>
 */

import * as React from 'react';
import { X } from 'lucide-react';
import { NavigationSidebar, NavigationItem } from '@/components/organisms/NavigationSidebar';
import { TopBar, Breadcrumb, Notification } from '@/components/organisms/TopBar';
import { SkipLink, Button } from '@/components/ui';
import { AIChatPanel } from '@/components/ai/AIChatPanel';
import { AIErrorBoundary } from '@/components/error/ErrorBoundary';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { KeyboardShortcutsDialog, useKeyboardShortcuts } from '@/components/ui/KeyboardShortcutsDialog';
import { useShortcutRegistry } from '@/contexts/KeyboardShortcutsContext';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useSwipeSidebar } from '@/hooks/useSwipeSidebar';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { cn } from '@/lib/utils';

export interface DashboardLayoutProps {
  /**
   * Page content to render in main area
   */
  children: React.ReactNode;

  /**
   * User data for sidebar and topbar
   */
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
  };

  /**
   * Custom navigation items (optional)
   */
  navigationItems?: NavigationItem[];

  /**
   * Breadcrumbs for current page
   */
  breadcrumbs?: Breadcrumb[];

  /**
   * Show search bar in topbar
   */
  showSearch?: boolean;

  /**
   * Search callback
   */
  onSearch?: (query: string) => void;

  /**
   * Recent searches for search bar
   */
  recentSearches?: string[];

  /**
   * Notifications list
   */
  notifications?: Notification[];

  /**
   * Unread notifications count
   */
  unreadCount?: number;

  /**
   * Notification click handler
   */
  onNotificationClick?: (notification: Notification) => void;

  /**
   * Logout handler
   */
  onLogout?: () => void;

  /**
   * Initial sidebar collapsed state
   */
  initialCollapsed?: boolean;

  /**
   * Custom className for main content area
   */
  contentClassName?: string;

  /**
   * Custom className for entire layout
   */
  className?: string;
}

export const DashboardLayout = React.forwardRef<HTMLDivElement, DashboardLayoutProps>(
  (
    {
      children,
      user,
      navigationItems,
      breadcrumbs,
      showSearch = true,
      onSearch,
      recentSearches,
      notifications,
      unreadCount,
      onNotificationClick,
      onLogout,
      initialCollapsed = false,
      contentClassName,
      className,
    },
    ref
  ) => {
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(initialCollapsed);
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const [aiPanelOpen, setAiPanelOpen] = React.useState(false);
    const [isLgScreen, setIsLgScreen] = React.useState(window.innerWidth >= 1024);

    // Auto-generate breadcrumbs if none provided
    const autoBreadcrumbs = useBreadcrumbs();
    const resolvedBreadcrumbs = breadcrumbs && breadcrumbs.length > 0 ? breadcrumbs : autoBreadcrumbs;

    // Keyboard shortcuts dialog
    const { open: shortcutsOpen, setOpen: setShortcutsOpen } = useKeyboardShortcuts();

    // Dynamic shortcut registry (may not have provider yet — safe try/catch)
    let dynamicShortcutSections: Map<string, Array<{ keys: string[]; action: string }>> | undefined;
    try {
      const registry = useShortcutRegistry();
      dynamicShortcutSections = registry.grouped;
    } catch {
      // Provider not mounted yet — use defaults only
    }

    // Swipe-from-edge to go back (mobile)
    useSwipeBack();

    // Swipe from left edge to reveal sidebar (mobile, only when sidebar is closed)
    const openSidebar = React.useCallback(() => setMobileMenuOpen(true), []);
    useSwipeSidebar(openSidebar, !mobileMenuOpen);

    // Keyboard shortcut for AI Panel (Cmd+K / Ctrl+K)
    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Cmd+K on Mac, Ctrl+K on Windows/Linux
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          setAiPanelOpen((prev) => !prev);
        }
        // Escape to close
        if (e.key === 'Escape' && aiPanelOpen) {
          setAiPanelOpen(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [aiPanelOpen]);

    // Track breakpoint changes and close mobile menu when resized past md
    React.useEffect(() => {
      const handleResize = () => {
        const lg = window.innerWidth >= 1024;
        setIsLgScreen(lg);
        if (window.innerWidth >= 768 && mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [mobileMenuOpen]);

    // Prevent body scroll when mobile menu is open
    React.useEffect(() => {
      if (mobileMenuOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }

      return () => {
        document.body.style.overflow = '';
      };
    }, [mobileMenuOpen]);

    return (
      <div ref={ref} className={cn('flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-900', className)}>
        {/* Skip Navigation Link */}
        <SkipLink href="#main-content" />

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            role="presentation"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Tablet Sidebar (collapsed icon-only at md, expanded at lg) */}
        <aside
          className="hidden md:flex flex-col h-full"
          role="navigation"
          aria-label="Main navigation"
        >
          <NavigationSidebar
            user={user}
            items={navigationItems}
            collapsed={sidebarCollapsed || !isLgScreen}
            onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            onLogout={onLogout}
          />
        </aside>

        {/* Mobile Sidebar (Drawer) — only on small screens (below md, where collapsed sidebar isn't shown) */}
        <aside
          role="navigation"
          aria-label="Mobile navigation"
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex flex-col h-full transform transition-transform duration-300 ease-out md:hidden',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Close button - positioned outside the sidebar for touch accessibility */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              'absolute top-4 -right-12 z-50 bg-white dark:bg-neutral-800 shadow-md rounded-full transition-opacity duration-200 min-h-[44px] min-w-[44px]',
              mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
          <NavigationSidebar
            user={user}
            items={navigationItems}
            collapsed={false}
            onLogout={onLogout}
          />
        </aside>

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* TopBar */}
          <TopBar
            breadcrumbs={resolvedBreadcrumbs}
            showSearch={showSearch}
            onSearch={onSearch}
            recentSearches={recentSearches}
            notifications={notifications}
            unreadCount={unreadCount}
            onNotificationClick={onNotificationClick}
            showMobileMenu
            mobileMenuOpen={mobileMenuOpen}
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            mobileMenuBreakpoint="md"
            user={user}
          />

          {/* Offline / Sync Status Banner */}
          <OfflineIndicator />

          {/* Page Content — pb-16 accounts for MobileBottomNav on small screens */}
          <main
            id="main-content"
            role="main"
            aria-label="Main content"
            tabIndex={-1}
            className={cn(
              'flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900 pb-16 md:pb-0',
              contentClassName
            )}
          >
            {children}
          </main>
        </div>

        {/* AI Co-Pilot Panel (Cmd+K) */}
        <AIErrorBoundary>
          <AIChatPanel
            isOpen={aiPanelOpen}
            onClose={() => setAiPanelOpen(false)}
            position="right"
          />
        </AIErrorBoundary>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          onOpenSearch={() => {
            // Open command palette for search on mobile
            setAiPanelOpen(true);
          }}
        />

        {/* Keyboard Shortcuts Dialog (?) */}
        <KeyboardShortcutsDialog
          open={shortcutsOpen}
          onOpenChange={setShortcutsOpen}
          dynamicSections={dynamicShortcutSections}
        />
      </div>
    );
  }
);

DashboardLayout.displayName = 'DashboardLayout';
