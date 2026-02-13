import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  MessageSquare,
  Users,
  FileText,
  AlertCircle,
  Info,
  Star,
  Settings
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { useSocket } from '../../contexts/SocketContext';
import { cn } from '../../lib/utils';

interface Notification {
  id: string;
  type: 'message' | 'mention' | 'update' | 'alert' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  priority: 'low' | 'medium' | 'high';
  metadata?: Record<string, unknown>;
}

// Factory function to generate initial notifications - called once
const createInitialNotifications = (): Notification[] => {
  const now = Date.now();
  return [
    {
      id: '1',
      type: 'message',
      title: 'New message from Sarah',
      message: 'Hey! Can you review the latest design mockups?',
      timestamp: new Date(now - 300000),
      read: false,
      actionUrl: '/messages/sarah',
      actionLabel: 'View Message',
      priority: 'medium'
    },
    {
      id: '2',
      type: 'mention',
      title: 'You were mentioned in Project Alpha',
      message: '@you Please check the timeline for Q4 deliverables',
      timestamp: new Date(now - 600000),
      read: false,
      actionUrl: '/projects/alpha',
      actionLabel: 'View Project',
      priority: 'high'
    },
    {
      id: '3',
      type: 'update',
      title: 'Project status updated',
      message: 'Project Beta moved to "In Review" status',
      timestamp: new Date(now - 900000),
      read: true,
      priority: 'low'
    },
    {
      id: '4',
      type: 'alert',
      title: 'Deadline approaching',
      message: 'Project Gamma deadline in 2 days',
      timestamp: new Date(now - 1800000),
      read: false,
      actionUrl: '/projects/gamma',
      actionLabel: 'View Project',
      priority: 'high'
    }
  ];
};

export function NotificationCenter() {
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>(createInitialNotifications);

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all');

  // Real-time notifications via WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewNotification = (data: { id: string; type: string; title: string; message: string; timestamp: Date }) => {
      const notification: Notification = {
        ...data,
        type: data.type as Notification['type'],
        read: false,
        priority: 'medium'
      };
      setNotifications(prev => [notification, ...prev]);

      // Show browser notification if permission granted
      if (window.Notification?.permission === 'granted' && !document.hasFocus()) {
        new window.Notification(notification.title, {
          body: notification.message,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png'
        });
      }
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, isConnected]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const mentionCount = notifications.filter(n => n.type === 'mention' && !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'mentions') return n.type === 'mention';
    return true;
  });

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return MessageSquare;
      case 'mention':
        return Users;
      case 'update':
        return FileText;
      case 'alert':
        return AlertCircle;
      case 'success':
        return Check;
      case 'info':
        return Info;
      default:
        return Bell;
    }
  };

  const getColor = (type: string, priority: string) => {
    if (priority === 'high') return 'text-red-500 bg-red-50';
    switch (type) {
      case 'message':
        return 'text-blue-500 bg-blue-50';
      case 'mention':
        return 'text-purple-500 bg-purple-50';
      case 'update':
        return 'text-green-500 bg-green-50';
      case 'alert':
        return 'text-orange-500 bg-orange-50';
      case 'success':
        return 'text-green-500 bg-green-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  // Current time for formatting - useState with lazy initializer
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Update current time when notifications change
  useEffect(() => {
    queueMicrotask(() => {
      setCurrentTime(Date.now());
    });
  }, [notifications]);

  const formatTime = (timestamp: Date) => {
    const seconds = Math.floor((currentTime - timestamp.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <>
      {/* Notification Bell Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
              variant="error"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      <h2 className="text-lg font-semibold">Notifications</h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="font-semibold">{unreadCount}</span> unread
                    </div>
                    {mentionCount > 0 && (
                      <div>
                        <span className="font-semibold">{mentionCount}</span> mentions
                      </div>
                    )}
                  </div>
                </div>

                {/* Filters and Actions */}
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <Tabs value={filter} onValueChange={(v: string) => setFilter(v as typeof filter)} className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="unread">
                          Unread
                          {unreadCount > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {unreadCount}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="mentions">Mentions</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                      className="flex-1"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Mark all read
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAll}
                      disabled={notifications.length === 0}
                      className="flex-1"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear all
                    </Button>
                  </div>
                </div>

                {/* Notifications List */}
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {filteredNotifications.length === 0 ? (
                      <div className="text-center py-12">
                        <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">No notifications</p>
                      </div>
                    ) : (
                      <AnimatePresence>
                        {filteredNotifications.map((notification) => {
                          const Icon = getIcon(notification.type);
                          const colorClass = getColor(notification.type, notification.priority);

                          return (
                            <motion.div
                              key={notification.id}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -100 }}
                              className={cn(
                                'mb-2 p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md',
                                !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                              )}
                              onClick={() => !notification.read && markAsRead(notification.id)}
                            >
                              <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className={cn('p-2 rounded-full', colorClass)}>
                                  <Icon className="h-4 w-4" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                                      {notification.title}
                                    </h4>
                                    {notification.priority === 'high' && (
                                      <Star className="h-3 w-3 text-orange-500 flex-shrink-0" />
                                    )}
                                  </div>

                                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                    {notification.message}
                                  </p>

                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">
                                      {formatTime(notification.timestamp)}
                                    </span>

                                    <div className="flex items-center gap-1">
                                      {notification.actionUrl && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Navigate to action URL
                                            window.location.href = notification.actionUrl!;
                                          }}
                                        >
                                          {notification.actionLabel || 'View'}
                                        </Button>
                                      )}

                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteNotification(notification.id);
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                </ScrollArea>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50">
                  <Button variant="outline" size="sm" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Notification Settings
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
