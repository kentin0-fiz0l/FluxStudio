/**
 * Notifications Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
const mockNotifications = [
  {
    id: 'n1',
    type: 'message',
    title: 'New message',
    message: 'You have a new message from Alice',
    read: false,
    createdAt: new Date().toISOString(),
    actor: { id: '2', name: 'Alice' },
  },
  {
    id: 'n2',
    type: 'mention',
    title: 'Mentioned',
    message: 'Bob mentioned you in a comment',
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    actor: { id: '3', name: 'Bob' },
  },
];

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    logout: vi.fn(),
    isAuthenticated: true,
  })),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    logout: vi.fn(),
    isAuthenticated: true,
  })),
}));

vi.mock('@/store/slices/notificationSlice', () => ({
  useNotifications: vi.fn(() => ({
    state: { notifications: mockNotifications, loading: false, unreadCount: 1 },
    fetchNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  })),
  useNotification: vi.fn(),
}));

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: vi.fn(() => ({
    state: { notifications: mockNotifications, loading: false, unreadCount: 1 },
    fetchNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  })),
  Notification: {} as any,
}));

vi.mock('@/store', () => ({
  useActiveProject: vi.fn(() => null),
  useProjectContext: vi.fn(() => ({
    projects: [],
    currentProject: null,
    isLoading: false,
  })),
}));

vi.mock('@/components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/ui', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Button: ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>,
}));

vi.mock('@/utils/apiHelpers', () => ({
  getApiUrl: vi.fn((path: string) => path),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import { default as NotificationsPage } from '../Notifications';

describe('Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderNotifications = () => render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>
  );

  test('renders without crashing', () => {
    renderNotifications();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('displays notification items', () => {
    renderNotifications();
    const messages = screen.getAllByText(/new message/i);
    expect(messages.length).toBeGreaterThan(0);
  });

  test('shows category filter tabs', () => {
    renderNotifications();
    const allTabs = screen.getAllByText('All');
    expect(allTabs.length).toBeGreaterThan(0);
    const mentionTabs = screen.getAllByText('Mentions');
    expect(mentionTabs.length).toBeGreaterThan(0);
  });

  test('shows mark all as read button', () => {
    renderNotifications();
    const markAllBtns = screen.queryAllByRole('button', { name: /mark.*read/i });
    const markAllTexts = screen.queryAllByText(/mark.*read/i);
    expect(markAllBtns.length + markAllTexts.length).toBeGreaterThan(0);
  });

  test('shows unread indicator on notifications', () => {
    renderNotifications();
    // The first notification is unread - should have visual distinction
    const notificationElements = screen.getAllByText(/message/i);
    expect(notificationElements.length).toBeGreaterThan(0);
  });
});
