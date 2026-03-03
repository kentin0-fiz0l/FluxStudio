/**
 * NotificationCenter Component Tests
 *
 * Tests: notification list, bell button, mark read, empty state.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { NotificationCenter } from '../NotificationCenter';

vi.mock('@/store/store', () => ({
  useStore: vi.fn(() => false),
}));

vi.mock('@/services/socketService', () => ({
  socketService: {
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Notification API
const originalNotification = globalThis.Notification;
beforeAll(() => {
  Object.defineProperty(globalThis, 'Notification', {
    value: { permission: 'denied', requestPermission: vi.fn() },
    writable: true,
  });
});
afterAll(() => {
  Object.defineProperty(globalThis, 'Notification', { value: originalNotification, writable: true });
});

describe('NotificationCenter', () => {
  test('renders notification bell button', () => {
    render(<NotificationCenter />);

    expect(screen.getByLabelText(/Notifications/)).toBeTruthy();
  });

  test('shows unread count badge on the bell button', () => {
    render(<NotificationCenter />);

    // The component initializes with 3 unread notifications
    const badge = screen.getByLabelText(/Notifications \(3 unread\)/);
    expect(badge).toBeTruthy();
  });

  test('opens notification panel when bell is clicked', async () => {
    const { user } = render(<NotificationCenter />);

    await user.click(screen.getByLabelText(/Notifications/));

    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByText('New message from Sarah')).toBeTruthy();
    expect(screen.getByText('Deadline approaching')).toBeTruthy();
  });

  test('shows Mark all read and Clear all buttons', async () => {
    const { user } = render(<NotificationCenter />);

    await user.click(screen.getByLabelText(/Notifications/));

    expect(screen.getByText('Mark all read')).toBeTruthy();
    expect(screen.getByText('Clear all')).toBeTruthy();
  });

  test('shows filter tabs: All, Unread, Mentions', async () => {
    const { user } = render(<NotificationCenter />);

    await user.click(screen.getByLabelText(/Notifications/));

    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText(/Unread/)).toBeTruthy();
    expect(screen.getByText('Mentions')).toBeTruthy();
  });

  test('shows Notification Settings button in footer', async () => {
    const { user } = render(<NotificationCenter />);

    await user.click(screen.getByLabelText(/Notifications/));

    expect(screen.getByText('Notification Settings')).toBeTruthy();
  });
});
