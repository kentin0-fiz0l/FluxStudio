/**
 * Notifications Page - Flux Studio
 *
 * Full notifications inbox with project-scoped filtering and category filters.
 * Features:
 * - Category filters: All / Mentions / Decisions / Blockers / Files
 * - Project-scoped "Mark all read" when viewing project notifications
 * - Automatic refresh when project context changes
 * - User preference toggles
 *
 * WCAG 2.1 Level A Compliant
 */

import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
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
  FolderOpen,
  AtSign,
  FileText,
  AlertOctagon,
  Gavel,
  Settings,
} from 'lucide-react';
import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, Notification } from '@/contexts/NotificationContext';
import { useActiveProject } from '@/store';
import { useProjectContext } from '@/store';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/utils/apiHelpers';

// =============================================================================
// Constants
// =============================================================================

// Notification categories for filtering
type NotificationCategory = 'all' | 'mention' | 'decision' | 'blocker' | 'file_change' | 'system';

const CATEGORY_CONFIG: Record<NotificationCategory, { label: string; icon: React.ReactNode; types: string[] }> = {
  all: {
    label: 'All',
    icon: <Bell className="h-4 w-4" />,
    types: [],
  },
  mention: {
    label: 'Mentions',
    icon: <AtSign className="h-4 w-4" />,
    types: ['mention', 'message_mention', 'reply', 'thread_reply'],
  },
  decision: {
    label: 'Decisions',
    icon: <Gavel className="h-4 w-4" />,
    types: ['decision'],
  },
  blocker: {
    label: 'Blockers',
    icon: <AlertOctagon className="h-4 w-4" />,
    types: ['blocker'],
  },
  file_change: {
    label: 'Files',
    icon: <FileText className="h-4 w-4" />,
    types: ['file_shared', 'file_change', 'project_file_uploaded'],
  },
  system: {
    label: 'System',
    icon: <AlertCircle className="h-4 w-4" />,
    types: ['system', 'info', 'warning', 'error', 'organization_alert'],
  },
};

// Notification type icons
const typeIcons: Record<string, React.ReactNode> = {
  mention: <AtSign className="h-5 w-5" />,
  message_mention: <AtSign className="h-5 w-5" />,
  message_reply: <MessageSquare className="h-5 w-5" />,
  reply: <MessageSquare className="h-5 w-5" />,
  thread_reply: <MessageSquare className="h-5 w-5" />,
  decision: <Gavel className="h-5 w-5" />,
  blocker: <AlertOctagon className="h-5 w-5" />,
  file_shared: <FileText className="h-5 w-5" />,
  file_change: <FileText className="h-5 w-5" />,
  project_member_added: <Briefcase className="h-5 w-5" />,
  project_status_changed: <Briefcase className="h-5 w-5" />,
  project_file_uploaded: <FileText className="h-5 w-5" />,
  organization_alert: <Building2 className="h-5 w-5" />,
  system: <AlertCircle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  error: <XCircle className="h-5 w-5" />,
};

// Notification type colors
const typeColors: Record<string, string> = {
  mention: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  message_mention: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  message_reply: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  reply: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  thread_reply: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  decision: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  blocker: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  file_shared: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  file_change: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  project_member_added: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  project_status_changed: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  project_file_uploaded: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  organization_alert: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  system: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  info: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  error: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

// Priority badges
const priorityVariants = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
} as const;

type FilterType = 'all' | 'unread' | 'read';

// =============================================================================
// Helper Components
// =============================================================================

