/**
 * NavigationSidebar Organism - Flux Design Language
 *
 * Main navigation sidebar for the FluxStudio application.
 * Supports collapsible state, nested navigation, and user profile.
 * Includes real-time unread message counts from MessagingContext.
 *
 * @example
 * <NavigationSidebar
 *   user={{ name: 'John Doe', email: 'john@example.com' }}
 *   onNavigate={(path) => navigate(path)}
 * />
 */

import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Building2,
  Package,
  LogOut,
  User,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useMessagingOptional } from '@/hooks/useMessaging';
import { ProjectSwitcher } from '@/components/projects/ProjectSwitcher';

export interface NavigationItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string | number;
  children?: NavigationItem[];
}

export interface NavigationSidebarProps {
  /**
   * User data for profile section
   */
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
  };

  /**
   * Navigation items
   */
  items?: NavigationItem[];

  /**
   * Collapsed state
   */
  collapsed?: boolean;

  /**
   * On collapse toggle
   */
  onCollapseToggle?: () => void;

  /**
   * On logout
   */
  onLogout?: () => void;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * Simplified 3-Space Navigation Architecture
 *
 * PRIMARY SPACES:
 * 1. Projects - Main hub (80% of user time)
 * 2. Organization - Team management, billing, integrations
 * 3. Settings - Personal preferences
 *
 * Messages is accessible but secondary (shown with badge).
 */

// Primary navigation items - simplified for clarity
const createPrimaryNavItems = (unreadCount: number): NavigationItem[] => [
  {
    label: 'Projects',
    icon: <Briefcase className="h-5 w-5" aria-hidden="true" />,
    path: '/projects'
  },
  {
    label: 'Messages',
    icon: <MessageSquare className="h-5 w-5" aria-hidden="true" />,
    path: '/messages',
    badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined
  },
];

// Secondary navigation items - Organization, Plugins & Settings
const createSecondaryNavItems = (): NavigationItem[] => [
  {
    label: 'Organization',
    icon: <Building2 className="h-5 w-5" aria-hidden="true" />,
    path: '/organization'
  },
  {
    label: 'Plugins',
    icon: <Package className="h-5 w-5" aria-hidden="true" />,
    path: '/plugins'
  },
  {
    label: 'Settings',
    icon: <Settings className="h-5 w-5" aria-hidden="true" />,
    path: '/settings'
  },
];

// Navigation items are created dynamically via createPrimaryNavItems() and createSecondaryNavItems()

