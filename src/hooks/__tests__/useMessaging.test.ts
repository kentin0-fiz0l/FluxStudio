/**
 * Unit Tests for useMessaging hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockActions = {
  setCurrentUser: vi.fn(),
  loadConversations: vi.fn(),
  loadNotifications: vi.fn(),
  createConversation: vi.fn(),
  sendMessage: vi.fn(),
  selectConversation: vi.fn(),
  loadMessages: vi.fn(),
  startTyping: vi.fn(),
  stopTyping: vi.fn(),
};

const mockState = {
  conversations: [
    { id: 'conv-1', type: 'direct', name: 'Test Conv', unreadCount: 2, participants: [{ id: 'user-1' }], metadata: { priority: 'medium', isArchived: false, isMuted: false, isPinned: false } },
    { id: 'conv-2', type: 'group', name: 'Group Conv', unreadCount: 0, participants: [{ id: 'user-1' }, { id: 'user-2' }], metadata: { priority: 'high', isArchived: true, isMuted: false, isPinned: false }, projectId: 'proj-1' },
  ],
  activeConversationId: 'conv-1',
  messages: { 'conv-1': [{ id: 'msg-1', content: 'Hello' }] },
  currentUser: { id: 'user-1', name: 'Test User' },
  loading: { conversations: false, notifications: false },
  unreadCounts: { messages: 3 },
  userPresence: { 'user-2': { status: 'online' } },
};

vi.mock('../../contexts/MessagingContext', () => ({
  useMessaging: () => ({ state: mockState, actions: mockActions }),
  useMessagingOptional: () => ({ state: mockState, actions: mockActions }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User', userType: 'designer' },
  }),
}));

vi.mock('../../config/environment', () => ({
  buildApiUrl: (path: string) => `http://localhost:3001${path}`,
}));

vi.mock('../../lib/logger', () => ({
  hookLogger: { child: () => ({ warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

describe('useMessaging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'test-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('should return conversations from context', async () => {
    const { useMessaging } = await import('../useMessaging');
    const { result } = renderHook(() => useMessaging());

    expect(result.current.conversations).toHaveLength(2);
    expect(result.current.unreadCount).toBe(3);
  });

  it('should return active conversation and messages', async () => {
    const { useMessaging } = await import('../useMessaging');
    const { result } = renderHook(() => useMessaging());

    expect(result.current.activeConversation?.id).toBe('conv-1');
    expect(result.current.conversationMessages).toHaveLength(1);
  });

  it('should filter conversations by type', async () => {
    const { useMessaging } = await import('../useMessaging');
    const { result } = renderHook(() => useMessaging());

    const filtered = result.current.filterConversations({ type: 'direct' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('conv-1');
  });

  it('should filter conversations by projectId', async () => {
    const { useMessaging } = await import('../useMessaging');
    const { result } = renderHook(() => useMessaging());

    const filtered = result.current.filterConversations({ projectId: 'proj-1' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('conv-2');
  });

  it('should set typing indicators', async () => {
    const { useMessaging } = await import('../useMessaging');
    const { result } = renderHook(() => useMessaging());

    act(() => {
      result.current.setTyping('conv-1', true);
    });
    expect(mockActions.startTyping).toHaveBeenCalledWith('conv-1');

    act(() => {
      result.current.setTyping('conv-1', false);
    });
    expect(mockActions.stopTyping).toHaveBeenCalledWith('conv-1');
  });

  it('should set active conversation and load messages', async () => {
    const { useMessaging } = await import('../useMessaging');
    const { result } = renderHook(() => useMessaging());

    act(() => {
      result.current.setActiveConversation('conv-2');
    });

    expect(mockActions.selectConversation).toHaveBeenCalledWith('conv-2');
    expect(mockActions.loadMessages).toHaveBeenCalledWith('conv-2');
  });

  it('should return user presence', async () => {
    const { useMessaging } = await import('../useMessaging');
    const { result } = renderHook(() => useMessaging());

    expect(result.current.userPresence).toEqual({ 'user-2': { status: 'online' } });
  });
});