// Project Badge for Notification
function NotificationProjectBadge({ projectId, projectName }: { projectId: string; projectName: string }) {
  return (
    <Link
      to={`/projects/${projectId}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 hover:bg-accent-200 dark:hover:bg-accent-900/50 transition-colors truncate max-w-[140px]"
      title={`Project: ${projectName}`}
    >
      <FolderOpen className="w-2.5 h-2.5 flex-shrink-0" />
      <span className="truncate">{projectName}</span>
    </Link>
  );
}

// Category Filter Pills
function CategoryFilters({
  selected,
  onChange,
  counts,
}: {
  selected: NotificationCategory;
  onChange: (category: NotificationCategory) => void;
  counts: Record<NotificationCategory, number>;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
      {(Object.entries(CATEGORY_CONFIG) as [NotificationCategory, typeof CATEGORY_CONFIG['all']][]).map(
        ([key, config]) => {
          const count = counts[key] || 0;
          const isSelected = selected === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                isSelected
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              )}
              aria-pressed={isSelected}
            >
              {config.icon}
              <span>{config.label}</span>
              {count > 0 && key !== 'all' && (
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full',
                    isSelected ? 'bg-white/20' : 'bg-neutral-200 dark:bg-neutral-700'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        }
      )}
    </div>
  );
}

// Notification Item Component
function NotificationItem({
  notification,
  formatRelativeTime,
  onNotificationClick,
  onMarkAsRead,
  onDelete,
}: {
  notification: Notification;
  formatRelativeTime: (date: string) => string;
  onNotificationClick: (notification: Notification) => void;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const typeColor = typeColors[notification.type] || 'bg-neutral-100 text-neutral-600';
  const typeIcon = typeIcons[notification.type] || <Bell className="h-5 w-5" />;

  return (
    <li
      className={cn(
        'border-b border-neutral-100 dark:border-neutral-800 last:border-0 transition-colors',
        !notification.isRead && 'bg-primary-50/30 dark:bg-primary-900/10'
      )}
    >
      <div className="flex items-start gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        {/* Icon */}
        <div
          className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', typeColor)}
          aria-hidden="true"
        >
          {typeIcon}
        </div>

        {/* Content */}
        <button
          onClick={() => onNotificationClick(notification)}
          className="flex-1 text-left min-w-0"
          aria-label={`${notification.title}: ${notification.message || notification.body}. ${!notification.isRead ? 'Unread.' : ''} ${formatRelativeTime(notification.createdAt)}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {!notification.isRead && (
                <div className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0" aria-label="Unread" />
              )}
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100">{notification.title}</h3>
              {notification.priority === 'high' || notification.priority === 'urgent' ? (
                <Badge variant={priorityVariants[notification.priority]} size="sm">
                  {notification.priority}
                </Badge>
              ) : null}
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap flex-shrink-0">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>
          {/* Project context badge */}
          {notification.projectId && notification.projectName && (
            <div className="mt-1">
              <NotificationProjectBadge projectId={notification.projectId} projectName={notification.projectName} />
            </div>
          )}
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
            {notification.message || notification.body}
          </p>
          {notification.actionUrl && (
            <div className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 mt-2">
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
                onMarkAsRead(notification.id);
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
              onDelete(notification.id);
            }}
            className="text-neutral-400 hover:text-error-600"
            aria-label={`Delete notification: ${notification.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Use both contexts for backwards compatibility during migration
  const activeProjectContext = useActiveProject();
  const projectContext = useProjectContext();

  // Prefer new ProjectContext, fall back to legacy ActiveProjectContext
  const currentProject = projectContext?.currentProject ?? activeProjectContext?.activeProject ?? null;
  const hasProjectContext = !!currentProject;

  const {
    state,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [filter, setFilter] = React.useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = React.useState<NotificationCategory>('all');
  const [isMarkingProjectRead, setIsMarkingProjectRead] = React.useState(false);

  // Refetch when project changes
  const projectIdRef = React.useRef(currentProject?.id);
  React.useEffect(() => {
    if (currentProject?.id !== projectIdRef.current) {
      projectIdRef.current = currentProject?.id;
      fetchNotifications();
    }
  }, [currentProject?.id, fetchNotifications]);

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

  // Get notification category from type
  const getNotificationCategory = (notification: Notification): NotificationCategory => {
    const metadata = notification.metadata || notification.data;
    if (metadata?.category) return metadata.category as NotificationCategory;

    // Infer from type
    for (const [category, config] of Object.entries(CATEGORY_CONFIG) as [NotificationCategory, typeof CATEGORY_CONFIG['all']][]) {
      if (config.types.includes(notification.type)) {
        return category;
      }
    }
    return 'system';
  };

  // Filter notifications
  const filteredNotifications = React.useMemo(() => {
    let filtered = [...state.notifications];

    // Apply current project filter when a project is selected
    if (hasProjectContext && currentProject) {
      filtered = filtered.filter((n) => n.projectId === currentProject.id);
    }

    // Filter by read status
    if (filter === 'unread') {
      filtered = filtered.filter((n) => !n.isRead);
    } else if (filter === 'read') {
      filtered = filtered.filter((n) => n.isRead);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      const categoryTypes = CATEGORY_CONFIG[selectedCategory].types;
      filtered = filtered.filter((n) => {
        const category = getNotificationCategory(n);
        return category === selectedCategory || categoryTypes.includes(n.type);
      });
    }

    return filtered;
  }, [state.notifications, filter, selectedCategory, hasProjectContext, currentProject]);

  // Calculate category counts
  const categoryCounts = React.useMemo(() => {
    let baseNotifications = [...state.notifications];

    // Apply project filter for counts
    if (hasProjectContext && currentProject) {
      baseNotifications = baseNotifications.filter((n) => n.projectId === currentProject.id);
    }

    // Apply read filter for counts
    if (filter === 'unread') {
      baseNotifications = baseNotifications.filter((n) => !n.isRead);
    } else if (filter === 'read') {
      baseNotifications = baseNotifications.filter((n) => n.isRead);
    }

    const counts: Record<NotificationCategory, number> = {
      all: baseNotifications.length,
      mention: 0,
      decision: 0,
      blocker: 0,
      file_change: 0,
      system: 0,
    };

    for (const notification of baseNotifications) {
      const category = getNotificationCategory(notification);
      if (category in counts && category !== 'all') {
        counts[category]++;
      }
    }

    return counts;
  }, [state.notifications, filter, hasProjectContext, currentProject]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else if (notification.conversationId) {
      navigate(`/messages?conversation=${notification.conversationId}`);
    }
  };

  // Mark all project notifications as read
  const handleMarkProjectAsRead = async () => {
    if (!currentProject) return;

    setIsMarkingProjectRead(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/projects/${currentProject.id}/notifications/read-all`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Refresh notifications
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark project notifications as read:', error);
    } finally {
      setIsMarkingProjectRead(false);
    }
  };

  // Unread count for current view
  const viewUnreadCount = filteredNotifications.filter((n) => !n.isRead).length;

  return (
    <DashboardLayout
      user={user ? { name: user.name || user.email, email: user.email } : undefined}
      breadcrumbs={[{ label: 'Notifications' }]}
    >
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <Link
              to="/projects"
              className="inline-block text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-2"
            >
              &larr; Back to Projects
            </Link>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100" id="notifications-page-heading">
              Notifications
              {hasProjectContext && currentProject && (
                <span className="text-base font-normal text-neutral-500 dark:text-neutral-400 ml-2">
                  for {currentProject.name}
                </span>
              )}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              {viewUnreadCount > 0
                ? `You have ${viewUnreadCount} unread notification${viewUnreadCount !== 1 ? 's' : ''}`
                : "You're all caught up!"}
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
            {viewUnreadCount > 0 && (
              <>
                {hasProjectContext && currentProject ? (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<CheckCheck className="h-4 w-4" aria-hidden="true" />}
                    onClick={handleMarkProjectAsRead}
                    disabled={isMarkingProjectRead}
                    aria-label={`Mark all ${currentProject.name} notifications as read`}
                  >
                    {isMarkingProjectRead ? 'Marking...' : 'Mark Project Read'}
                  </Button>
                ) : (
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
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={<Settings className="h-4 w-4" aria-hidden="true" />}
              onClick={() => navigate('/settings/notifications')}
              aria-label="Notification settings"
              title="Notification preferences"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-4">
          <CategoryFilters selected={selectedCategory} onChange={setSelectedCategory} counts={categoryCounts} />
        </div>

        {/* Status Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Read status filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Status:</span>
                <div
                  className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden"
                  role="group"
                  aria-label="Filter by read status"
                >
                  {(['all', 'unread', 'read'] as FilterType[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        'px-3 py-1.5 text-sm font-medium transition-colors',
                        filter === f
                          ? 'bg-primary-600 text-white'
                          : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                      )}
                      aria-pressed={filter === f}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results count */}
              <span className="text-sm text-neutral-500 dark:text-neutral-400 ml-auto">
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
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    formatRelativeTime={formatRelativeTime}
                    onNotificationClick={handleNotificationClick}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                  />
                ))}
              </ul>
            ) : (
              <div className="p-12 text-center">
                <Bell className="h-12 w-12 text-neutral-200 dark:text-neutral-700 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-1">No notifications</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {filter === 'unread'
                    ? "You've read all your notifications!"
                    : filter === 'read'
                      ? 'No read notifications yet.'
                      : selectedCategory !== 'all'
                        ? `No ${CATEGORY_CONFIG[selectedCategory].label.toLowerCase()} notifications.`
                        : "When you get notifications, they'll show up here."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keyboard shortcut hint */}
        <p className="text-xs text-neutral-400 mt-4 text-center">
          <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 font-mono">
            Ctrl
          </kbd>
          {' + '}
          <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 font-mono">
            Shift
          </kbd>
          {' + '}
          <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 font-mono">
            N
          </kbd>
          {' to quickly access notifications from anywhere'}
        </p>

        {/* Live region for screen reader announcements */}
        <div role="status" aria-live="polite" className="sr-only">
          {viewUnreadCount > 0 ? `You have ${viewUnreadCount} unread notifications` : 'No unread notifications'}
        </div>
      </div>
    </DashboardLayout>
  );
}
