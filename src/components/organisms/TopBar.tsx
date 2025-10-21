/**
 * TopBar Organism - Flux Design Language
 *
 * Top navigation bar with breadcrumbs, search, notifications, and user menu.
 * Works in conjunction with NavigationSidebar for complete app navigation.
 *
 * @example
 * <TopBar
 *   breadcrumbs={[{ label: 'Projects', path: '/projects' }, { label: 'Website' }]}
 *   onSearch={(query) => handleSearch(query)}
 * />
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Bell, Menu, X } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { SearchBar } from '@/components/molecules';
import { cn } from '@/lib/utils';

export interface Breadcrumb {
  label: string;
  path?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export interface TopBarProps {
  /**
   * Breadcrumbs for current page
   */
  breadcrumbs?: Breadcrumb[];

  /**
   * Show search bar
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
   * Show notifications
   */
  showNotifications?: boolean;

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
   * Show mobile menu toggle
   */
  showMobileMenu?: boolean;

  /**
   * Mobile menu state
   */
  mobileMenuOpen?: boolean;

  /**
   * Mobile menu toggle handler
   */
  onMobileMenuToggle?: () => void;

  /**
   * Custom className
   */
  className?: string;

  /**
   * User data for quick menu
   */
  user?: {
    name: string;
    avatar?: string;
  };
}

export const TopBar = React.forwardRef<HTMLDivElement, TopBarProps>(
  (
    {
      breadcrumbs = [],
      showSearch = true,
      onSearch,
      recentSearches,
      showNotifications = true,
      notifications = [],
      unreadCount = 0,
      onNotificationClick,
      showMobileMenu = false,
      mobileMenuOpen = false,
      onMobileMenuToggle,
      className,
      user,
    },
    ref
  ) => {
    const [notificationsOpen, setNotificationsOpen] = React.useState(false);
    const notificationRef = React.useRef<HTMLDivElement>(null);

    // Close notifications dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          notificationRef.current &&
          !notificationRef.current.contains(event.target as Node)
        ) {
          setNotificationsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div
        ref={ref}
        className={cn(
          'sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-sm',
          className
        )}
      >
        <div className="flex items-center justify-between gap-4 px-4 h-16">
          {/* Left Section: Mobile Menu + Breadcrumbs */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Mobile Menu Toggle */}
            {showMobileMenu && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMobileMenuToggle}
                className="lg:hidden"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            )}

            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <nav className="hidden md:flex items-center gap-2 text-sm" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && (
                      <ChevronRight className="h-4 w-4 text-neutral-400" />
                    )}
                    {crumb.path ? (
                      <Link
                        to={crumb.path}
                        className="text-neutral-600 hover:text-neutral-900 transition-colors font-medium"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-neutral-900 font-semibold">
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}
          </div>

          {/* Center Section: Search */}
          {showSearch && onSearch && (
            <div className="hidden md:block w-full max-w-md">
              <SearchBar
                placeholder="Search..."
                onSearch={onSearch}
                showRecent
                recentSearches={recentSearches}
                size="sm"
              />
            </div>
          )}

          {/* Right Section: Notifications + User */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            {showNotifications && (
              <div className="relative" ref={notificationRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative"
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="solidError"
                      size="sm"
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 rounded-lg shadow-dropdown overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                      <h3 className="font-semibold text-neutral-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <Badge variant="error" size="sm">
                          {unreadCount} new
                        </Badge>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        <ul>
                          {notifications.map((notification) => (
                            <li key={notification.id}>
                              <button
                                onClick={() => {
                                  onNotificationClick?.(notification);
                                  setNotificationsOpen(false);
                                }}
                                className={cn(
                                  'w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0',
                                  !notification.read && 'bg-primary-50/50'
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  {!notification.read && (
                                    <div className="w-2 h-2 rounded-full bg-primary-600 mt-1.5 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-neutral-900 truncate">
                                      {notification.title}
                                    </p>
                                    <p className="text-sm text-neutral-600 line-clamp-2 mt-0.5">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-neutral-500 mt-1">
                                      {notification.time}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <Bell className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                          <p className="text-sm text-neutral-500">No notifications</p>
                        </div>
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="px-4 py-2 border-t border-neutral-200 bg-neutral-50">
                        <Button
                          variant="ghost"
                          size="sm"
                          fullWidth
                          className="text-primary-600 hover:text-primary-700"
                        >
                          View All Notifications
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* User Avatar (Mobile) */}
            {user && (
              <Link to="/profile" className="md:hidden">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Search (below top bar) */}
        {showSearch && onSearch && (
          <div className="md:hidden px-4 pb-3">
            <SearchBar
              placeholder="Search..."
              onSearch={onSearch}
              showRecent
              recentSearches={recentSearches}
              size="sm"
            />
          </div>
        )}
      </div>
    );
  }
);

TopBar.displayName = 'TopBar';
