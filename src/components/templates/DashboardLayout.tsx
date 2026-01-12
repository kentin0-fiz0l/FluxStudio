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
import { NavigationSidebar, NavigationItem } from '@/components/organisms/NavigationSidebar';
import { TopBar, Breadcrumb, Notification } from '@/components/organisms/TopBar';
import { SkipLink } from '@/components/ui';
import { AIChatPanel } from '@/components/ai/AIChatPanel';
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
    name: string;
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

    // Close mobile menu when window is resized to desktop
    React.useEffect(() => {
      const handleResize = () => {
        if (window.innerWidth >= 1024 && mobileMenuOpen) {
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
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Desktop Sidebar */}
        <aside
          className="hidden lg:flex flex-col h-full"
          role="navigation"
          aria-label="Main navigation"
        >
          <NavigationSidebar
            user={user}
            items={navigationItems}
            collapsed={sidebarCollapsed}
            onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            onLogout={onLogout}
          />
        </aside>

        {/* Mobile Sidebar (Drawer) */}
        <aside
          role="navigation"
          aria-label="Mobile navigation"
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex flex-col h-full transform transition-transform duration-300 lg:hidden',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
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
            breadcrumbs={breadcrumbs}
            showSearch={showSearch}
            onSearch={onSearch}
            recentSearches={recentSearches}
            notifications={notifications}
            unreadCount={unreadCount}
            onNotificationClick={onNotificationClick}
            showMobileMenu
            mobileMenuOpen={mobileMenuOpen}
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            user={user}
          />

          {/* Page Content */}
          <main
            id="main-content"
            role="main"
            aria-label="Main content"
            tabIndex={-1}
            className={cn(
              'flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900',
              contentClassName
            )}
          >
            {children}
          </main>
        </div>

        {/* AI Co-Pilot Panel (Cmd+K) */}
        <AIChatPanel
          isOpen={aiPanelOpen}
          onClose={() => setAiPanelOpen(false)}
          position="right"
        />
      </div>
    );
  }
);

DashboardLayout.displayName = 'DashboardLayout';
