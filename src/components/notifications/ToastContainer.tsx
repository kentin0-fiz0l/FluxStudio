/**
 * ToastContainer - Flux Studio
 *
 * Global toast notification container for displaying real-time notifications.
 * Uses FluxStudio design tokens for consistent styling.
 *
 * Features:
 * - Animated entry/exit with smooth transitions
 * - Auto-dismiss after configurable duration
 * - Click to navigate to notification action
 * - Accessible with ARIA live regions
 * - Keyboard dismissable
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, MessageSquare, Briefcase, Building2, AlertCircle, Info, AlertTriangle, XCircle } from 'lucide-react';
import { useNotifications, Notification, NotificationType } from '@/contexts/NotificationContext';
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
const typeColors: Record<NotificationType, { bg: string; icon: string; border: string }> = {
  message_mention: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
  message_reply: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
  project_member_added: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' },
  project_status_changed: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
  project_file_uploaded: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-200' },
  organization_alert: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-200' },
  system: { bg: 'bg-neutral-50', icon: 'text-neutral-600', border: 'border-neutral-200' },
  info: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
  warning: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
  error: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
};

interface ToastItemProps {
  notification: Notification;
  onDismiss: () => void;
  onNavigate: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ notification, onDismiss, onNavigate }) => {
  const [isExiting, setIsExiting] = React.useState(false);
  const colors = typeColors[notification.type] || typeColors.info;

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 200);
  };

  const handleClick = () => {
    if (notification.actionUrl) {
      onNavigate();
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleDismiss();
    } else if (e.key === 'Enter' && notification.actionUrl) {
      onNavigate();
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-sm',
        'transform transition-all duration-200 ease-out',
        colors.bg,
        colors.border,
        isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100',
        notification.actionUrl && 'cursor-pointer hover:shadow-xl'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0 mt-0.5', colors.icon)} aria-hidden="true">
        {typeIcons[notification.type] || <Bell className="h-5 w-5" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-neutral-900">
          {notification.title}
        </p>
        <p className="text-sm text-neutral-600 line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        {notification.actionUrl && (
          <p className="text-xs text-primary-600 mt-1">Click to view</p>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="flex-shrink-0 p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200/50 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const navigate = useNavigate();

  // Try to get notifications context
  let toastQueue: Notification[] = [];
  let dismissToast: ((id: string) => void) | undefined;
  let markAsRead: ((id: string) => Promise<void>) | undefined;

  try {
    const notificationContext = useNotifications();
    toastQueue = notificationContext.state.toastQueue;
    dismissToast = notificationContext.dismissToast;
    markAsRead = notificationContext.markAsRead;
  } catch {
    // Context not available
    return null;
  }

  const handleNavigate = async (notification: Notification) => {
    if (markAsRead) {
      await markAsRead(notification.id);
    }
    if (dismissToast) {
      dismissToast(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  if (toastQueue.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full"
      aria-label="Notifications"
    >
      {toastQueue.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onDismiss={() => dismissToast?.(notification.id)}
          onNavigate={() => handleNavigate(notification)}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
