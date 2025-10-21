import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Search,
  Filter,
  Settings,
  X,
  Check,
  Archive,
  Clock,
  AlertTriangle,
  MessageSquare,
  FileText,
  Calendar,
  Users,
  Star,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import {
  Notification,
  NotificationType,
  Priority,
  NotificationAction
} from '../../types/messaging';

interface NotificationCenterProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onArchive: (id: string) => void;
  onSnooze: (id: string, until: Date) => void;
  onExecuteAction: (id: string, actionId: string, data?: any) => void;
  onDismiss: (id: string) => void;
}

interface FilterState {
  priorities: Priority[];
  types: NotificationType[];
  status: 'all' | 'unread' | 'read';
  timeRange: 'all' | 'today' | 'week' | 'month';
}

const NotificationIcon = ({ type }: { type: NotificationType }) => {
  const iconMap = {
    message: MessageSquare,
    mention: Users,
    file_shared: FileText,
    approval_request: Star,
    approval_status: Check,
    milestone: Calendar,
    consultation: Users,
    deadline: AlertTriangle,
    system: Settings,
    announcement: Bell,
    invitation: Users,
    comment: MessageSquare,
    activity: Bell,
  };

  const Icon = iconMap[type] || Bell;
  return <Icon size={16} />;
};

const PriorityIndicator = ({ priority }: { priority: Priority }) => {
  const colors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };

  return (
    <div className={`w-2 h-2 rounded-full ${colors[priority]} flex-shrink-0`} />
  );
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const dateObj = date instanceof Date ? date : new Date(date);

  // Check if the date is valid
  if (isNaN(dateObj.getTime())) return 'Invalid date';

  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

