/* eslint-disable react-refresh/only-export-components */
/**
 * RealtimeNotifications - Real-time notification integration
 *
 * Integrates Socket.IO with the notification system to provide:
 * - Live notification updates
 * - Toast notifications for important events
 * - Badge count updates
 * - Sound notifications (optional)
 */

import { useEffect, useRef, useCallback } from 'react';
import { useNotifications, type Notification } from '@/contexts/NotificationContext';
import { messagingSocketService } from '@/services/messagingSocketService';
import { useAuth } from '@/contexts/AuthContext';

interface RealtimeNotificationsProps {
  enabled?: boolean;
  soundEnabled?: boolean;
}

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND_URL = '/sounds/notification.mp3';

export function RealtimeNotifications({
  enabled = true,
  soundEnabled = true,
}: RealtimeNotificationsProps) {
  const { user } = useAuth();
  const { dispatch } = useNotifications();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isConnectedRef = useRef(false);

  // Initialize audio element
  useEffect(() => {
    if (soundEnabled && typeof window !== 'undefined') {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
      audioRef.current.volume = 0.5;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, [soundEnabled]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay restrictions
      });
    }
  }, [soundEnabled]);

  // Handle new notification from socket
  const handleNewNotification = useCallback(
    (notification: Notification) => {
      // Add to state via context
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification });

      // Show toast for important notifications
      const importantTypes = [
        'mention',
        'reply',
        'decision',
        'blocker',
        'assignment',
        'approval_request',
        'deadline',
      ];

      if (importantTypes.includes(notification.type)) {
        // Add to toast queue
        dispatch({ type: 'ADD_TOAST', payload: notification });
        playNotificationSound();

        // Auto-dismiss toast after 5 seconds
        setTimeout(() => {
          dispatch({ type: 'REMOVE_TOAST', payload: notification.id });
        }, 5000);
      }
    },
    [dispatch, playNotificationSound]
  );

  // Handle unread count update from socket
  const handleUnreadCountUpdate = useCallback(
    ({ count }: { count: number }) => {
      dispatch({ type: 'SET_UNREAD_COUNT', payload: count });
    },
    [dispatch]
  );

  // Handle all marked read from socket
  const handleAllMarkedRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_READ' });
  }, [dispatch]);

  // Handle notification update from socket
  const handleNotificationUpdate = useCallback(
    (notification: Notification) => {
      dispatch({ type: 'UPDATE_NOTIFICATION', payload: notification });
    },
    [dispatch]
  );

  // Connect to Socket.IO and subscribe to notifications
  useEffect(() => {
    if (!enabled || !user) return;

    // Connect if not already connected
    if (!messagingSocketService.getConnectionStatus()) {
      messagingSocketService.connect();
    }

    // Set up event listeners
    const unsubscribers: Array<() => void> = [];

    // New notification
    unsubscribers.push(
      messagingSocketService.on('notification:new', (data: unknown) => {
        handleNewNotification(data as Notification);
      })
    );

    // Notification updated
    unsubscribers.push(
      messagingSocketService.on('notification:updated', (data: unknown) => {
        handleNotificationUpdate(data as Notification);
      })
    );

    // Unread count update
    unsubscribers.push(
      messagingSocketService.on('notifications:unread-count', (data: unknown) => {
        handleUnreadCountUpdate(data as { count: number });
      })
    );

    // All marked read
    unsubscribers.push(
      messagingSocketService.on('notifications:all-marked-read', () => {
        handleAllMarkedRead();
      })
    );

    // Subscribe to notifications
    messagingSocketService.subscribeToNotifications();
    isConnectedRef.current = true;

    // Cleanup
    return () => {
      unsubscribers.forEach((unsub) => unsub());
      isConnectedRef.current = false;
    };
  }, [
    enabled,
    user,
    handleNewNotification,
    handleNotificationUpdate,
    handleUnreadCountUpdate,
    handleAllMarkedRead,
  ]);

  // Request notification permission on mount
  useEffect(() => {
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [enabled]);

  // This component doesn't render anything visible
  return null;
}

/**
 * Hook to manually trigger a notification toast
 */
export function useNotificationToast() {
  const { addNotification } = useNotifications();

  const showToast = useCallback(
    (options: {
      type: 'success' | 'info' | 'warning' | 'error';
      title: string;
      message?: string;
      duration?: number;
    }) => {
      addNotification({
        type: options.type,
        title: options.title,
        body: options.message,
      });
    },
    [addNotification]
  );

  return { showToast };
}

export default RealtimeNotifications;
