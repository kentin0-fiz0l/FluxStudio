/**
 * Unit Tests for useMessaging hook
 *
 * Sprint 24: useMessaging reads from the Zustand store directly,
 * and calls messagingService for typing indicators.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// vi.hoisted() ensures these are available before hoisted vi.mock() factories run
const {
  mockSetCurrentUser,
  mockFetchConversations,
  mockSetActiveConversation,
  mockMarkAsRead,
  mockFetchMessages,
  mockMessagingService,
} = vi.hoisted(() => ({
  mockSetCurrentUser: vi.fn(),
  mockFetchConversations: vi.fn(),
  mockSetActiveConversation: vi.fn(),
  mockMarkAsRead: vi.fn(),
  mockFetchMessages: vi.fn(),
  mockMessagingService: {
    startTyping: vi.fn(),
    stopTyping: vi.fn(),
    createConversation: vi.fn(),
    sendMessage: vi.fn(),
    setCurrentUser: vi.fn(),
  },
}));

const mockMessagingState = {
  conversations: [
    { id: 'conv-1', type: 'direct', name: 'Test Conv', unreadCount: 2, participants: [{ id: 'user-1' }], metadata: { priority: 'medium', isArchived: false, isMuted: false, isPinned: false } },
    { id: 'conv-2', type: 'group', name: 'Group Conv', unreadCount: 0, participants: [{ id: 'user-1' }, { id: 'user-2' }], metadata: { priority: 'high', isArchived: true, isMuted: false, isPinned: false }, projectId: 'proj-1' },
  ] as Array<Record<string, unknown>>,
  activeConversationId: 'conv-1' as string | null,
  messages: { 'conv-1': [{ id: 'msg-1', content: 'Hello' }] } as Record<string, unknown[]>,
  currentUser: { id: 'user-1', name: 'Test User' } as { id: string; name: string } | null,
  loadingStates: { conversations: false } as Record<string, boolean>,
  unreadCounts: { messages: 3 },
  userPresence: { 'user-2': { status: 'online' } } as Record<string, { status: string }>,
  typingIndicators: [] as unknown[],
  error: null as string | null,
  setCurrentUser: mockSetCurrentUser,
  fetchConversations: mockFetchConversations,
  setActiveConversation: mockSetActiveConversation,
  markAsRead: mockMarkAsRead,
  fetchMessages: mockFetchMessages,
  addConversation: vi.fn(),
};

const mockFullState = { messaging: mockMessagingState };

vi.mock('../../store/store', () => {
  const useStoreFn = (selector: (state: typeof mockFullState) => unknown) => selector(mockFullState);
  useStoreFn.getState = () => mockFullState;
  useStoreFn.setState = vi.fn();
  return { useStore: useStoreFn };
});

vi.mock('../../services/messagingService', () => ({
  messagingService: mockMessagingService,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User', userType: 'designer' },
  }),
}));

vi.mock('../../config/environment', () => ({
  buildApiUrl: (path: string) => `http://localhost:3001${path}`,
  config: {
    API_BASE_URL: 'http://localhost:3001/api',
    SOCKET_URL: 'ws://localhost:3004',
    AUTH_URL: 'http://localhost:3001/api/auth',
    MESSAGING_URL: 'http://localhost:3004/api',
    APP_URL: 'http://localhost:3000',
    API_TIMEOUT: 30000,
    ENABLE_DEBUG: false,
  },
  default: {
    API_BASE_URL: 'http://localhost:3001/api',
    API_TIMEOUT: 30000,
  },
}));

vi.mock('../../lib/logger', () => {
  const child = () => ({ warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() });
  return {
    hookLogger: { child },
    serviceLogger: { child },
    socketLogger: { child },
    createLogger: () => ({ child, warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() }),
  };
});

vi.mock('../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { useMessaging } from '../useMessaging';

describe('useMessaging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'test-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should return conversations from context', () => {
    const { result } = renderHook(() => useMessaging());

    expect(result.current.conversations).toHaveLength(2);
    expect(result.current.unreadCount).toBe(3);
  });

  it('should return active conversation and messages', () => {
    const { result } = renderHook(() => useMessaging());

    expect(result.current.activeConversation?.id).toBe('conv-1');
    expect(result.current.conversationMessages).toHaveLength(1);
  });

  it('should filter conversations by type', () => {
    const { result } = renderHook(() => useMessaging());

    const filtered = result.current.filterConversations({ type: 'direct' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('conv-1');
  });

  it('should filter conversations by projectId', () => {
    const { result } = renderHook(() => useMessaging());

    const filtered = result.current.filterConversations({ projectId: 'proj-1' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('conv-2');
  });

  it('should set typing indicators', () => {
    const { result } = renderHook(() => useMessaging());

    act(() => {
      result.current.setTyping('conv-1', true);
    });
    expect(mockMessagingService.startTyping).toHaveBeenCalledWith('conv-1');

    act(() => {
      result.current.setTyping('conv-1', false);
    });
    expect(mockMessagingService.stopTyping).toHaveBeenCalledWith('conv-1');
  });

  it('should set active conversation and load messages', () => {
    const { result } = renderHook(() => useMessaging());

    act(() => {
      result.current.setActiveConversation('conv-2');
    });

    expect(mockSetActiveConversation).toHaveBeenCalledWith('conv-2');
    expect(mockFetchMessages).toHaveBeenCalledWith('conv-2');
  });

  it('should return user presence', () => {
    const { result } = renderHook(() => useMessaging());

    expect(result.current.userPresence).toEqual({ 'user-2': { status: 'online' } });
  });
});
