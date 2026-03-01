import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Bell,
  Search,
  Filter,
  Settings,
  X,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

import type { NotificationCenterProps, FilterState } from './notifications/types';
import { NotificationItem } from './notifications/NotificationItem';
import { FilterPanel } from './notifications/FilterPanel';

export function NotificationCenter({ isOpen = true, onClose, className = '' }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    criticalCount,
    groupedNotifications: _groupedNotifications,
    preferences: _preferences,
    markAsRead,
    markAllAsRead,
    markAsArchived,
    snoozeNotification,
    executeAction,
    dismissNotification,
    filterNotifications: _filterNotifications,
    clearAll,
    updatePreferences: _updatePreferences,
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
    <div className={`bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg relative z-40 ${className}`}>
      {/* Header */}
      <div className="relative border-b border-gray-200 dark:border-neutral-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-gray-700 dark:text-neutral-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
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
              <Settings size={16} aria-hidden="true" />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-md text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <Filter size={16} aria-hidden="true" />
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
            <Bell size={32} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
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
        <div className="border-t border-gray-200 dark:border-neutral-700 p-3">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-neutral-400">
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
