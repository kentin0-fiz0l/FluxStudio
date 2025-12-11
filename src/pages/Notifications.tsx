/**
 * Notifications Page - Flux Studio
 *
 * Full notifications inbox using DashboardLayout.
 * Shows all notifications with filtering, marking as read, and deletion.
 *
 * WCAG 2.1 Level A Compliant:
 * - ARIA labels and roles for all interactive elements
 * - Keyboard navigation support
 * - Live regions for dynamic updates
 * - Focus management
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  RefreshCw,
  MessageSquare,
  Briefcase,
  Building2,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  Check,
  ChevronRight,
} from 'lucide-react';
import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, Notification, NotificationType, NotificationPriority } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';

// Notification type icons
const typeIcons: Record<NotificationType, React.ReactNode> = {
  message_mention: <MessageSquare className="h-5 w-5" />,
  message_reply: <MessageSquare className="h-5 w-5" />,
  project_member_added: <Briefcase className="h-5 w-5" />,
  project_status_changed: <Briefcase className="h-5 w-5" />,
  project_file_uploaded: <Briefcase className="h-5 w-5" />,
  organization_alert: <Building2 className="h-5 w-5" />,
  system: <AlertCircle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  error: <XCircle className="h-5 w-5" />,
};

// Notification type colors
const typeColors: Record<NotificationType, string> = {
  message_mention: 'bg-blue-100 text-blue-600',
  message_reply: 'bg-blue-100 text-blue-600',
  project_member_added: 'bg-green-100 text-green-600',
  project_status_changed: 'bg-purple-100 text-purple-600',
  project_file_uploaded: 'bg-indigo-100 text-indigo-600',
  organization_alert: 'bg-orange-100 text-orange-600',
  system: 'bg-neutral-100 text-neutral-600',
  info: 'bg-blue-100 text-blue-600',
  warning: 'bg-amber-100 text-amber-600',
  error: 'bg-red-100 text-red-600',
};

// Priority badges
const priorityVariants: Record<NotificationPriority, string> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
};

type FilterType = 'all' | 'unread' | 'read';

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    state,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [filter, setFilter] = React.useState<FilterType>('all');
  const [selectedType, setSelectedType] = React.useState<NotificationType | 'all'>('all');

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter notifications
  const filteredNotifications = React.useMemo(() => {
    let filtered = [...state.notifications];

    // Filter by read status
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (filter === 'read') {
      filtered = filtered.filter(n => n.isRead);
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(n => n.type === selectedType);
    }

    return filtered;
  }, [state.notifications, filter, selectedType]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  // Get unique notification types for filter
  const availableTypes = React.useMemo(() => {
    const types = new Set(state.notifications.map(n => n.type));
    return Array.from(types);
  }, [state.notifications]);

  return (
    <DashboardLayout
      user={user ? { name: user.name || user.email, email: user.email } : undefined}
      breadcrumbs={[{ label: 'Notifications' }]}
    >
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900" id="notifications-page-heading">
              Notifications
            </h1>
            <p className="text-neutral-600 mt-1">
              {state.unreadCount > 0
                ? `You have ${state.unreadCount} unread notification${state.unreadCount !== 1 ? 's' : ''}`
                : 'You\'re all caught up!'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
              onClick={() => fetchNotifications()}
              aria-label="Refresh notifications"
            >
              Refresh
            </Button>
            {state.unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                icon={<CheckCheck className="h-4 w-4" aria-hidden="true" />}
                onClick={() => markAllAsRead()}
                aria-label="Mark all notifications as read"
              >
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Read status filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-600">Status:</span>
                <div className="flex rounded-lg border border-neutral-200 overflow-hidden" role="group" aria-label="Filter by read status">
                  {(['all', 'unread', 'read'] as FilterType[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        'px-3 py-1.5 text-sm font-medium transition-colors',
                        filter === f
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      )}
                      aria-pressed={filter === f}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type filter */}
              {availableTypes.length > 1 && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as NotificationType | 'all')}
                    className="text-sm border border-neutral-200 rounded-lg px-3 py-1.5 bg-white"
                    aria-label="Filter by notification type"
                  >
                    <option value="all">All Types</option>
                    {availableTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Results count */}
              <span className="text-sm text-neutral-500 ml-auto">
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card>
          <CardContent className="p-0">
            {state.loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 text-neutral-300 mx-auto mb-2 animate-spin" aria-hidden="true" />
                <p className="text-sm text-neutral-500">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length > 0 ? (
              <ul role="list" aria-labelledby="notifications-page-heading">
                {filteredNotifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={cn(
                      'border-b border-neutral-100 last:border-0 transition-colors',
                      !notification.isRead && 'bg-primary-50/30'
                    )}
                  >
                    <div className="flex items-start gap-4 p-4 hover:bg-neutral-50">
                      {/* Icon */}
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          typeColors[notification.type] || 'bg-neutral-100 text-neutral-600'
                        )}
                        aria-hidden="true"
                      >
                        {typeIcons[notification.type] || <Bell className="h-5 w-5" />}
                      </div>

                      {/* Content */}
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className="flex-1 text-left min-w-0"
                        aria-label={`${notification.title}: ${notification.message}. ${!notification.isRead ? 'Unread.' : ''} ${formatRelativeTime(notification.createdAt)}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {!notification.isRead && (
                              <div className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0" aria-label="Unread" />
                            )}
                            <h3 className="font-medium text-neutral-900">
                              {notification.title}
                            </h3>
                            {notification.priority === 'high' || notification.priority === 'urgent' ? (
                              <Badge variant={priorityVariants[notification.priority] as any} size="sm">
                                {notification.priority}
                              </Badge>
                            ) : null}
                          </div>
                          <span className="text-xs text-neutral-500 whitespace-nowrap flex-shrink-0">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.actionUrl && (
                          <div className="flex items-center gap-1 text-sm text-primary-600 mt-2">
                            <span>View details</span>
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </div>
                        )}
                      </button>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="text-neutral-400 hover:text-primary-600"
                            aria-label={`Mark "${notification.title}" as read`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="text-neutral-400 hover:text-error-600"
                          aria-label={`Delete notification: ${notification.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-12 text-center">
                <Bell className="h-12 w-12 text-neutral-200 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-medium text-neutral-900 mb-1">No notifications</h3>
                <p className="text-sm text-neutral-500">
                  {filter === 'unread'
                    ? 'You\'ve read all your notifications!'
                    : filter === 'read'
                      ? 'No read notifications yet.'
                      : 'When you get notifications, they\'ll show up here.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keyboard shortcut hint */}
        <p className="text-xs text-neutral-400 mt-4 text-center">
          <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded border border-neutral-200 font-mono">Ctrl</kbd>
          {' + '}
          <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded border border-neutral-200 font-mono">Shift</kbd>
          {' + '}
          <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded border border-neutral-200 font-mono">N</kbd>
          {' to quickly access notifications from anywhere'}
        </p>

        {/* Live region for screen reader announcements */}
        <div role="status" aria-live="polite" className="sr-only">
          {state.unreadCount > 0
            ? `You have ${state.unreadCount} unread notifications`
            : 'No unread notifications'}
        </div>
      </div>
    </DashboardLayout>
  );
}
