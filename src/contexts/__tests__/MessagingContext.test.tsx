/**
 * MessagingContext Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';

// Use vi.hoisted so the mock object is available when vi.mock factory runs
const mockMessagingService = vi.hoisted(() => ({
  getConversations: vi.fn().mockResolvedValue([]),
  createConversation: vi.fn(),
  getMessages: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn(),
  getNotifications: vi.fn().mockResolvedValue([]),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  setCurrentUser: vi.fn(),
  startTyping: vi.fn(),
  stopTyping: vi.fn(),
  onMessageReceived: vi.fn(),
  onTypingStarted: vi.fn(),
  onTypingStopped: vi.fn(),
  onUserOnline: vi.fn(),
  onUserOffline: vi.fn(),
  onMentionReceived: vi.fn(),
  off: vi.fn(),
}));

vi.mock('../../services/messagingService', () => ({
  messagingService: mockMessagingService,
}));

vi.mock('../../lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { MessagingProvider, useMessaging, useMessagingOptional } from '../MessagingContext';

describe('MessagingProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children', () => {
    const { getByText } = render(
      <MessagingProvider>
        <div>Hello Child</div>
      </MessagingProvider>
    );
    expect(getByText('Hello Child')).toBeInTheDocument();
  });

  it('provides initial state values', () => {
    let contextValue: any = null;

    function Consumer() {
      contextValue = useMessaging();
      return null;
    }

    render(
      <MessagingProvider>
        <Consumer />
      </MessagingProvider>
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue.state.currentUser).toBeNull();
    expect(contextValue.state.conversations).toEqual([]);
    expect(contextValue.state.activeConversationId).toBeNull();
    expect(contextValue.state.messages).toEqual({});
    expect(contextValue.state.notifications).toEqual([]);
    expect(contextValue.state.connectionStatus).toBe(false);
    expect(contextValue.state.unreadCounts).toEqual({ messages: 0, notifications: 0 });
  });

  it('registers event listeners on mount', () => {
    render(
      <MessagingProvider>
        <div />
      </MessagingProvider>
    );

    expect(mockMessagingService.onMessageReceived).toHaveBeenCalled();
    expect(mockMessagingService.onTypingStarted).toHaveBeenCalled();
    expect(mockMessagingService.onTypingStopped).toHaveBeenCalled();
    expect(mockMessagingService.onUserOnline).toHaveBeenCalled();
    expect(mockMessagingService.onUserOffline).toHaveBeenCalled();
    expect(mockMessagingService.onMentionReceived).toHaveBeenCalled();
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = render(
      <MessagingProvider>
        <div />
      </MessagingProvider>
    );

    unmount();

    expect(mockMessagingService.off).toHaveBeenCalledWith('message:received', expect.any(Function));
    expect(mockMessagingService.off).toHaveBeenCalledWith('typing:started', expect.any(Function));
    expect(mockMessagingService.off).toHaveBeenCalledWith('typing:stopped', expect.any(Function));
    expect(mockMessagingService.off).toHaveBeenCalledWith('user:online', expect.any(Function));
    expect(mockMessagingService.off).toHaveBeenCalledWith('user:offline', expect.any(Function));
    expect(mockMessagingService.off).toHaveBeenCalledWith('notification:mention', expect.any(Function));
  });

  it('provides actions object', () => {
    let contextValue: any = null;

    function Consumer() {
      contextValue = useMessaging();
      return null;
    }

    render(
      <MessagingProvider>
        <Consumer />
      </MessagingProvider>
    );

    expect(contextValue.actions).toBeDefined();
    expect(typeof contextValue.actions.setCurrentUser).toBe('function');
    expect(typeof contextValue.actions.loadConversations).toBe('function');
    expect(typeof contextValue.actions.createConversation).toBe('function');
    expect(typeof contextValue.actions.selectConversation).toBe('function');
    expect(typeof contextValue.actions.loadMessages).toBe('function');
    expect(typeof contextValue.actions.sendMessage).toBe('function');
    expect(typeof contextValue.actions.loadNotifications).toBe('function');
    expect(typeof contextValue.actions.markNotificationAsRead).toBe('function');
    expect(typeof contextValue.actions.markAllNotificationsAsRead).toBe('function');
    expect(typeof contextValue.actions.startTyping).toBe('function');
    expect(typeof contextValue.actions.stopTyping).toBe('function');
  });

  describe('Actions', () => {
    it('setCurrentUser updates state and calls service', () => {
      let contextValue: any = null;

      function Consumer() {
        contextValue = useMessaging();
        return null;
      }

      render(
        <MessagingProvider>
          <Consumer />
        </MessagingProvider>
      );

      const mockUser = { id: 'u1', name: 'Test User', email: 'test@example.com' };

      act(() => {
        contextValue.actions.setCurrentUser(mockUser);
      });

      expect(contextValue.state.currentUser).toEqual(mockUser);
      expect(mockMessagingService.setCurrentUser).toHaveBeenCalledWith(mockUser);
    });

    it('loadConversations fetches and dispatches conversations', async () => {
      const mockConversations = [
        { id: 'c1', name: 'Conv 1', unreadCount: 2 },
        { id: 'c2', name: 'Conv 2', unreadCount: 0 },
      ];
      mockMessagingService.getConversations.mockResolvedValue(mockConversations);

      let contextValue: any = null;

      function Consumer() {
        contextValue = useMessaging();
        return null;
      }

      render(
        <MessagingProvider>
          <Consumer />
        </MessagingProvider>
      );

      await act(async () => {
        await contextValue.actions.loadConversations();
      });

      expect(contextValue.state.conversations).toEqual(mockConversations);
      expect(contextValue.state.unreadCounts.messages).toBe(2);
    });

    it('selectConversation sets active conversation and clears unread', () => {
      let contextValue: any = null;

      function Consumer() {
        contextValue = useMessaging();
        return null;
      }

      render(
        <MessagingProvider>
          <Consumer />
        </MessagingProvider>
      );

      act(() => {
        contextValue.actions.selectConversation('conv-1');
      });

      expect(contextValue.state.activeConversationId).toBe('conv-1');
    });

    it('loadMessages fetches messages for a conversation', async () => {
      const mockMessages = [
        { id: 'm1', content: 'Hello', conversationId: 'c1' },
        { id: 'm2', content: 'World', conversationId: 'c1' },
      ];
      mockMessagingService.getMessages.mockResolvedValue(mockMessages);

      let contextValue: any = null;

      function Consumer() {
        contextValue = useMessaging();
        return null;
      }

      render(
        <MessagingProvider>
          <Consumer />
        </MessagingProvider>
      );

      await act(async () => {
        await contextValue.actions.loadMessages('c1');
      });

      expect(contextValue.state.messages['c1']).toEqual(mockMessages);
    });

    it('sendMessage calls messagingService.sendMessage', async () => {
      mockMessagingService.sendMessage.mockResolvedValue(undefined);

      let contextValue: any = null;

      function Consumer() {
        contextValue = useMessaging();
        return null;
      }

      render(
        <MessagingProvider>
          <Consumer />
        </MessagingProvider>
      );

      const messageData = { conversationId: 'c1', content: 'Hello' };

      await act(async () => {
        await contextValue.actions.sendMessage(messageData);
      });

      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(messageData);
    });

    it('loadNotifications fetches and dispatches notifications', async () => {
      const mockNotifications = [
        { id: 'n1', isRead: false, content: 'New message' },
        { id: 'n2', isRead: true, content: 'Old message' },
      ];
      mockMessagingService.getNotifications.mockResolvedValue(mockNotifications);

      let contextValue: any = null;

      function Consumer() {
        contextValue = useMessaging();
        return null;
      }

      render(
        <MessagingProvider>
          <Consumer />
        </MessagingProvider>
      );

      await act(async () => {
        await contextValue.actions.loadNotifications();
      });

      expect(contextValue.state.notifications).toEqual(mockNotifications);
      expect(contextValue.state.unreadCounts.notifications).toBe(1);
    });

    it('startTyping calls messagingService', () => {
      let contextValue: any = null;

      function Consumer() {
        contextValue = useMessaging();
        return null;
      }

      render(
        <MessagingProvider>
          <Consumer />
        </MessagingProvider>
      );

      act(() => {
        contextValue.actions.startTyping('conv-1');
      });

      expect(mockMessagingService.startTyping).toHaveBeenCalledWith('conv-1');
    });

    it('stopTyping calls messagingService', () => {
      let contextValue: any = null;

      function Consumer() {
        contextValue = useMessaging();
        return null;
      }

      render(
        <MessagingProvider>
          <Consumer />
        </MessagingProvider>
      );

      act(() => {
        contextValue.actions.stopTyping('conv-1');
      });

      expect(mockMessagingService.stopTyping).toHaveBeenCalledWith('conv-1');
    });
  });
});

describe('useMessaging', () => {
  it('throws when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      function Test() {
        useMessaging();
        return null;
      }
      render(<Test />);
    }).toThrow('useMessaging must be used within a MessagingProvider');

    consoleSpy.mockRestore();
  });
});

describe('useMessagingOptional', () => {
  it('returns undefined when used outside provider', () => {
    let contextValue: any = 'unset';

    function Test() {
      contextValue = useMessagingOptional();
      return null;
    }

    render(<Test />);

    expect(contextValue).toBeUndefined();
  });
});
