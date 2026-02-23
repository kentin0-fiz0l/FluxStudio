/**
 * MobileBottomNav Component Tests
 *
 * Tests for the mobile bottom navigation component that provides
 * persistent navigation on mobile devices.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { MobileBottomNav } from './MobileBottomNav';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      avatar: null,
    },
    logout: vi.fn(),
  })),
}));

vi.mock('@/hooks/useMessaging', () => ({
  useMessagingOptional: vi.fn(() => ({
    unreadCount: 0,
  })),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: any) => (
      <div className={className} onClick={onClick} data-testid={props['data-testid']}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Get mocked functions for manipulation in tests
const mockUseAuth = vi.mocked(await import('@/contexts/AuthContext')).useAuth;
const mockUseMessagingOptional = vi.mocked(await import('@/hooks/useMessaging')).useMessagingOptional;

describe('MobileBottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default values
    mockUseAuth.mockReturnValue({
      ...({} as unknown as ReturnType<typeof mockUseAuth>),
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        avatar: undefined,
        userType: 'designer',
        createdAt: new Date().toISOString(),
      },
      logout: vi.fn(),
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      signup: vi.fn(),
      loginWithGoogle: vi.fn(),
      loginWithApple: vi.fn(),
      setAuthToken: vi.fn(),
      getUserDashboardPath: vi.fn(),
      token: 'test-token',
      error: null,
      session: { lastFocusedProjectId: null, lastFocusedProjectName: null, lastProjectTab: null, lastRoute: null, lastSeenTimestamp: null, lastActivityTimestamp: null },
      isReturningSession: false,
    });
    mockUseMessagingOptional.mockReturnValue({
      unreadCount: 0,
      conversations: [],
      activeConversation: null,
      conversationMessages: [],
      typingIndicators: [],
      userPresence: {},
      createConversation: vi.fn(),
      sendMessage: vi.fn(),
      editMessage: vi.fn(),
      deleteMessage: vi.fn(),
      setActiveConversation: vi.fn(),
      joinConversation: vi.fn(),
      leaveConversation: vi.fn(),
      addParticipant: vi.fn(),
      removeParticipant: vi.fn(),
      searchMessages: vi.fn(),
      filterConversations: vi.fn(),
      uploadFile: vi.fn(),
      setTyping: vi.fn(),
      isLoading: false,
      error: null,
      lastUpdated: null,
      refresh: vi.fn(),
    });
  });

  const renderWithRouter = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <MobileBottomNav />
      </MemoryRouter>
    );
  };

  describe('Navigation Items', () => {
    test('renders all four main navigation items', () => {
      renderWithRouter();

      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
      expect(screen.getByText('Menu')).toBeInTheDocument();
    });

    test('Projects link navigates to /projects', () => {
      renderWithRouter();

      const projectsLink = screen.getByText('Projects').closest('a');
      expect(projectsLink).toHaveAttribute('href', '/projects');
    });

    test('Messages link navigates to /messages', () => {
      renderWithRouter();

      const messagesLink = screen.getByText('Messages').closest('a');
      expect(messagesLink).toHaveAttribute('href', '/messages');
    });

    test('Search triggers onOpenSearch callback', () => {
      const handleOpenSearch = vi.fn();

      render(
        <BrowserRouter>
          <MobileBottomNav onOpenSearch={handleOpenSearch} />
        </BrowserRouter>
      );

      const searchButton = screen.getByText('Search').closest('button');
      fireEvent.click(searchButton!);

      expect(handleOpenSearch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Active State', () => {
    test('Projects nav item is active when on /projects', () => {
      renderWithRouter(['/projects']);

      const projectsNavItem = screen.getByText('Projects').parentElement;
      expect(projectsNavItem).toHaveClass('text-primary-600');
    });

    test('Projects nav item is active when on nested project path', () => {
      renderWithRouter(['/projects/123']);

      const projectsNavItem = screen.getByText('Projects').parentElement;
      expect(projectsNavItem).toHaveClass('text-primary-600');
    });

    test('Messages nav item is active when on /messages', () => {
      renderWithRouter(['/messages']);

      const messagesNavItem = screen.getByText('Messages').parentElement;
      expect(messagesNavItem).toHaveClass('text-primary-600');
    });

    test('non-active nav items have neutral color', () => {
      renderWithRouter(['/']);

      const projectsNavItem = screen.getByText('Projects').parentElement;
      expect(projectsNavItem).toHaveClass('text-neutral-500');
    });
  });

  describe('Unread Badge', () => {
    test('shows unread count badge when there are unread messages', () => {
      mockUseMessagingOptional.mockReturnValue({
        unreadCount: 5,
        conversations: [],
        activeConversation: null,
        conversationMessages: [],
        typingIndicators: [],
        userPresence: {},
        createConversation: vi.fn(),
        sendMessage: vi.fn(),
        editMessage: vi.fn(),
        deleteMessage: vi.fn(),
        setActiveConversation: vi.fn(),
        joinConversation: vi.fn(),
        leaveConversation: vi.fn(),
        addParticipant: vi.fn(),
        removeParticipant: vi.fn(),
        searchMessages: vi.fn(),
        filterConversations: vi.fn(),
        uploadFile: vi.fn(),
        setTyping: vi.fn(),
        isLoading: false,
        error: null,
        lastUpdated: null,
        refresh: vi.fn(),
      });

      renderWithRouter();

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    test('shows 9+ when unread count exceeds 9', () => {
      mockUseMessagingOptional.mockReturnValue({
        unreadCount: 15,
        conversations: [],
        activeConversation: null,
        conversationMessages: [],
        typingIndicators: [],
        userPresence: {},
        createConversation: vi.fn(),
        sendMessage: vi.fn(),
        editMessage: vi.fn(),
        deleteMessage: vi.fn(),
        setActiveConversation: vi.fn(),
        joinConversation: vi.fn(),
        leaveConversation: vi.fn(),
        addParticipant: vi.fn(),
        removeParticipant: vi.fn(),
        searchMessages: vi.fn(),
        filterConversations: vi.fn(),
        uploadFile: vi.fn(),
        setTyping: vi.fn(),
        isLoading: false,
        error: null,
        lastUpdated: null,
        refresh: vi.fn(),
      });

      renderWithRouter();

      expect(screen.getByText('9+')).toBeInTheDocument();
    });

    test('does not show badge when unread count is 0', () => {
      mockUseMessagingOptional.mockReturnValue({
        unreadCount: 0,
        conversations: [],
        activeConversation: null,
        conversationMessages: [],
        typingIndicators: [],
        userPresence: {},
        createConversation: vi.fn(),
        sendMessage: vi.fn(),
        editMessage: vi.fn(),
        deleteMessage: vi.fn(),
        setActiveConversation: vi.fn(),
        joinConversation: vi.fn(),
        leaveConversation: vi.fn(),
        addParticipant: vi.fn(),
        removeParticipant: vi.fn(),
        searchMessages: vi.fn(),
        filterConversations: vi.fn(),
        uploadFile: vi.fn(),
        setTyping: vi.fn(),
        isLoading: false,
        error: null,
        lastUpdated: null,
        refresh: vi.fn(),
      });

      renderWithRouter();

      // Badge should not be present for 0 unread
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Menu Drawer', () => {
    test('opens menu drawer when Menu is clicked', async () => {
      renderWithRouter();

      const menuButton = screen.getByText('Menu').closest('button');
      fireEvent.click(menuButton!);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Organization')).toBeInTheDocument();
        expect(screen.getByText('Tools')).toBeInTheDocument();
        expect(screen.getByText('Notifications')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });
    });

    test('displays user info in drawer header', async () => {
      renderWithRouter();

      const menuButton = screen.getByText('Menu').closest('button');
      fireEvent.click(menuButton!);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    test('displays user initials when no avatar', async () => {
      renderWithRouter();

      const menuButton = screen.getByText('Menu').closest('button');
      fireEvent.click(menuButton!);

      await waitFor(() => {
        // First character of user name
        expect(screen.getByText('T')).toBeInTheDocument();
      });
    });

    test('displays user avatar when provided', async () => {
      mockUseAuth.mockReturnValue({
      ...({} as unknown as ReturnType<typeof mockUseAuth>),
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          avatar: 'https://example.com/avatar.jpg',
          userType: 'designer',
          createdAt: new Date().toISOString(),
        },
        logout: vi.fn(),
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        signup: vi.fn(),
        loginWithGoogle: vi.fn(),
        loginWithApple: vi.fn(),
        setAuthToken: vi.fn(),
        getUserDashboardPath: vi.fn(),
        token: 'test-token',
        error: null,
        session: { lastFocusedProjectId: null, lastFocusedProjectName: null, lastProjectTab: null, lastRoute: null, lastSeenTimestamp: null, lastActivityTimestamp: null },
        isReturningSession: false,
      });

      renderWithRouter();

      const menuButton = screen.getByText('Menu').closest('button');
      fireEvent.click(menuButton!);

      await waitFor(() => {
        // Avatar has empty alt text (decorative, user name shown separately)
        // Query by the img element directly since it's aria-hidden
        const avatarContainer = screen.getByText('Test User').closest('header');
        const avatar = avatarContainer?.querySelector('img');
        expect(avatar).toBeTruthy();
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      });
    });

    test('Sign Out button calls logout', async () => {
      const mockLogout = vi.fn();
      mockUseAuth.mockReturnValue({
      ...({} as unknown as ReturnType<typeof mockUseAuth>),
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          avatar: undefined,
          userType: 'designer',
          createdAt: new Date().toISOString(),
        },
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        signup: vi.fn(),
        loginWithGoogle: vi.fn(),
        loginWithApple: vi.fn(),
        setAuthToken: vi.fn(),
        getUserDashboardPath: vi.fn(),
        token: 'test-token',
        error: null,
        session: { lastFocusedProjectId: null, lastFocusedProjectName: null, lastProjectTab: null, lastRoute: null, lastSeenTimestamp: null, lastActivityTimestamp: null },
        isReturningSession: false,
      });

      renderWithRouter();

      // Open menu
      const menuButton = screen.getByText('Menu').closest('button');
      fireEvent.click(menuButton!);

      await waitFor(() => {
        const signOutButton = screen.getByText('Sign Out');
        fireEvent.click(signOutButton);
      });

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    test('menu drawer has correct navigation links', async () => {
      renderWithRouter();

      const menuButton = screen.getByText('Menu').closest('button');
      fireEvent.click(menuButton!);

      await waitFor(() => {
        expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/home');
        expect(screen.getByText('Organization').closest('a')).toHaveAttribute('href', '/organization');
        expect(screen.getByText('Tools').closest('a')).toHaveAttribute('href', '/tools');
        expect(screen.getByText('Notifications').closest('a')).toHaveAttribute('href', '/notifications');
        expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings');
        expect(screen.getByText('Profile').closest('a')).toHaveAttribute('href', '/profile');
      });
    });
  });

  describe('Custom className', () => {
    test('applies custom className to nav element', () => {
      render(
        <BrowserRouter>
          <MobileBottomNav className="custom-class" />
        </BrowserRouter>
      );

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('custom-class');
    });
  });

  describe('Responsive Behavior', () => {
    test('nav has md:hidden class for desktop hiding', () => {
      render(
        <BrowserRouter>
          <MobileBottomNav />
        </BrowserRouter>
      );

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('md:hidden');
    });

    test('has safe area inset class for notched devices', () => {
      render(
        <BrowserRouter>
          <MobileBottomNav />
        </BrowserRouter>
      );

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('safe-area-inset-bottom');
    });
  });

  describe('NavItem Component', () => {
    test('renders link when to prop is provided', () => {
      renderWithRouter();

      const projectsLink = screen.getByText('Projects').closest('a');
      expect(projectsLink).toBeInTheDocument();
    });

    test('renders button when onClick is provided without to', () => {
      renderWithRouter();

      const searchButton = screen.getByText('Search').closest('button');
      expect(searchButton).toBeInTheDocument();
    });
  });
});
