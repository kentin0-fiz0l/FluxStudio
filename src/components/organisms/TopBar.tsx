/**
 * TopBar Organism - Flux Design Language
 *
 * Top navigation bar with breadcrumbs, search, notifications, and user menu.
 * Works in conjunction with NavigationSidebar for complete app navigation.
 * Integrates with NotificationContext for real-time notification updates.
 *
 * @example
 * <TopBar
 *   breadcrumbs={[{ label: 'Projects', path: '/projects' }, { label: 'Website' }]}
 *   onSearch={(query) => handleSearch(query)}
 * />
 */

import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Bell, Menu, X, CheckCheck, Trash2 } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { SearchBar } from '@/components/molecules';
import { cn } from '@/lib/utils';
import { useNotifications, Notification as NotificationType } from '@/contexts/NotificationContext';
import { UserTestPill, UserTestPanel } from '@/components/usertest';
import { useUserTestMode } from '@/hooks/useUserTestMode';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

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
   * Breakpoint at which the mobile menu toggle is hidden (default: 'lg')
   */
  mobileMenuBreakpoint?: 'md' | 'lg';

  /**
   * Custom className
   */
  className?: string;

  /**
   * User data for quick menu
   */
  user?: {
    name?: string;
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
      notifications: propNotifications,
      unreadCount: propUnreadCount,
      onNotificationClick,
      showMobileMenu = false,
      mobileMenuOpen = false,
      onMobileMenuToggle,
      mobileMenuBreakpoint = 'lg',
      className,
      user,
    },
    ref
  ) => {
    const [notificationsOpen, setNotificationsOpen] = React.useState(false);
    const [userTestPanelOpen, setUserTestPanelOpen] = React.useState(false);
    const notificationRef = React.useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { isEnabled: isUserTestEnabled } = useUserTestMode();

    // Get notifications from context (with fallback to props)
    let contextNotifications: NotificationType[] = [];
    let contextUnreadCount = 0;
    let markAsRead: ((id: string) => Promise<void>) | undefined;
    let markAllAsRead: (() => Promise<void>) | undefined;
    let deleteNotification: ((id: string) => Promise<void>) | undefined;

    try {
      const notificationContext = useNotifications();
      contextNotifications = notificationContext.state.notifications;
      contextUnreadCount = notificationContext.state.unreadCount;
      markAsRead = notificationContext.markAsRead;
      markAllAsRead = notificationContext.markAllAsRead;
      deleteNotification = notificationContext.deleteNotification;
    } catch {
      // Context not available, use props
    }

    // Use context values or fall back to props
    const notifications = contextNotifications.length > 0 ? contextNotifications : (propNotifications || []);
    const unreadCount = contextUnreadCount > 0 ? contextUnreadCount : (propUnreadCount || 0);

    // Format relative time
    const formatRelativeTime = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    };

    // Handle notification click
    const handleNotificationClick = async (notification: NotificationType | Notification) => {
      // Mark as read
      if (markAsRead && 'isRead' in notification && !notification.isRead) {
        await markAsRead(notification.id);
      }

      // Navigate to action URL if available
      if ('actionUrl' in notification && notification.actionUrl) {
        navigate(notification.actionUrl);
        setNotificationsOpen(false);
      } else if (onNotificationClick) {
        onNotificationClick(notification as Notification);
        setNotificationsOpen(false);
      }
    };

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
          'sticky top-0 z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 shadow-sm',
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
                className={mobileMenuBreakpoint === 'md' ? 'md:hidden' : 'lg:hidden'}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </Button>
            )}

            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <nav className="hidden md:flex items-center gap-2 text-sm" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={index} className="flex items-center gap-2">
                      {index > 0 && (
                        <ChevronRight className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                      )}
                      {crumb.path ? (
                        <Link
                          to={crumb.path}
                          className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors font-medium"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="text-neutral-900 dark:text-neutral-100 font-semibold" aria-current="page">
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
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

          {/* Right Section: Theme + User Test + Notifications + User */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Test Pill */}
            {isUserTestEnabled && (
              <UserTestPill onClick={() => setUserTestPanelOpen(true)} />
            )}

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
                  <Bell className="h-5 w-5" aria-hidden="true" />
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
                  <div
                    className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-96 sm:w-96 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-dropdown overflow-hidden"
                    role="dialog"
                    aria-label="Notifications"
                    aria-labelledby="notifications-heading"
                  >
                    <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100" id="notifications-heading">Notifications</h3>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <>
                            <Badge variant="error" size="sm" aria-label={`${unreadCount} unread notifications`}>
                              {unreadCount} new
                            </Badge>
                            {markAllAsRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAllAsRead()}
                                className="text-xs text-neutral-500 hover:text-primary-600"
                                aria-label="Mark all notifications as read"
                              >
                                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto" role="list" aria-labelledby="notifications-heading">
                      {notifications.length > 0 ? (
                        <ul>
                          {notifications.slice(0, 10).map((notification) => {
                            const isContextNotification = 'isRead' in notification;
                            const isRead = isContextNotification ? notification.isRead : notification.read;
                            const time = isContextNotification ? formatRelativeTime(notification.createdAt) : notification.time;

                            return (
                              <li key={notification.id} role="listitem">
                                <div
                                  className={cn(
                                    'w-full px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-100 dark:border-neutral-700 last:border-0 flex items-start gap-3',
                                    !isRead && 'bg-primary-50/50 dark:bg-primary-900/20'
                                  )}
                                >
                                  <button
                                    onClick={() => handleNotificationClick(notification)}
                                    className="flex-1 text-left min-w-0"
                                    aria-label={`${notification.title}: ${notification.message}`}
                                  >
                                    <div className="flex items-start gap-2">
                                      {!isRead && (
                                        <div className="w-2 h-2 rounded-full bg-primary-600 mt-1.5 flex-shrink-0" aria-hidden="true" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">
                                          {notification.title}
                                        </p>
                                        <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 mt-0.5">
                                          {notification.message}
                                        </p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                          {time}
                                        </p>
                                      </div>
                                    </div>
                                  </button>
                                  {isContextNotification && deleteNotification && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(notification.id);
                                      }}
                                      className="text-neutral-400 hover:text-error-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                      aria-label={`Delete notification: ${notification.title}`}
                                    >
                                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <Bell className="h-8 w-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" aria-hidden="true" />
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">No notifications</p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">You're all caught up!</p>
                        </div>
                      )}
                    </div>

                    <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                      <Link to="/notifications" onClick={() => setNotificationsOpen(false)}>
                        <Button
                          variant="ghost"
                          size="sm"
                          fullWidth
                          className="text-primary-600 hover:text-primary-700"
                        >
                          View All Notifications
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Avatar (Mobile) */}
            {user && (
              <Link
                to="/profile"
                className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={`Profile for ${user.name}`}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    className="h-8 w-8 rounded-full"
                    aria-hidden="true"
                  />
                ) : (
                  <div
                    className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold"
                    aria-hidden="true"
                  >
                    {(user.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
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

        {/* User Test Panel */}
        {isUserTestEnabled && (
          <UserTestPanel
            isOpen={userTestPanelOpen}
            onClose={() => setUserTestPanelOpen(false)}
          />
        )}
      </div>
    );
  }
);

TopBar.displayName = 'TopBar';
