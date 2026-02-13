/**
 * Notification Slice - Global notification state
 *
 * Migrated from NotificationContext.tsx
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';
import { getApiUrl } from '../../utils/apiHelpers';

// ============================================================================
// Types
// ============================================================================

export type NotificationType =
  | 'mention' | 'reply' | 'thread_reply' | 'file_shared'
  | 'decision' | 'blocker' | 'assignment' | 'file_change'
  | 'message_mention' | 'message_reply'
  | 'project_member_added' | 'project_status_changed' | 'project_file_uploaded'
  | 'organization_alert' | 'system'
  | 'success' | 'info' | 'warning' | 'error';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationActor {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  message?: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  priority?: NotificationPriority;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  actorUserId?: string;
  actor?: NotificationActor;
  conversationId?: string;
  messageId?: string;
  threadRootMessageId?: string;
  assetId?: string;
  projectId?: string | null;
  projectName?: string | null;
  actionUrl?: string | null;
  expiresAt?: string | null;
  entityId?: string;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  toastQueue: Notification[];
}

export interface NotificationActions {
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  dismissToast: (notificationId: string) => void;
  clearToasts: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'readAt' | 'userId'>) => void;
  addToast: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'readAt' | 'userId'>) => void;
  showNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'readAt' | 'userId'>) => void;
  handleNewNotification: (notification: Notification) => void;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  resetNotifications: () => void;
}

export interface NotificationSlice {
  notifications: NotificationState & NotificationActions;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  toastQueue: [],
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createNotificationSlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  NotificationSlice
> = (set, get) => ({
  notifications: {
    ...initialState,

    fetchNotifications: async () => {
      const user = get().auth.user;
      if (!user) return;

      set((state) => { state.notifications.loading = true; });

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(getApiUrl('/notifications'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch notifications');
        const data = await response.json();
        const notifs = data.notifications || [];
        set((state) => {
          state.notifications.notifications = notifs;
          state.notifications.unreadCount = notifs.filter((n: Notification) => !n.isRead).length;
          state.notifications.loading = false;
        });
      } catch {
        set((state) => {
          state.notifications.error = 'Failed to load notifications';
          state.notifications.loading = false;
        });
      }
    },

    markAsRead: async (notificationId) => {
      const notif = get().notifications.notifications.find((n) => n.id === notificationId);
      if (notif && !notif.isRead) {
        // Optimistic update
        set((state) => {
          const n = state.notifications.notifications.find((x) => x.id === notificationId);
          if (n) { n.isRead = true; n.readAt = new Date().toISOString(); }
          state.notifications.unreadCount = state.notifications.notifications.filter((x) => !x.isRead).length;
        });
      }

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(getApiUrl(`/notifications/${notificationId}/read`), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok && notif) {
          // Revert
          set((state) => {
            const n = state.notifications.notifications.find((x) => x.id === notificationId);
            if (n) { n.isRead = false; n.readAt = null; }
            state.notifications.unreadCount = state.notifications.notifications.filter((x) => !x.isRead).length;
          });
        }
      } catch {
        // Revert
        if (notif) {
          set((state) => {
            const n = state.notifications.notifications.find((x) => x.id === notificationId);
            if (n) { n.isRead = false; n.readAt = null; }
            state.notifications.unreadCount = state.notifications.notifications.filter((x) => !x.isRead).length;
          });
        }
      }
    },

    markAllAsRead: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(getApiUrl('/notifications/read'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ all: true }),
        });
        if (response.ok) {
          set((state) => {
            state.notifications.notifications.forEach((n) => { n.isRead = true; });
            state.notifications.unreadCount = 0;
          });
        }
      } catch { /* ignore */ }
    },

    deleteNotification: async (notificationId) => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(getApiUrl(`/notifications/${notificationId}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          set((state) => {
            const removed = state.notifications.notifications.find((n) => n.id === notificationId);
            state.notifications.notifications = state.notifications.notifications.filter((n) => n.id !== notificationId);
            if (removed && !removed.isRead) state.notifications.unreadCount--;
          });
        }
      } catch { /* ignore */ }
    },

    dismissToast: (notificationId) => {
      set((state) => {
        state.notifications.toastQueue = state.notifications.toastQueue.filter((t) => t.id !== notificationId);
      });
    },

    clearToasts: () => {
      set((state) => { state.notifications.toastQueue = []; });
    },

    addNotification: (notificationData) => {
      const user = get().auth.user;
      const notification: Notification = {
        ...notificationData,
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        userId: user?.id || '',
        createdAt: new Date().toISOString(),
        isRead: false,
        readAt: null,
      };

      set((state) => {
        if (!state.notifications.notifications.find((n) => n.id === notification.id)) {
          state.notifications.notifications.unshift(notification);
          state.notifications.unreadCount++;
        }
        state.notifications.toastQueue = [notification, ...state.notifications.toastQueue].slice(0, 5);
      });

      setTimeout(() => {
        get().notifications.dismissToast(notification.id);
      }, 5000);
    },

    addToast: (data) => get().notifications.addNotification(data),
    showNotification: (data) => get().notifications.addNotification(data),

    handleNewNotification: (notification) => {
      set((state) => {
        if (!state.notifications.notifications.find((n) => n.id === notification.id)) {
          state.notifications.notifications.unshift(notification);
          if (!notification.isRead) state.notifications.unreadCount++;
        }
        state.notifications.toastQueue = [notification, ...state.notifications.toastQueue].slice(0, 5);
      });

      setTimeout(() => {
        get().notifications.dismissToast(notification.id);
      }, 5000);
    },

    setNotifications: (notifications) => {
      set((state) => {
        state.notifications.notifications = notifications;
        state.notifications.unreadCount = notifications.filter((n) => !n.isRead).length;
      });
    },

    setUnreadCount: (count) => {
      set((state) => { state.notifications.unreadCount = count; });
    },

    resetNotifications: () => {
      set((state) => { Object.assign(state.notifications, initialState); });
    },
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

export const useNotifications = () => {
  const slice = useStore((state) => state.notifications);

  // Backward-compatible dispatch for consumers using reducer-style actions
  const dispatch = (action: { type: string; payload?: unknown }) => {
    switch (action.type) {
      case 'ADD_NOTIFICATION':
        slice.handleNewNotification(action.payload as Notification);
        break;
      case 'ADD_TOAST':
        slice.addToast(action.payload as Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'readAt' | 'userId'>);
        break;
      case 'REMOVE_TOAST':
        slice.dismissToast(action.payload as string);
        break;
      case 'SET_UNREAD_COUNT':
        slice.setUnreadCount(action.payload as number);
        break;
      case 'MARK_ALL_READ':
        slice.markAllAsRead();
        break;
      case 'UPDATE_NOTIFICATION': {
        // Replace notification in list
        const update = action.payload as Partial<Notification> & { id: string };
        slice.setNotifications(
          slice.notifications.map((n: Notification) =>
            n.id === update.id ? { ...n, ...update } : n
          )
        );
        break;
      }
      case 'SET_NOTIFICATIONS':
        slice.setNotifications(action.payload as Notification[]);
        break;
    }
  };

  return {
    ...slice,
    // Backward compat: consumers access state.notifications, state.unreadCount, etc.
    state: {
      notifications: slice.notifications,
      unreadCount: slice.unreadCount,
      loading: slice.loading,
      error: slice.error,
      toastQueue: slice.toastQueue,
    },
    dispatch,
  };
};

export const useNotification = useNotifications;
