/**
 * NotificationsBell Component
 *
 * A compact bell icon with unread badge that opens a dropdown showing recent
 * notifications. Integrates with useNotifications hook for REST API and
 * WebSocket updates.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Check, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { useNotifications } from '../../hooks/useNotifications';
import { cn } from '../../lib/utils';

interface NotificationsBellProps {
  className?: string;
}

// Map notification types to navigation routes
const getNotificationRoute = (notification: {
  type: string;
  conversationId?: string;
  projectId?: string;
  entityId?: string;
}): string | null => {
  switch (notification.type) {
    case 'message':
    case 'mention':
      return notification.conversationId
        ? `/messages?conversation=${notification.conversationId}`
        : '/messages';
    case 'approval_request':
    case 'approval_status':
      return notification.projectId
        ? `/projects/${notification.projectId}`
        : '/projects';
    case 'milestone':
    case 'deadline':
      return notification.projectId
        ? `/projects/${notification.projectId}`
        : '/projects';
    case 'consultation':
      return '/consultations';
    case 'file_shared':
      return notification.projectId
        ? `/projects/${notification.projectId}/files`
        : '/files';
    default:
      return null;
  }
};

// Format relative time
const formatRelativeTime = (date: Date | string): string => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
};

// Priority colors
const priorityDot: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-gray-400',
};

export function NotificationsBell({ className }: NotificationsBellProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: _refresh,
  } = useNotifications({
    autoConnect: true,
    autoLoad: true,
    limit: 10,
  });

  // Handle notification click - navigate and mark as read
  const handleNotificationClick = useCallback((notification: {
    id: string;
    type: string;
    conversationId?: string;
    projectId?: string;
    entityId?: string;
    isRead: boolean;
  }) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate to relevant page
    const route = getNotificationRoute(notification);
    if (route) {
      setIsOpen(false);
      navigate(route);
    }
  }, [markAsRead, navigate]);

  // Handle view all click
  const handleViewAll = useCallback(() => {
    setIsOpen(false);
    navigate('/notifications');
  }, [navigate]);

  // Handle mark all as read
  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  // Recent notifications (max 5 in dropdown)
  const recentNotifications = notifications.slice(0, 5);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <Badge
                variant="error"
                className="relative h-5 min-w-5 rounded-full px-1.5 text-xs font-medium"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-80">
          {isLoading && notifications.length === 0 ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-2 bg-muted rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="p-6 text-center">
              <BellOff className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors cursor-pointer",
                    !notification.isRead && "bg-blue-50/50 dark:bg-blue-950/20"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Priority indicator */}
                  <div className="flex-shrink-0 mt-1.5">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        priorityDot[notification.priority] || priorityDot.medium
                      )}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-sm line-clamp-1",
                        !notification.isRead && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                    )}
                  </div>

                  {/* Unread indicator */}
                  {!notification.isRead && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              className="w-full h-8 text-xs justify-center"
              onClick={handleViewAll}
            >
              View all notifications
              <ExternalLink className="h-3 w-3 ml-1.5" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationsBell;
