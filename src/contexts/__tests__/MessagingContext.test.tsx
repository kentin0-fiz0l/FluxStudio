/**
 * MessagingContext Tests
 *
 * Sprint 24: MessagingContext was migrated to Zustand.
 * MessagingProvider is a no-op passthrough and useMessaging delegates to the store.
 * These tests verify the backward-compatible wrapper behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Mock messagingService for the typing/startTyping/stopTyping calls
const mockMessagingService = vi.hoisted(() => ({
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

// Mock store state
const mockSetCurrentUser = vi.fn();
const mockFetchConversations = vi.fn();
const mockSetActiveConversation = vi.fn();
const mockMarkAsRead = vi.fn();
const mockFetchMessages = vi.fn();

const mockStoreState = {
  messaging: {
    currentUser: null as { id: string; name: string; userType: string } | null,
    conversations: [],
    activeConversationId: null as string | null,
    messages: {} as Record<string, unknown[]>,
    typingIndicators: [],
    userPresence: {} as Record<string, { status: string }>,
    connectionStatus: false,
    loadingStates: {} as Record<string, boolean>,
    unreadCounts: { messages: 0, notifications: 0 },
    setCurrentUser: mockSetCurrentUser,
    fetchConversations: mockFetchConversations,
    setActiveConversation: mockSetActiveConversation,
    markAsRead: mockMarkAsRead,
    fetchMessages: mockFetchMessages,
  },
};

vi.mock('../../store/store', () => ({
  useStore: (selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState),
}));

import { MessagingProvider, useMessaging, useMessagingOptional } from '../MessagingContext';

describe('MessagingProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.messaging.currentUser = null;
    mockStoreState.messaging.conversations = [];
    mockStoreState.messaging.activeConversationId = null;
    mockStoreState.messaging.messages = {};
    mockStoreState.messaging.connectionStatus = false;
    mockStoreState.messaging.unreadCounts = { messages: 0, notifications: 0 };
  });

  it('renders children (no-op passthrough)', () => {
    const { getByText } = render(
      <MessagingProvider>
        <div>Hello Child</div>
      </MessagingProvider>
    );
    expect(getByText('Hello Child')).toBeInTheDocument();
  });

  it('provides initial state values via useMessaging', () => {
    let contextValue: ReturnType<typeof useMessaging> | null = null;

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
    expect(contextValue!.state.currentUser).toBeNull();
    expect(contextValue!.state.conversations).toEqual([]);
    expect(contextValue!.state.activeConversationId).toBeNull();
    expect(contextValue!.state.messages).toEqual({});
    expect(contextValue!.state.connectionStatus).toBe(false);
    expect(contextValue!.state.unreadCounts).toEqual({ messages: 0, notifications: 0 });
  });

  it('provides actions object', () => {
    let contextValue: ReturnType<typeof useMessaging> | null = null;

    function Consumer() {
      contextValue = useMessaging();
      return null;
    }

    render(
      <MessagingProvider>
        <Consumer />
      </MessagingProvider>
    );

    expect(contextValue!.actions).toBeDefined();
    expect(typeof contextValue!.actions.setCurrentUser).toBe('function');
    expect(typeof contextValue!.actions.loadConversations).toBe('function');
    expect(typeof contextValue!.actions.selectConversation).toBe('function');
    expect(typeof contextValue!.actions.loadMessages).toBe('function');
    expect(typeof contextValue!.actions.sendMessage).toBe('function');
    expect(typeof contextValue!.actions.startTyping).toBe('function');
    expect(typeof contextValue!.actions.stopTyping).toBe('function');
  });

  describe('Actions', () => {
    it('setCurrentUser delegates to store', () => {
      let contextValue: ReturnType<typeof useMessaging> | null = null;

      function Consumer() {
        contextValue = useMessaging();
        return null;
      }

      render(
        <MessagingProvider>
          <Consumer />
        </MessagingProvider>
      );

      const mockUser = { id: 'u1', name: 'Test User', userType: 'designer' };
      contextValue!.actions.setCurrentUser(mockUser as any);

      expect(mockSetCurrentUser).toHaveBeenCalledWith(mockUser);
    });

    it('loadConversations delegates to store fetchConversations', async () => {
      let contextValue: ReturnType<typeof useMessaging> | null = null;

      function Consumer() {
        contextValue = useMessaging();
        return null;
      }

      render(
        <MessagingProvider>
          <Consumer />
        </MessagingProvider>
      );

      await contextValue!.actions.loadConversations();
      expect(mockFetchConversations).toHaveBeenCalled();
    });

    it('selectConversation delegates to store', () => {
      let contextValue: ReturnType<typeof useMessaging> | null = null;

      function Consumer() {
        contextValue = useMessaging();
        return null;
      }

      render(
        <MessagingProvider>
          <Consumer />
        </MessagingProvider>
      );

      contextValue!.actions.selectConversation('conv-1');
      expect(mockSetActiveConversation).toHaveBeenCalledWith('conv-1');
      expect(mockMarkAsRead).toHaveBeenCalledWith('conv-1');
    });

    it('loadMessages delegates to store fetchMessages', async () => {
      let contextValue: ReturnType<typeof useMessaging> | null = null;

      function Consumer() {
        contextValue = useMessaging();
        return null;
      }

      render(
        <MessagingProvider>
          <Consumer />
        </MessagingProvider>
      );

      await contextValue!.actions.loadMessages('c1');
      expect(mockFetchMessages).toHaveBeenCalledWith('c1');
    });

    it('startTyping calls messagingService', () => {
      let contextValue: ReturnType<typeof useMessaging> | null = null;

      function Consumer() {
        contextValue = useMessaging();
        return null;
      }

      render(
        <MessagingProvider>
          <Consumer />
        </MessagingProvider>
      );

      contextValue!.actions.startTyping('conv-1');
      expect(mockMessagingService.startTyping).toHaveBeenCalledWith('conv-1');
    });

    it('stopTyping calls messagingService', () => {
      let contextValue: ReturnType<typeof useMessaging> | null = null;

      function Consumer() {
        contextValue = useMessaging();
        return null;
      }

      render(
        <MessagingProvider>
          <Consumer />
        </MessagingProvider>
      );

      contextValue!.actions.stopTyping('conv-1');
      expect(mockMessagingService.stopTyping).toHaveBeenCalledWith('conv-1');
    });
  });
});

describe('useMessaging', () => {
  it('works without MessagingProvider (since provider is a no-op)', () => {
    let contextValue: ReturnType<typeof useMessaging> | null = null;

    function Test() {
      contextValue = useMessaging();
      return null;
    }

    // No provider needed — useMessaging reads from Zustand directly
    render(<Test />);

    expect(contextValue).not.toBeNull();
    expect(contextValue!.state).toBeDefined();
    expect(contextValue!.actions).toBeDefined();
  });
});

describe('useMessagingOptional', () => {
  it('returns same shape as useMessaging (Zustand backed)', () => {
    let contextValue: ReturnType<typeof useMessagingOptional> | null = null;

    function Test() {
      contextValue = useMessagingOptional();
      return null;
    }

    render(<Test />);

    expect(contextValue).not.toBeNull();
    expect(contextValue!.state).toBeDefined();
    expect(contextValue!.actions).toBeDefined();
  });
});