export const NavigationSidebar = React.forwardRef<HTMLDivElement, NavigationSidebarProps>(
  (
    {
      user,
      items: _items,
      collapsed = false,
      onCollapseToggle,
      onLogout,
      className,
    },
    ref
  ) => {
    const location = useLocation();
    const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

    // Get unread message counts from MessagingContext
    // Uses optional hook that returns defaults when context is unavailable
    const { unreadCount } = useMessagingOptional();
    const unreadCountValue = unreadCount || 0;

    // Check if path is active
    const isActive = (path: string) => {
      return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    // Toggle expanded state for items with children
    const toggleExpanded = (label: string) => {
      setExpandedItems((prev) => {
        const next = new Set(prev);
        if (next.has(label)) {
          next.delete(label);
        } else {
          next.add(label);
        }
        return next;
      });
    };

    // Get user initials
    const getUserInitials = (name: string) => {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    return (
      <aside
        ref={ref}
        className={cn(
          'flex flex-col h-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          className
        )}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          {!collapsed && (
            <Link to="/home" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center font-bold text-sm">
                FS
              </div>
              <span className="font-semibold text-lg">FluxStudio</span>
            </Link>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center font-bold text-sm mx-auto">
              FS
            </div>
          )}
        </div>

        {/* Project Switcher */}
        <div className={cn('p-3 border-b border-neutral-200 dark:border-neutral-800', collapsed && 'px-2')}>
          <ProjectSwitcher collapsed={collapsed} />
        </div>

        {/* Navigation Items - Simplified 3-Space Architecture */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {/* Primary Navigation */}
          <div className="mb-6">
            {!collapsed && (
              <p className="px-3 mb-2 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Workspace
              </p>
            )}
            <ul className="space-y-1" role="list" aria-label="Primary navigation">
              {createPrimaryNavItems(unreadCountValue).map((item) => {
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[44px]',
                        'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                        active && 'bg-primary-600 hover:bg-primary-700'
                      )}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      aria-label={item.badge ? `${item.label}, ${item.badge} unread` : item.label}
                    >
                      <span className="flex-shrink-0" aria-hidden="true">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-sm font-medium">{item.label}</span>
                          {item.badge && (
                            <Badge variant="solidError" size="sm" aria-hidden="true">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                      {collapsed && item.badge && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full" aria-hidden="true" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Secondary Navigation */}
          <div>
            {!collapsed && (
              <p className="px-3 mb-2 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                Manage
              </p>
            )}
          <ul className="space-y-1" role="list" aria-label="Secondary navigation">
            {createSecondaryNavItems().map((item) => {
              const active = isActive(item.path);
              const expanded = expandedItems.has(item.label);
              const hasChildren = item.children && item.children.length > 0;

              return (
                <li key={item.path}>
                  {hasChildren ? (
                    // Item with children (expandable)
                    <>
                      <button
                        onClick={() => toggleExpanded(item.label)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[44px]',
                          'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                          active && 'bg-primary-600 hover:bg-primary-700'
                        )}
                        title={collapsed ? item.label : undefined}
                        aria-expanded={expanded}
                        aria-controls={`submenu-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                      >
                        <span className="flex-shrink-0" aria-hidden="true">{item.icon}</span>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left text-sm font-medium">
                              {item.label}
                            </span>
                            <ChevronRight
                              className={cn(
                                'h-4 w-4 transition-transform',
                                expanded && 'transform rotate-90'
                              )}
                              aria-hidden="true"
                            />
                          </>
                        )}
                      </button>

                      {/* Submenu */}
                      {!collapsed && expanded && item.children && (
                        <ul
                          className="ml-9 mt-1 space-y-1"
                          id={`submenu-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                          role="list"
                        >
                          {item.children.map((child) => (
                            <li key={child.path}>
                              <Link
                                to={child.path}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors min-h-[44px]',
                                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                                  isActive(child.path) && 'bg-primary-600 hover:bg-primary-700'
                                )}
                                aria-current={isActive(child.path) ? 'page' : undefined}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    // Regular navigation item
                    <Link
                      to={item.path}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[44px]',
                        'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                        active && 'bg-primary-600 hover:bg-primary-700'
                      )}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      aria-label={item.badge ? `${item.label}, ${item.badge} unread` : item.label}
                    >
                      <span className="flex-shrink-0" aria-hidden="true">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-sm font-medium">{item.label}</span>
                          {item.badge && (
                            <Badge variant="solidError" size="sm" aria-hidden="true">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                      {collapsed && item.badge && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full" aria-hidden="true" />
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          </div>
        </nav>

        {/* User Profile Section */}
        {user && (
          <div className="border-t border-neutral-200 dark:border-neutral-800 p-3">
            {collapsed ? (
              <div className="relative">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full mx-auto"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center font-semibold text-sm mx-auto">
                    {getUserInitials(user.name || '')}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || ''}
                      className="w-9 h-9 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {getUserInitials(user.name || '')}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    {user.email && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                    )}
                  </div>
                  <User className="h-4 w-4 text-neutral-500 dark:text-neutral-400 flex-shrink-0" aria-hidden="true" />
                </Link>

                {onLogout && (
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
                    onClick={onLogout}
                    className="justify-start text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    Sign Out
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Collapse Toggle */}
        {onCollapseToggle && (
          <div className="border-t border-neutral-200 dark:border-neutral-800 p-2">
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              icon={collapsed ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
              onClick={onCollapseToggle}
              className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 min-h-[44px]"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
            >
              {!collapsed && 'Collapse'}
            </Button>
          </div>
        )}
      </aside>
    );
  }
);

NavigationSidebar.displayName = 'NavigationSidebar';
