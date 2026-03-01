import type {
  Notification,
  NotificationType,
  Priority,
} from '../../../types/messaging';

export type { Notification, NotificationType, Priority };

export interface NotificationCenterProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onArchive: (id: string) => void;
  onSnooze: (id: string, until: Date) => void;
  onExecuteAction: (id: string, actionId: string, data?: unknown) => void;
  onDismiss: (id: string) => void;
}

export interface FilterState {
  priorities: Priority[];
  types: NotificationType[];
  status: 'all' | 'unread' | 'read';
  timeRange: 'all' | 'today' | 'week' | 'month';
}
