/**
 * useNotifications Hook
 *
 * Provides notification management with REST API integration and real-time
 * WebSocket updates. Handles loading notifications, marking as read, and
 * syncing unread counts.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Notification as MessagingNotification,
  NotificationType,
  Priority
} from '../types/messaging';
import {
  messagingSocketService,
  Notification as SocketNotification,
} from '../services/messagingSocketService';
import { hookLogger } from '../lib/logger';
import { io, Socket } from 'socket.io-client';

const notifLogger = hookLogger.child('useNotifications');

// Extended notification type that combines both schemas
interface Notification extends MessagingNotification {
  // Additional fields from socket service
  entityId?: string;
  body?: string;
}

interface NotificationPreferences {
  enabled: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  emailDigest: boolean;
  priorities: {
    critical: boolean;
    high: boolean;
    medium: boolean;
    low: boolean;
  };
  types: {
    [K in NotificationType]: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // "22:00"
    endTime: string; // "08:00"
  };
  groupSimilar: boolean;
  autoMarkRead: boolean;
  showPreviews: boolean;
}

interface NotificationFilter {
  priorities?: Priority[];
  types?: NotificationType[];
  isUnread?: boolean;
  isArchived?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  projectId?: string;
  conversationId?: string;
}

interface NotificationGrouping {
  [key: string]: {
    notifications: Notification[];
    count: number;
    latestAt: Date;
    summary: string;
  };
}

interface UseNotificationsOptions {
  autoConnect?: boolean;
  autoLoad?: boolean;
  limit?: number;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  criticalCount: number;
  groupedNotifications: NotificationGrouping;
  preferences: NotificationPreferences;

  // Actions
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  markAsArchived: (notificationId: string) => void;
  snoozeNotification: (notificationId: string, until: Date) => void;
  executeAction: (notificationId: string, actionId: string, data?: unknown) => void;
  dismissNotification: (notificationId: string) => void;

  // Filtering
  filterNotifications: (filter: NotificationFilter) => Notification[];
  clearAll: () => void;

  // Preferences
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;

  // Real-time
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;

  // Pagination
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

// Mock notification data generator
const generateMockNotifications = (userType: string): Notification[] => {
  const baseNotifications: Notification[] = [
    {
      id: `notif-${Date.now()}-1`,
      type: 'approval_request',
      priority: 'high',
      title: 'Design Approval Required',
      message: 'Fall 2024 Marching Show uniform designs need your approval',
      summary: 'Uniform designs ready for review',
      projectId: 'project-1',
      conversationId: 'conv-1',
      avatar: '/avatars/kentino.jpg',
      thumbnail: '/thumbnails/uniform-design.jpg',
      actions: [
        {
          id: 'approve',
          type: 'button',
          label: 'Approve',
          variant: 'primary',
          action: 'approve_design',
          icon: 'check',
        },
        {
          id: 'request_changes',
          type: 'button',
          label: 'Request Changes',
          variant: 'secondary',
          action: 'request_changes',
          icon: 'edit',
        },
      ],
      isRead: false,
      isArchived: false,
      isSnoozed: false,
      metadata: {
        category: 'design-review',
        source: 'project-workflow',
        relatedUsers: [
          { id: 'kentino', name: 'Kentino', userType: 'designer' },
        ],
      },
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    },
    {
      id: `notif-${Date.now()}-2`,
      type: 'message',
      priority: 'medium',
      title: 'New Message from Kentino',
      message: 'I\'ve uploaded the latest drill formations for your review. Let me know your thoughts!',
      summary: 'New drill formations uploaded',
      conversationId: 'conv-project-1',
      messageId: 'msg-123',
      avatar: '/avatars/kentino.jpg',
      isRead: Math.random() > 0.5,
      isArchived: false,
      isSnoozed: false,
      metadata: {
        category: 'project-communication',
        source: 'direct-message',
        tags: ['drill', 'formation', 'review'],
      },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: `notif-${Date.now()}-3`,
      type: 'milestone',
      priority: 'medium',
      title: 'Milestone Achieved!',
      message: 'Design concept phase completed for Fall 2024 Show',
      summary: 'Design concept completed',
      projectId: 'project-1',
      thumbnail: '/thumbnails/milestone-celebration.jpg',
      isRead: false,
      isArchived: false,
      isSnoozed: false,
      metadata: {
        category: 'project-progress',
        source: 'milestone-tracker',
      },
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    },
    {
      id: `notif-${Date.now()}-4`,
      type: 'deadline',
      priority: 'critical',
      title: 'Deadline Approaching',
      message: 'Uniform design approval deadline is in 2 days',
      summary: 'Approval deadline in 2 days',
      projectId: 'project-1',
      actions: [
        {
          id: 'view_project',
          type: 'button',
          label: 'View Project',
          variant: 'primary',
          action: 'navigate_to_project',
          data: { projectId: 'project-1' },
        },
      ],
      isRead: false,
      isArchived: false,
      isSnoozed: false,
      metadata: {
        category: 'deadline',
        source: 'project-scheduler',
        autoExpire: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Expires in 2 days
      },
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    },
    {
      id: `notif-${Date.now()}-5`,
      type: 'consultation',
      priority: 'high',
      title: 'Consultation Session Scheduled',
      message: 'Design review session scheduled for tomorrow at 2:00 PM',
      summary: 'Design review tomorrow 2PM',
      actions: [
        {
          id: 'join_session',
          type: 'button',
          label: 'Join Session',
          variant: 'primary',
          action: 'join_consultation',
        },
        {
          id: 'reschedule',
          type: 'button',
          label: 'Reschedule',
          variant: 'secondary',
          action: 'reschedule_consultation',
        },
      ],
      isRead: Math.random() > 0.7,
      isArchived: false,
      isSnoozed: false,
      metadata: {
        category: 'consultation',
        source: 'calendar-system',
      },
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    },
  ];

  // Add role-specific notifications
  if (userType === 'designer') {
    baseNotifications.push({
      id: `notif-${Date.now()}-6`,
      type: 'activity',
      priority: 'low',
      title: 'Client Activity Update',
      message: '3 new client comments on recent design uploads',
      summary: '3 new client comments',
      groupId: 'client-comments',
      groupCount: 3,
      isGrouped: true,
      isRead: false,
      isArchived: false,
      isSnoozed: false,
      metadata: {
        category: 'client-engagement',
        source: 'activity-tracker',
      },
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    });
  }

  if (userType === 'admin') {
    baseNotifications.push({
      id: `notif-${Date.now()}-7`,
      type: 'system',
      priority: 'medium',
      title: 'System Update Available',
      message: 'New features available: Enhanced file sharing and collaboration tools',
      summary: 'System update available',
      actions: [
        {
          id: 'view_updates',
          type: 'link',
          label: 'View Updates',
          variant: 'primary',
          action: 'view_changelog',
        },
      ],
      isRead: false,
      isArchived: false,
      isSnoozed: false,
      metadata: {
        category: 'system',
        source: 'update-manager',
      },
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    });
  }

  return baseNotifications;
};

// Default notification preferences
const defaultPreferences: NotificationPreferences = {
  enabled: true,
  soundEnabled: true,
  desktopEnabled: true,
  emailDigest: true,
  priorities: {
    critical: true,
    high: true,
    medium: true,
    low: false,
  },
  types: {
    message: true,
    mention: true,
    file_shared: true,
    approval_request: true,
    approval_status: true,
    milestone: true,
    consultation: true,
    deadline: true,
    system: false,
    announcement: true,
    invitation: true,
    comment: true,
    activity: false,
  },
  quietHours: {
    enabled: true,
    startTime: "22:00",
    endTime: "08:00",
  },
  groupSimilar: true,
  autoMarkRead: false,
  showPreviews: true,
};

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { user } = useAuth();
  const {
    autoConnect = true,
    autoLoad = true,
    limit = 20,
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const isInitialLoadDone = useRef(false);

  // Get auth token for REST calls
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  // Convert socket notification to local notification format
  const convertSocketNotification = useCallback((socketNotif: SocketNotification): Notification => {
    return {
      id: socketNotif.id,
      type: socketNotif.type as NotificationType,
      priority: 'medium', // Default priority
      title: socketNotif.title,
      message: socketNotif.body || socketNotif.title,
      summary: socketNotif.body || socketNotif.title,
      isRead: socketNotif.isRead,
      isArchived: false,
      isSnoozed: false,
      entityId: socketNotif.entityId,
      body: socketNotif.body,
      createdAt: new Date(socketNotif.createdAt),
    };
  }, []);

  // Load notifications from REST API
  const refreshNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/notifications?limit=${limit}&offset=0`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        // If 401/403, don't fail - just use empty list
        if (res.status === 401 || res.status === 403) {
          notifLogger.warn('Auth error, using mock data');
          if (mountedRef.current) {
            const mockNotifs = generateMockNotifications(user.userType || 'designer');
            setNotifications(mockNotifs);
            setLastUpdated(new Date());
            isInitialLoadDone.current = true;
          }
          return;
        }
        throw new Error(`Failed to load notifications: ${res.status}`);
      }

      const data = await res.json();
      const list = (data.notifications || []).map((n: SocketNotification) => convertSocketNotification(n));

      if (mountedRef.current) {
        setNotifications(list);
        setOffset(list.length);
        setHasMore(list.length >= limit);
        setLastUpdated(new Date());
        isInitialLoadDone.current = true;
      }
    } catch (err) {
      notifLogger.error('Error loading notifications', err);
      if (mountedRef.current) {
        // Fallback to mock data on error
        const mockNotifs = generateMockNotifications(user.userType || 'designer');
        setNotifications(mockNotifs);
        setLastUpdated(new Date());
        isInitialLoadDone.current = true;
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user, limit, getAuthHeaders, convertSocketNotification]);

  // Load more notifications (pagination)
  const loadMore = useCallback(async () => {
    if (!user || isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      const res = await fetch(`/api/notifications?limit=${limit}&offset=${offset}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Failed to load more notifications: ${res.status}`);
      }

      const data = await res.json();
      const list = (data.notifications || []).map((n: SocketNotification) => convertSocketNotification(n));

      if (mountedRef.current) {
        setNotifications(prev => [...prev, ...list]);
        setOffset(prev => prev + list.length);
        setHasMore(list.length >= limit);
      }
    } catch (err) {
      notifLogger.error('Error loading more notifications', err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load more notifications');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user, isLoading, hasMore, limit, offset, getAuthHeaders, convertSocketNotification]);

  // Set up WebSocket event listeners
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    // New notification received
    unsubscribers.push(
      messagingSocketService.on('notification:new', (notification: unknown) => {
        const typedNotification = notification as SocketNotification;
        const converted = convertSocketNotification(typedNotification);
        setNotifications(prev => [converted, ...prev]);
      })
    );

    // Notification updated (e.g., marked as read from another device)
    unsubscribers.push(
      messagingSocketService.on('notification:updated', (notification: unknown) => {
        const typedNotification = notification as SocketNotification;
        const converted = convertSocketNotification(typedNotification);
        setNotifications(prev =>
          prev.map(n => n.id === converted.id ? converted : n)
        );
      })
    );

    // Unread count updated from server
    unsubscribers.push(
      messagingSocketService.on('notifications:unread-count', (_data: unknown) => {
        // Server-pushed unread count update - we can refresh if needed
        // The unreadCount is computed from notifications, so this is informational
      })
    );

    // All notifications marked as read
    unsubscribers.push(
      messagingSocketService.on('notifications:all-marked-read', () => {
        setNotifications(prev => prev.map(n => ({
          ...n,
          isRead: true,
          readAt: n.readAt || new Date(),
        })));
      })
    );

    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [convertSocketNotification]);

  // Auto-connect and subscribe to notifications
  useEffect(() => {
    if (autoConnect && user) {
      // Connect if not already connected
      if (!messagingSocketService.getConnectionStatus()) {
        messagingSocketService.connect();
      }
      // Subscribe to notifications
      messagingSocketService.subscribeToNotifications();
    }
  }, [autoConnect, user]);

  // Sprint 44: Connect to dedicated /notifications Socket.IO namespace for real-time push
  const notifSocketRef = useRef<Socket | null>(null);
  useEffect(() => {
    if (!autoConnect || !user) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const baseUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.host}`;
    const socket = io(`${baseUrl}/notifications`, {
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    notifSocketRef.current = socket;

    socket.on('notification:new', (notification: SocketNotification) => {
      const converted = convertSocketNotification(notification);
      setNotifications(prev => {
        // Deduplicate — the messaging socket may also deliver the same event
        if (prev.some(n => n.id === converted.id)) return prev;
        return [converted, ...prev];
      });
    });

    return () => {
      socket.disconnect();
      notifSocketRef.current = null;
    };
  }, [autoConnect, user, convertSocketNotification]);

  // Initial load
  useEffect(() => {
    if (autoLoad && user && !isInitialLoadDone.current) {
      refreshNotifications();
    }
  }, [autoLoad, user, refreshNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Computed values
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead && !n.isArchived).length;
  }, [notifications]);

  const criticalCount = useMemo(() => {
    return notifications.filter(n =>
      !n.isRead && !n.isArchived && n.priority === 'critical'
    ).length;
  }, [notifications]);

  // Group similar notifications
  const groupedNotifications = useMemo((): NotificationGrouping => {
    if (!preferences.groupSimilar) {
      return {};
    }

    const groups: NotificationGrouping = {};
    const ungrouped = notifications.filter(n => !n.isArchived);

    ungrouped.forEach(notification => {
      const groupKey = notification.groupId || `${notification.type}-${notification.projectId || 'general'}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          notifications: [],
          count: 0,
          latestAt: notification.createdAt,
          summary: notification.summary || notification.title,
        };
      }

      groups[groupKey].notifications.push(notification);
      groups[groupKey].count += 1;

      if (notification.createdAt > groups[groupKey].latestAt) {
        groups[groupKey].latestAt = notification.createdAt;
        groups[groupKey].summary = notification.summary || notification.title;
      }
    });

    return groups;
  }, [notifications, preferences.groupSimilar]);

  // Actions
  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistically update local state
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, isRead: true, readAt: new Date() }
          : n
      )
    );

    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      if (!res.ok && res.status !== 404) {
        notifLogger.warn('Failed to mark notification as read via REST');
      }

      // Also emit via socket for real-time sync
      messagingSocketService.markNotificationRead(notificationId);
    } catch (err) {
      notifLogger.error('Error marking notification as read', err);
    }
  }, [getAuthHeaders]);

  const markAllAsRead = useCallback(async () => {
    // Optimistically update local state
    setNotifications(prev =>
      prev.map(n => ({
        ...n,
        isRead: true,
        readAt: n.readAt || new Date()
      }))
    );

    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!res.ok && res.status !== 404) {
        notifLogger.warn('Failed to mark all notifications as read via REST');
      }

      // Also emit via socket for real-time sync
      messagingSocketService.markAllNotificationsRead();
    } catch (err) {
      notifLogger.error('Error marking all notifications as read', err);
    }
  }, [getAuthHeaders]);

  const markAsArchived = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, isArchived: true, isRead: true }
          : n
      )
    );
  }, []);

  const snoozeNotification = useCallback((notificationId: string, until: Date) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, isSnoozed: true, snoozeUntil: until }
          : n
      )
    );
  }, []);

  const executeAction = useCallback((notificationId: string, actionId: string, data?: unknown) => {
    const notification = notifications.find(n => n.id === notificationId);
    const action = notification?.actions?.find(a => a.id === actionId);

    if (action) {
      notifLogger.debug('Executing action', { action: action.action, data });
      // Here you would implement the actual action logic
      // For now, just mark as read
      markAsRead(notificationId);
    }
  }, [notifications, markAsRead]);

  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const filterNotifications = useCallback((filter: NotificationFilter): Notification[] => {
    return notifications.filter(notification => {
      if (filter.priorities && !filter.priorities.includes(notification.priority)) {
        return false;
      }
      if (filter.types && !filter.types.includes(notification.type)) {
        return false;
      }
      if (filter.isUnread !== undefined && notification.isRead === filter.isUnread) {
        return false;
      }
      if (filter.isArchived !== undefined && notification.isArchived !== filter.isArchived) {
        return false;
      }
      if (filter.projectId && notification.projectId !== filter.projectId) {
        return false;
      }
      if (filter.conversationId && notification.conversationId !== filter.conversationId) {
        return false;
      }
      if (filter.dateFrom && notification.createdAt < filter.dateFrom) {
        return false;
      }
      if (filter.dateTo && notification.createdAt > filter.dateTo) {
        return false;
      }
      return true;
    });
  }, [notifications]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
    // Here you would persist preferences to localStorage or API
    localStorage.setItem('notification-preferences', JSON.stringify({ ...preferences, ...newPreferences }));
  }, [preferences]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('notification-preferences');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences(prev => ({ ...prev, ...parsed }));
      } catch (_error) {
        notifLogger.warn('Failed to parse stored notification preferences');
      }
    }
  }, []);

  return {
    notifications: notifications.filter(n => !n.isArchived),
    unreadCount,
    criticalCount,
    groupedNotifications,
    preferences,

    // Actions
    markAsRead,
    markAllAsRead,
    markAsArchived,
    snoozeNotification,
    executeAction,
    dismissNotification,

    // Filtering
    filterNotifications,
    clearAll,

    // Preferences
    updatePreferences,

    // Real-time
    isLoading,
    error,
    lastUpdated,
    refresh: refreshNotifications,

    // Pagination
    hasMore,
    loadMore,
  };
}