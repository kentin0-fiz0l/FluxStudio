import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

vi.mock('../store', () => ({ useStore: vi.fn() }));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { createNotificationSlice, type NotificationSlice } from '../slices/notificationSlice';
import { createAuthSlice, type AuthSlice } from '../slices/authSlice';

type TestStore = NotificationSlice & AuthSlice;

function createTestStore() {
  return create<TestStore>()(
    immer((...args) => ({
      ...createNotificationSlice(...(args as Parameters<typeof createNotificationSlice>)),
      ...createAuthSlice(...(args as Parameters<typeof createAuthSlice>)),
    }))
  );
}

describe('notificationSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    localStorage.clear();
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should have empty initial state', () => {
      const { notifications } = store.getState();
      expect(notifications.notifications).toEqual([]);
      expect(notifications.unreadCount).toBe(0);
      expect(notifications.loading).toBe(false);
      expect(notifications.error).toBeNull();
      expect(notifications.toastQueue).toEqual([]);
    });
  });

  describe('setNotifications', () => {
    it('should set notifications and compute unread count', () => {
      const notifs = [
        { id: '1', isRead: false, title: 'A' },
        { id: '2', isRead: true, title: 'B' },
        { id: '3', isRead: false, title: 'C' },
      ] as any[];

      store.getState().notifications.setNotifications(notifs);

      expect(store.getState().notifications.notifications).toHaveLength(3);
      expect(store.getState().notifications.unreadCount).toBe(2);
    });
  });

  describe('setUnreadCount', () => {
    it('should update unread count directly', () => {
      store.getState().notifications.setUnreadCount(5);
      expect(store.getState().notifications.unreadCount).toBe(5);
    });
  });

  describe('addNotification', () => {
    it('should add notification with generated id and update counts', () => {
      // Need a user for addNotification
      store.getState().auth.setUser({ id: 'u1', email: 'a@b.com' } as any);

      store.getState().notifications.addNotification({
        type: 'info',
        title: 'Test notification',
      });

      const state = store.getState().notifications;
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].id).toMatch(/^local-/);
      expect(state.notifications[0].isRead).toBe(false);
      expect(state.unreadCount).toBe(1);
      expect(state.toastQueue).toHaveLength(1);
    });

    it('should limit toast queue to 5', () => {
      store.getState().auth.setUser({ id: 'u1', email: 'a@b.com' } as any);

      for (let i = 0; i < 7; i++) {
        store.getState().notifications.addNotification({ type: 'info', title: `N${i}` });
      }

      expect(store.getState().notifications.toastQueue.length).toBeLessThanOrEqual(5);
    });

    it('should auto-dismiss toast after 5 seconds', () => {
      store.getState().auth.setUser({ id: 'u1', email: 'a@b.com' } as any);

      store.getState().notifications.addNotification({ type: 'info', title: 'Temp' });
      expect(store.getState().notifications.toastQueue).toHaveLength(1);

      vi.advanceTimersByTime(5000);

      expect(store.getState().notifications.toastQueue).toHaveLength(0);
    });
  });

  describe('dismissToast', () => {
    it('should remove toast from queue', () => {
      store.getState().auth.setUser({ id: 'u1', email: 'a@b.com' } as any);
      store.getState().notifications.addNotification({ type: 'info', title: 'T' });

      const id = store.getState().notifications.toastQueue[0].id;
      store.getState().notifications.dismissToast(id);

      expect(store.getState().notifications.toastQueue).toHaveLength(0);
    });
  });

  describe('clearToasts', () => {
    it('should clear all toasts', () => {
      store.getState().auth.setUser({ id: 'u1', email: 'a@b.com' } as any);
      store.getState().notifications.addNotification({ type: 'info', title: 'T1' });
      store.getState().notifications.addNotification({ type: 'info', title: 'T2' });

      store.getState().notifications.clearToasts();
      expect(store.getState().notifications.toastQueue).toHaveLength(0);
    });
  });

  describe('markAsRead (optimistic)', () => {
    it('should optimistically mark notification as read', async () => {
      store.getState().notifications.setNotifications([
        { id: 'n1', isRead: false, title: 'A', userId: 'u1', type: 'info', readAt: null, createdAt: '' },
      ] as any[]);

      mockFetch.mockResolvedValueOnce({ ok: true });

      await store.getState().notifications.markAsRead('n1');

      const n = store.getState().notifications.notifications[0];
      expect(n.isRead).toBe(true);
      expect(n.readAt).toBeTruthy();
      expect(store.getState().notifications.unreadCount).toBe(0);
    });

    it('should revert on API failure', async () => {
      store.getState().notifications.setNotifications([
        { id: 'n1', isRead: false, title: 'A', userId: 'u1', type: 'info', readAt: null, createdAt: '' },
      ] as any[]);

      mockFetch.mockResolvedValueOnce({ ok: false });

      await store.getState().notifications.markAsRead('n1');

      const n = store.getState().notifications.notifications[0];
      expect(n.isRead).toBe(false);
      expect(store.getState().notifications.unreadCount).toBe(1);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read on success', async () => {
      store.getState().notifications.setNotifications([
        { id: 'n1', isRead: false, title: 'A', userId: 'u1', type: 'info', readAt: null, createdAt: '' },
        { id: 'n2', isRead: false, title: 'B', userId: 'u1', type: 'info', readAt: null, createdAt: '' },
      ] as any[]);

      mockFetch.mockResolvedValueOnce({ ok: true });

      await store.getState().notifications.markAllAsRead();

      expect(store.getState().notifications.unreadCount).toBe(0);
      expect(store.getState().notifications.notifications.every((n) => n.isRead)).toBe(true);
    });
  });

  describe('deleteNotification', () => {
    it('should remove notification and update unread count', async () => {
      store.getState().notifications.setNotifications([
        { id: 'n1', isRead: false, title: 'A', userId: 'u1', type: 'info', readAt: null, createdAt: '' },
      ] as any[]);

      mockFetch.mockResolvedValueOnce({ ok: true });

      await store.getState().notifications.deleteNotification('n1');

      expect(store.getState().notifications.notifications).toHaveLength(0);
      expect(store.getState().notifications.unreadCount).toBe(0);
    });
  });

  describe('resetNotifications', () => {
    it('should reset to initial state', () => {
      store.getState().notifications.setNotifications([{ id: 'n1', isRead: false } as any]);
      store.getState().notifications.setUnreadCount(5);

      store.getState().notifications.resetNotifications();

      expect(store.getState().notifications.notifications).toEqual([]);
      expect(store.getState().notifications.unreadCount).toBe(0);
    });
  });

  describe('handleNewNotification', () => {
    it('should add notification from server and enqueue toast', () => {
      const notif = { id: 'server-1', isRead: false, title: 'New', userId: 'u1', type: 'info', readAt: null, createdAt: '' } as any;

      store.getState().notifications.handleNewNotification(notif);

      expect(store.getState().notifications.notifications).toHaveLength(1);
      expect(store.getState().notifications.unreadCount).toBe(1);
      expect(store.getState().notifications.toastQueue).toHaveLength(1);
    });

    it('should not duplicate existing notification', () => {
      const notif = { id: 'server-1', isRead: false, title: 'New', userId: 'u1', type: 'info', readAt: null, createdAt: '' } as any;

      store.getState().notifications.handleNewNotification(notif);
      store.getState().notifications.handleNewNotification(notif);

      expect(store.getState().notifications.notifications).toHaveLength(1);
    });
  });
});
