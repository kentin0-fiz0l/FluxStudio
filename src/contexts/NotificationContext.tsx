/**
 * NotificationContext - Backward compatibility wrapper
 *
 * Notification state has been migrated to Zustand (store/slices/notificationSlice.ts).
 * This file re-exports the Zustand hook so existing imports continue to work.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { useStore } from '../store';

interface SocketLike {
  emit(event: string, ...args: unknown[]): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Socket.IO event emitter pattern
  on(event: string, cb: (...args: any[]) => void): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, cb: (...args: any[]) => void): void;
}

interface WindowWithSocket extends Window {
  __messagingSocket?: SocketLike;
}

// Re-export types
export type {
  NotificationType,
  NotificationPriority,
  NotificationActor,
  Notification,
  NotificationState,
} from '../store/slices/notificationSlice';

// Re-export hooks from Zustand
export { useNotifications, useNotification } from '../store/slices/notificationSlice';

// Legacy type export for backward compatibility
export type NotificationContextValue = ReturnType<typeof import('../store/slices/notificationSlice').useNotifications>;

/**
 * NotificationProvider - sets up WebSocket listeners and fetching.
 * Kept for RootProviders compatibility during migration.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const user = useStore((state) => state.auth.user);
  const fetchNotifications = useStore((state) => state.notifications.fetchNotifications);
  const handleNewNotification = useStore((state) => state.notifications.handleNewNotification);
  const setUnreadCount = useStore((state) => state.notifications.setUnreadCount);
  const markAllAsRead = useStore((state) => state.notifications.markAllAsRead);
  const announcerRef = useRef<HTMLDivElement>(null);

  // Fetch notifications on mount
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Set up Socket.IO listener
  useEffect(() => {
    if (!user) return;

    const socket = (window as WindowWithSocket).__messagingSocket;
    if (!socket) return;

    socket.emit('notifications:subscribe');

    const onNew = (notification: unknown) => handleNewNotification(notification as import('../store/slices/notificationSlice').Notification);
    const onCount = ({ count }: { count: number }) => setUnreadCount(count);
    const onAllRead = () => markAllAsRead();

    socket.on('notification:new', onNew);
    socket.on('notifications:unread-count', onCount);
    socket.on('notifications:all-marked-read', onAllRead);

    return () => {
      socket.off('notification:new', onNew);
      socket.off('notifications:unread-count', onCount);
      socket.off('notifications:all-marked-read', onAllRead);
    };
  }, [user, handleNewNotification, setUnreadCount, markAllAsRead]);

  // Keyboard shortcut: Ctrl+Shift+N
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'N') {
        event.preventDefault();
        window.location.href = '/notifications';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {children}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}

export default {};