function NotificationItem({
  notification,
  onMarkAsRead,
  onArchive,
  onSnooze,
  onExecuteAction,
  onDismiss
}: NotificationItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleAction = (action: NotificationAction) => {
    onExecuteAction(notification.id, action.id, action.data);
  };

  const handleSnooze = () => {
    const until = new Date();
    until.setHours(until.getHours() + 1); // Snooze for 1 hour
    onSnooze(notification.id, until);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className={`relative group border-b border-gray-100 last:border-b-0 ${
        !notification.isRead ? 'bg-blue-50' : 'bg-white'
      } hover:bg-gray-50 transition-colors`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Priority indicator */}
          <PriorityIndicator priority={notification.priority} />

          {/* Avatar/Icon */}
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            {notification.avatar ? (
              <img
                src={notification.avatar}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <NotificationIcon type={notification.type} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-medium text-gray-900 ${
                    !notification.isRead ? 'font-semibold' : ''
                  }`}>
                    {notification.title}
                  </h4>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                </div>

                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {notification.message}
                </p>

                {notification.summary && notification.summary !== notification.title && (
                  <p className="text-xs text-gray-500 mt-1">
                    {notification.summary}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span>{formatTimeAgo(notification.createdAt)}</span>
                  {notification.metadata?.category && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{notification.metadata.category}</span>
                    </>
                  )}
                  {notification.groupCount && notification.groupCount > 1 && (
                    <>
                      <span>•</span>
                      <span>{notification.groupCount} items</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-gray-400">
                  {formatTimeAgo(notification.createdAt)}
                </span>

                <AnimatePresence>
                  {showActions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1 ml-2"
                    >
                      {!notification.isRead && (
                        <button
                          onClick={() => onMarkAsRead(notification.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Mark as read"
                        >
                          <Eye size={14} />
                        </button>
                      )}

                      <button
                        onClick={handleSnooze}
                        className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
                        title="Snooze for 1 hour"
                      >
                        <Clock size={14} />
                      </button>

                      <button
                        onClick={() => onArchive(notification.id)}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Archive"
                      >
                        <Archive size={14} />
                      </button>

                      <button
                        onClick={() => onDismiss(notification.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Dismiss"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Actions */}
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {notification.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                      action.variant === 'primary'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : action.variant === 'destructive'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Thumbnail */}
            {notification.thumbnail && (
              <div className="mt-3">
                <img
                  src={notification.thumbnail}
                  alt=""
                  className="w-24 h-16 object-cover rounded-md"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FilterPanel({
  filter,
  onFilterChange,
  isVisible,
  onClose
}: {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  isVisible: boolean;
  onClose: () => void;
}) {
  const priorities: Priority[] = ['critical', 'high', 'medium', 'low'];
  const types: NotificationType[] = [
    'message', 'mention', 'file_shared', 'approval_request', 'approval_status',
    'milestone', 'consultation', 'deadline', 'system', 'announcement',
    'invitation', 'comment', 'activity'
  ];

  const togglePriority = (priority: Priority) => {
    const newPriorities = filter.priorities.includes(priority)
      ? filter.priorities.filter(p => p !== priority)
      : [...filter.priorities, priority];
    onFilterChange({ ...filter, priorities: newPriorities });
  };

  const toggleType = (type: NotificationType) => {
    const newTypes = filter.types.includes(type)
      ? filter.types.filter(t => t !== type)
      : [...filter.types, type];
    onFilterChange({ ...filter, types: newTypes });
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 mt-1"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Filter Notifications</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>

      {/* Status Filter */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 block mb-2">Status</label>
        <div className="flex gap-2">
          {(['all', 'unread', 'read'] as const).map((status) => (
            <button
              key={status}
              onClick={() => onFilterChange({ ...filter, status })}
              className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                filter.status === status
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Priority Filter */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 block mb-2">Priority</label>
        <div className="flex gap-2 flex-wrap">
          {priorities.map((priority) => (
            <button
              key={priority}
              onClick={() => togglePriority(priority)}
              className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                filter.priorities.includes(priority)
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {priority}
            </button>
          ))}
        </div>
      </div>

      {/* Time Range */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 block mb-2">Time Range</label>
        <div className="flex gap-2">
          {(['all', 'today', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => onFilterChange({ ...filter, timeRange: range })}
              className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                filter.timeRange === range
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Type Filter */}
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-2">Types</label>
        <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`px-2 py-1 text-xs rounded text-left transition-colors ${
                filter.types.includes(type)
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationCenter({ isOpen = true, onClose, className = '' }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    criticalCount,
    groupedNotifications,
    preferences,
    markAsRead,
    markAllAsRead,
    markAsArchived,
    snoozeNotification,
    executeAction,
    dismissNotification,
    filterNotifications,
    clearAll,
    updatePreferences,
    isLoading,
    error,
    refresh
  } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [filter, setFilter] = useState<FilterState>({
    priorities: ['critical', 'high', 'medium', 'low'],
    types: [
      'message', 'mention', 'file_shared', 'approval_request', 'approval_status',
      'milestone', 'consultation', 'deadline', 'system', 'announcement',
      'invitation', 'comment', 'activity'
    ],
    status: 'all',
    timeRange: 'all'
  });

  // Apply filters to notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filter.status === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (filter.status === 'read') {
      filtered = filtered.filter(n => n.isRead);
    }

    // Apply priority filter
    if (filter.priorities.length > 0) {
      filtered = filtered.filter(n => filter.priorities.includes(n.priority));
    }

    // Apply type filter
    if (filter.types.length > 0) {
      filtered = filtered.filter(n => filter.types.includes(n.type));
    }

    // Apply time range filter
    if (filter.timeRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();

      switch (filter.timeRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(n => n.createdAt >= cutoff);
    }

    return filtered.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime);
    });
  }, [notifications, searchQuery, filter]);

  const handleClearFilters = () => {
    setFilter({
      priorities: ['critical', 'high', 'medium', 'low'],
      types: [
        'message', 'mention', 'file_shared', 'approval_request', 'approval_status',
        'milestone', 'consultation', 'deadline', 'system', 'announcement',
        'invitation', 'comment', 'activity'
      ],
      status: 'all',
      timeRange: 'all'
    });
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-lg relative z-40 ${className}`}>
      {/* Header */}
      <div className="relative border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
            {criticalCount > 0 && (
              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                {criticalCount} critical
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all read
              </button>
            )}

            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Notification preferences"
            >
              <Settings size={16} />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative z-50">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`p-2 border border-gray-200 rounded-md transition-colors ${
                showFilterPanel ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
              }`}
              title="Filter notifications"
            >
              <Filter size={16} />
            </button>

            <FilterPanel
              filter={filter}
              onFilterChange={setFilter}
              isVisible={showFilterPanel}
              onClose={() => setShowFilterPanel(false)}
            />
          </div>
        </div>

        {/* Active filters indicator */}
        {(searchQuery || filter.status !== 'all' || filter.timeRange !== 'all' ||
          filter.priorities.length !== 4 || filter.types.length !== 13) && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">Filters active:</span>
            <button
              onClick={handleClearFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto relative z-30">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={refresh}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">
              {notifications.length === 0 ? 'No notifications yet' : 'No notifications match your filters'}
            </p>
            {notifications.length > 0 && (
              <button
                onClick={handleClearFilters}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div>
            <AnimatePresence>
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onArchive={markAsArchived}
                  onSnooze={snoozeNotification}
                  onExecuteAction={executeAction}
                  onDismiss={dismissNotification}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{filteredNotifications.length} of {notifications.length} notifications</span>
            <button
              onClick={clearAll}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;