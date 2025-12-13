/**
 * Unified Notification Center
 *
 * Centralized notification dropdown for all platform activities.
 * Integrates with NotificationContext for real-time messaging notifications.
 *
 * Features:
 * - Real-time notifications via WebSocket
 * - Mark as read (single/all)
 * - Deep linking to conversations/messages/threads
 * - Filter by type and read status
 * - Accessible keyboard navigation
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Bell,
  BellOff,
  CheckCheck,
  X,
  MessageSquare,
  AtSign,
  Reply,
  FileText,
  AlertCircle,
  Info,
  Folder
} from 'lucide-react';
import { useNotifications, Notification, NotificationType } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Icon mapping for notification types
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'mention':
      return AtSign;
    case 'reply':
    case 'thread_reply':
      return Reply;
    case 'file_shared':
      return FileText;
    case 'message_mention':
    case 'message_reply':
      return MessageSquare;
    case 'project_member_added':
    case 'project_status_changed':
    case 'project_file_uploaded':
      return Folder;
    case 'warning':
    case 'error':
      return AlertCircle;
    default:
      return Info;
  }
};

// Color mapping for notification types
const getTypeColor = (type: NotificationType) => {
  switch (type) {
    case 'mention':
      return 'text-purple-600 bg-purple-100';
    case 'reply':
      return 'text-blue-600 bg-blue-100';
    case 'thread_reply':
      return 'text-indigo-600 bg-indigo-100';
    case 'file_shared':
      return 'text-green-600 bg-green-100';
    case 'warning':
      return 'text-orange-600 bg-orange-100';
    case 'error':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

// Time formatting
const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
};

export function UnifiedNotificationCenter() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all');

  // Try to get notifications context
  let notifications: Notification[] = [];
  let unreadCount = 0;
  let loading = false;
  let markAsRead: ((id: string) => Promise<void>) | undefined;
  let markAllAsRead: (() => Promise<void>) | undefined;

  try {
    const context = useNotifications();
    notifications = context.state.notifications;
    unreadCount = context.state.unreadCount;
    loading = context.state.loading;
    markAsRead = context.markAsRead;
    markAllAsRead = context.markAllAsRead;
  } catch {
    // Context not available - show empty state
  }

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (filter === 'mentions') {
      filtered = filtered.filter(n => n.type === 'mention' || n.type === 'message_mention');
    }

    // Sort by created date (newest first)
    return filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 20); // Limit to 20
  }, [notifications, filter]);

  const mentionCount = notifications.filter(
    n => (n.type === 'mention' || n.type === 'message_mention') && !n.isRead
  ).length;

  // Handle notification click with deep linking
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead && markAsRead) {
      await markAsRead(notification.id);
    }

    // Build navigation URL
    let targetUrl = notification.actionUrl;

    if (!targetUrl && notification.conversationId) {
      targetUrl = `/messages/${notification.conversationId}`;

      if (notification.messageId) {
        targetUrl += `?message=${notification.messageId}`;
      }

      if (notification.threadRootMessageId) {
        targetUrl += targetUrl.includes('?') ? '&' : '?';
        targetUrl += `thread=${notification.threadRootMessageId}`;
      }
    }

    if (targetUrl) {
      setIsOpen(false);
      navigate(targetUrl);
    }
  };

  const handleMarkAllRead = async () => {
    if (markAllAsRead) {
      await markAllAsRead();
    }
  };

  return (
    <>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        className="relative h-9 px-3 text-gray-300 hover:text-white hover:bg-gray-700/50"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-12 right-0 z-50"
            >
              <Card className="w-96 max-h-[600px] flex flex-col shadow-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Bell className="h-4 w-4" />
                      Notifications
                      {unreadCount > 0 && (
                        <Badge variant="error" className="h-5 px-1.5">
                          {unreadCount}
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllRead}
                        disabled={unreadCount === 0}
                        title="Mark all as read"
                        className="h-8 w-8 p-0"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsOpen(false)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Filters */}
                <div className="px-4 py-2 border-b bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-1">
                    <Button
                      variant={filter === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setFilter('all')}
                      className="h-7 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      variant={filter === 'unread' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setFilter('unread')}
                      className="h-7 text-xs"
                    >
                      Unread
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                          {unreadCount}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant={filter === 'mentions' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setFilter('mentions')}
                      className="h-7 text-xs"
                    >
                      Mentions
                      {mentionCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                          {mentionCount}
                        </Badge>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Notifications List */}
                <ScrollArea className="flex-1 max-h-[400px]">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto" />
                      <p className="text-gray-500 mt-2 text-sm">Loading...</p>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-8">
                      <BellOff className="mx-auto text-gray-400 mb-2 h-8 w-8" />
                      <p className="text-gray-500 text-sm">
                        {filter === 'unread' ? 'No unread notifications' :
                         filter === 'mentions' ? 'No mentions' :
                         'No notifications yet'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {filteredNotifications.map(notification => {
                        const Icon = getNotificationIcon(notification.type);
                        const colorClass = getTypeColor(notification.type);
                        const isNavigable = !!(notification.actionUrl || notification.conversationId);

                        return (
                          <div
                            key={notification.id}
                            className={cn(
                              "p-3 rounded-lg mb-2 transition-all",
                              notification.isRead
                                ? "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                                : "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30",
                              isNavigable && "cursor-pointer"
                            )}
                            onClick={() => handleNotificationClick(notification)}
                            role={isNavigable ? "button" : undefined}
                            tabIndex={isNavigable ? 0 : undefined}
                            onKeyDown={(e) => {
                              if (isNavigable && e.key === 'Enter') {
                                handleNotificationClick(notification);
                              }
                            }}
                          >
                            <div className="flex gap-3">
                              {/* Actor avatar or type icon */}
                              {notification.actor ? (
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  {notification.actor.avatarUrl && (
                                    <AvatarImage src={notification.actor.avatarUrl} />
                                  )}
                                  <AvatarFallback className="text-xs">
                                    {notification.actor.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                  colorClass
                                )}>
                                  <Icon className="h-4 w-4" />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "text-sm leading-tight",
                                      notification.isRead ? "text-gray-900 dark:text-gray-100" : "font-medium text-gray-900 dark:text-white"
                                    )}>
                                      {notification.title}
                                    </p>
                                    {(notification.body || notification.message) && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                                        {notification.body || notification.message}
                                      </p>
                                    )}
                                  </div>
                                  {!notification.isRead && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-xs text-gray-500 dark:text-gray-500">
                                    {formatTimeAgo(notification.createdAt)}
                                  </span>
                                  {notification.actor && (
                                    <span className="text-xs text-gray-500 dark:text-gray-500">
                                      by {notification.actor.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Footer - View All link */}
                {notifications.length > 0 && (
                  <div className="p-3 border-t bg-gray-50 dark:bg-gray-800/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-sm"
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/notifications');
                      }}
                    >
                      View all notifications
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default UnifiedNotificationCenter;
