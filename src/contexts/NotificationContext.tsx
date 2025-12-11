/**
 * NotificationContext - Flux Studio
 *
 * Global notification state management with real-time WebSocket integration.
 * Provides centralized notification handling for the entire application.
 *
 * Features:
 * - Real-time notification updates via Socket.IO
 * - Unread count tracking
 * - Mark as read (single/batch/all)
 * - Toast notifications for new arrivals
 * - Keyboard shortcut support (Ctrl+Shift+N)
 * - Accessible announcements via ARIA live regions
 */

import * as React from 'react';
import { useAuth } from './AuthContext';
import { getApiUrl } from '@/utils/apiHelpers';

// Notification types
export type NotificationType =
  | 'message_mention'
  | 'message_reply'
  | 'project_member_added'
  | 'project_status_changed'
  | 'project_file_uploaded'
  | 'organization_alert'
  | 'system'
  | 'info'
  | 'warning'
  | 'error';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  priority: NotificationPriority;
  isRead: boolean;
  readAt: string | null;
  actionUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  toastQueue: Notification[];
}

export type NotificationAction =
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'UPDATE_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SET_UNREAD_COUNT'; payload: number }
  | { type: 'MARK_ALL_READ' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_TOAST'; payload: Notification }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'CLEAR_TOASTS' };

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  toastQueue: [],
};

function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.isRead).length,
        loading: false,
      };

    case 'ADD_NOTIFICATION':
      // Check if notification already exists
      if (state.notifications.find(n => n.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + (action.payload.isRead ? 0 : 1),
      };

    case 'UPDATE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload.id ? action.payload : n
        ),
        unreadCount: state.notifications.filter(n =>
          n.id === action.payload.id ? !action.payload.isRead : !n.isRead
        ).length,
      };

    case 'REMOVE_NOTIFICATION':
      const removed = state.notifications.find(n => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
        unreadCount: removed && !removed.isRead
          ? state.unreadCount - 1
          : state.unreadCount,
      };

    case 'SET_UNREAD_COUNT':
      return { ...state, unreadCount: action.payload };

    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0,
      };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'ADD_TOAST':
      // Limit toast queue to 5
      const newQueue = [action.payload, ...state.toastQueue].slice(0, 5);
      return { ...state, toastQueue: newQueue };

    case 'REMOVE_TOAST':
      return {
        ...state,
        toastQueue: state.toastQueue.filter(t => t.id !== action.payload),
      };

    case 'CLEAR_TOASTS':
      return { ...state, toastQueue: [] };

    default:
      return state;
  }
}

export interface NotificationContextValue {
  state: NotificationState;
  dispatch: React.Dispatch<NotificationAction>;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  dismissToast: (notificationId: string) => void;
  clearToasts: () => void;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = React.useReducer(notificationReducer, initialState);
  const announcerRef = React.useRef<HTMLDivElement>(null);

  // Fetch notifications from API
  const fetchNotifications = React.useCallback(async () => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl('/notifications'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      dispatch({ type: 'SET_NOTIFICATIONS', payload: data.notifications || [] });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load notifications' });
    }
  }, [user]);

  // Fetch unread count
  const fetchUnreadCount = React.useCallback(async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl('/notifications/unread-count'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_UNREAD_COUNT', payload: data.count || 0 });
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = React.useCallback(async (notificationId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl('/notifications/read'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [notificationId] }),
      });

      if (response.ok) {
        const notification = state.notifications.find(n => n.id === notificationId);
        if (notification) {
          dispatch({
            type: 'UPDATE_NOTIFICATION',
            payload: { ...notification, isRead: true, readAt: new Date().toISOString() },
          });
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [state.notifications]);

  // Mark all as read
  const markAllAsRead = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl('/notifications/read'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ all: true }),
      });

      if (response.ok) {
        dispatch({ type: 'MARK_ALL_READ' });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = React.useCallback(async (notificationId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/notifications/${notificationId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Toast helpers
  const dismissToast = React.useCallback((notificationId: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: notificationId });
  }, []);

  const clearToasts = React.useCallback(() => {
    dispatch({ type: 'CLEAR_TOASTS' });
  }, []);

  // Handle new notification (from WebSocket or internal)
  const handleNewNotification = React.useCallback((notification: Notification) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    dispatch({ type: 'ADD_TOAST', payload: notification });

    // Announce to screen readers
    if (announcerRef.current) {
      announcerRef.current.textContent = `New notification: ${notification.title}. ${notification.message}`;
    }

    // Auto-dismiss toast after 5 seconds
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: notification.id });
    }, 5000);
  }, []);

  // Set up Socket.IO listener for real-time notifications
  React.useEffect(() => {
    if (!user) return;

    // Get socket from window if available (set by SocketProvider)
    const socket = (window as any).__messagingSocket;

    if (socket) {
      // Subscribe to notifications
      socket.emit('notifications:subscribe');

      // Listen for new notifications
      const handleNewNotificationEvent = (notification: Notification) => {
        handleNewNotification(notification);
      };

      // Listen for unread count updates
      const handleUnreadCount = ({ count }: { count: number }) => {
        dispatch({ type: 'SET_UNREAD_COUNT', payload: count });
      };

      // Listen for all marked read
      const handleAllMarkedRead = () => {
        dispatch({ type: 'MARK_ALL_READ' });
      };

      socket.on('notification:new', handleNewNotificationEvent);
      socket.on('notifications:unread-count', handleUnreadCount);
      socket.on('notifications:all-marked-read', handleAllMarkedRead);

      return () => {
        socket.off('notification:new', handleNewNotificationEvent);
        socket.off('notifications:unread-count', handleUnreadCount);
        socket.off('notifications:all-marked-read', handleAllMarkedRead);
      };
    }
  }, [user, handleNewNotification]);

  // Fetch notifications on mount
  React.useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user, fetchNotifications, fetchUnreadCount]);

  // Keyboard shortcut: Ctrl+Shift+N to open notifications
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'N') {
        event.preventDefault();
        // Navigate to notifications page
        window.location.href = '/notifications';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const value: NotificationContextValue = {
    state,
    dispatch,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    dismissToast,
    clearToasts,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* ARIA Live Region for screen reader announcements */}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
