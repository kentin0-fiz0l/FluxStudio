/**
 * Notification Center Component
 * Displays and manages all notifications with priority levels and actions
 */

import { useState, useEffect } from 'react';
import { Bell, BellOff, X, Check, Clock, Archive, MoreVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Notification, NotificationType } from '../../types/messaging';
import { messagingService } from '../../services/messagingService';
import { cn } from '../../lib/utils';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const notificationIcons = {
  message: Bell,
  mention: Bell,
  file_shared: Archive,
  approval_request: Check,
  approval_status: Check,
  milestone: Check,
  consultation: Clock,
  deadline: Clock,
  system: Bell,
  announcement: Bell,
  invitation: Bell,
  comment: Bell,
  activity: Bell,
};

const priorityColors = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-blue-500 text-white',
  low: 'bg-gray-500 text-white',
};

export function NotificationCenter({ isOpen, onClose, className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions' | 'priority'>('all');
  const [selectedType, _setSelectedType] = useState<NotificationType | 'all'>('all');

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await messagingService.getNotifications({
        limit: 50,
        unreadOnly: filter === 'unread',
        type: selectedType !== 'all' ? selectedType : undefined,
      });
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await messagingService.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await messagingService.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleSnooze = async (notificationId: string, hours: number) => {
    try {
      const snoozeUntil = new Date();
      snoozeUntil.setHours(snoozeUntil.getHours() + hours);

      await messagingService.snoozeNotification(notificationId, snoozeUntil);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isSnoozed: true, snoozeUntil } : n)
      );
    } catch (error) {
      console.error('Failed to snooze notification:', error);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.isRead) return false;
    if (filter === 'mentions' && notification.type !== 'mention') return false;
    if (filter === 'priority' && notification.priority === 'low') return false;
    return true;
  });

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const today = new Date();
    const notificationDate = new Date(notification.createdAt);
    const isToday = notificationDate.toDateString() === today.toDateString();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = notificationDate.toDateString() === yesterday.toDateString();

    let group = 'Older';
    if (isToday) group = 'Today';
    else if (isYesterday) group = 'Yesterday';

    if (!groups[group]) groups[group] = [];
    groups[group].push(notification);

    return groups;
  }, {} as Record<string, Notification[]>);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const NotificationItem = ({ notification }: { notification: Notification }) => {
    const IconComponent = notificationIcons[notification.type];

    return (
      <div
        className={cn(
          "flex items-start gap-3 p-4 border-b hover:bg-accent/50 transition-colors",
          !notification.isRead && "bg-blue-50 dark:bg-blue-950/20"
        )}
      >
        {/* Icon & Priority */}
        <div className="relative">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            priorityColors[notification.priority]
          )}>
            <IconComponent className="w-4 h-4" />
          </div>
          {!notification.isRead && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1">
              <h4 className="font-medium text-sm">{notification.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {notification.message}
              </p>
            </div>

            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs text-muted-foreground">
                {formatTime(notification.createdAt)}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {!notification.isRead && (
                    <DropdownMenuItem onClick={() => handleMarkAsRead(notification.id)}>
                      <Check className="w-4 h-4 mr-2" />
                      Mark as read
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleSnooze(notification.id, 1)}>
                    <Clock className="w-4 h-4 mr-2" />
                    Snooze 1 hour
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSnooze(notification.id, 24)}>
                    <Clock className="w-4 h-4 mr-2" />
                    Snooze 1 day
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Summary/Preview */}
          {notification.summary && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mt-2">
              {notification.summary}
            </p>
          )}

          {/* Avatar & Related Users */}
          {notification.metadata?.relatedUsers && notification.metadata.relatedUsers.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex -space-x-2">
                {notification.metadata.relatedUsers.slice(0, 3).map(user => (
                  <Avatar key={user.id} className="w-6 h-6 border-2 border-background">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-xs">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {notification.metadata.relatedUsers.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{notification.metadata.relatedUsers.length - 3} others
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {notification.actions.map(action => (
                <Button
                  key={action.id}
                  variant={action.variant || 'outline'}
                  size="sm"
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Tags */}
          {notification.metadata?.tags && notification.metadata.tags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {notification.metadata.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className={cn("fixed inset-0 z-50 bg-black/20", className)}>
      <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <h2 className="font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <Badge className="bg-blue-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                <Check className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
              <TabsTrigger value="mentions" className="text-xs">Mentions</TabsTrigger>
              <TabsTrigger value="priority" className="text-xs">Priority</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Notification List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-4">
                  <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <BellOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">No notifications</p>
              <p className="text-sm text-muted-foreground">
                You're all caught up! New notifications will appear here.
              </p>
            </div>
          ) : (
            <div>
              {Object.entries(groupedNotifications).map(([group, groupNotifications]) => (
                <div key={group}>
                  <div className="sticky top-0 bg-background/95 backdrop-blur-sm px-4 py-2 border-b">
                    <h3 className="text-sm font-medium text-muted-foreground">{group}</h3>
                  </div>
                  {groupNotifications.map(notification => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export default NotificationCenter;