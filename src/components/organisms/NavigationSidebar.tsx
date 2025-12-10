/**
 * NavigationSidebar Organism - Flux Design Language
 *
 * Main navigation sidebar for the FluxStudio application.
 * Supports collapsible state, nested navigation, and user profile.
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
  Home,
  Folder,
  Users,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Building2,
  LogOut,
  User,
  Wrench,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

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
    name: string;
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

const defaultNavigationItems: NavigationItem[] = [
  { label: 'Dashboard', icon: <Home className="h-5 w-5" aria-hidden="true" />, path: '/home' },
  { label: 'Projects', icon: <Briefcase className="h-5 w-5" aria-hidden="true" />, path: '/projects' },
  { label: 'Files', icon: <Folder className="h-5 w-5" aria-hidden="true" />, path: '/file' },
  { label: 'Team', icon: <Users className="h-5 w-5" aria-hidden="true" />, path: '/team' },
  { label: 'Organization', icon: <Building2 className="h-5 w-5" aria-hidden="true" />, path: '/organization' },
  { label: 'Messages', icon: <MessageSquare className="h-5 w-5" aria-hidden="true" />, path: '/messages', badge: 3 },
  { label: 'Tools', icon: <Wrench className="h-5 w-5" aria-hidden="true" />, path: '/tools' },
  { label: 'Settings', icon: <Settings className="h-5 w-5" aria-hidden="true" />, path: '/settings' },
];

export const NavigationSidebar = React.forwardRef<HTMLDivElement, NavigationSidebarProps>(
  (
    {
      user,
      items = defaultNavigationItems,
      collapsed = false,
      onCollapseToggle,
      onLogout,
      className,
    },
    ref
  ) => {
    const location = useLocation();
    const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

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
      <div
        ref={ref}
        className={cn(
          'flex flex-col h-full bg-neutral-900 text-white transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
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

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-1">
            {items.map((item) => {
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
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                          'hover:bg-neutral-800',
                          active && 'bg-primary-600 hover:bg-primary-700'
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="flex-shrink-0">{item.icon}</span>
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
                        <ul className="ml-9 mt-1 space-y-1">
                          {item.children.map((child) => (
                            <li key={child.path}>
                              <Link
                                to={child.path}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                                  'hover:bg-neutral-800',
                                  isActive(child.path) && 'bg-primary-600 hover:bg-primary-700'
                                )}
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
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                        'hover:bg-neutral-800',
                        active && 'bg-primary-600 hover:bg-primary-700'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-sm font-medium">{item.label}</span>
                          {item.badge && (
                            <Badge variant="solidError" size="sm">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                      {collapsed && item.badge && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full" />
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile Section */}
        {user && (
          <div className="border-t border-neutral-800 p-3">
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
                    {getUserInitials(user.name)}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-9 h-9 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {getUserInitials(user.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    {user.email && (
                      <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                    )}
                  </div>
                  <User className="h-4 w-4 text-neutral-400 flex-shrink-0" aria-hidden="true" />
                </Link>

                {onLogout && (
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
                    onClick={onLogout}
                    className="justify-start text-neutral-300 hover:text-white hover:bg-neutral-800"
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
          <div className="border-t border-neutral-800 p-2">
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              icon={collapsed ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
              onClick={onCollapseToggle}
              className="text-neutral-400 hover:text-white hover:bg-neutral-800"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {!collapsed && 'Collapse'}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

NavigationSidebar.displayName = 'NavigationSidebar';
