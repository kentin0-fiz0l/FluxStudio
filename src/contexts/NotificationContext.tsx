/* eslint-disable react-refresh/only-export-components */
/**
 * NotificationContext - Backward compatibility wrapper
 *
 * Notification state has been migrated to Zustand (store/slices/notificationSlice.ts).
 * This file re-exports the Zustand hook so existing imports continue to work.
 */

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

export default {};
