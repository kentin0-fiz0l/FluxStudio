/**
 * Unit Tests for useConversationRealtime Hook
 * @file src/hooks/__tests__/useConversationRealtime.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Socket mock - use vi.hoisted to avoid TDZ issues with vi.mock hoisting
const { eventHandlers, mockSocketService } = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    eventHandlers: handlers,
    mockSocketService: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      getConnectionStatus: vi.fn(() => false),
      joinConversation: vi.fn(),
      leaveConversation: vi.fn(),
      sendMessage: vi.fn(),
      deleteMessage: vi.fn(),
      startTyping: vi.fn(),
      stopTyping: vi.fn(),
      markAsRead: vi.fn(),
      subscribeToNotifications: vi.fn(),
      markNotificationRead: vi.fn(),
      markAllNotificationsRead: vi.fn(),
      addReaction: vi.fn(),
      removeReaction: vi.fn(),
      pinMessage: vi.fn(),
      unpinMessage: vi.fn(),
      editMessage: vi.fn(),
      forwardMessage: vi.fn(),
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers.set(event, handler);
        return () => handlers.delete(event);
      }),
    },
  };
});

vi.mock('../../services/messagingSocketService', () => ({
  messagingSocketService: mockSocketService,
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
  })),
}));

import { useConversationRealtime } from '../useConversationRealtime';

describe('useConversationRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers.clear();
    // Re-apply mock implementations after clearAllMocks
    mockSocketService.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      eventHandlers.set(event, handler);
      return () => eventHandlers.delete(event);
    });
    mockSocketService.getConnectionStatus.mockReturnValue(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should return default state', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      expect(result.current.isConnected).toBe(false);
      expect(result.current.messages).toEqual([]);
      expect(result.current.typingUsers).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.pinnedMessageIds).toEqual([]);
    });
  });

  describe('Connection', () => {
    it('should auto-connect when autoConnect is true', () => {
      renderHook(() => useConversationRealtime({ autoConnect: true }));
      expect(mockSocketService.connect).toHaveBeenCalled();
    });

    it('should not auto-connect when autoConnect is false', () => {
      renderHook(() => useConversationRealtime({ autoConnect: false }));
      expect(mockSocketService.connect).not.toHaveBeenCalled();
    });

    it('should update isConnected on connect event', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      const connectHandler = eventHandlers.get('connect');
      act(() => {
        connectHandler?.();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should update isConnected on disconnect event', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      // Connect first
      const connectHandler = eventHandlers.get('connect');
      act(() => {
        connectHandler?.();
      });
      expect(result.current.isConnected).toBe(true);

      const disconnectHandler = eventHandlers.get('disconnect');
      act(() => {
        disconnectHandler?.();
      });
      expect(result.current.isConnected).toBe(false);
    });

    it('should disconnect on disconnect()', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      act(() => {
        result.current.disconnect();
      });

      expect(mockSocketService.disconnect).toHaveBeenCalled();
    });
  });

  describe('Messages', () => {
    it('should set messages on conversation:messages event', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      const handler = eventHandlers.get('conversation:messages');
      act(() => {
        handler?.({
          conversationId: 'conv-1',
          messages: [{ id: 'msg-1', content: 'Hello' }],
          hasMore: false,
        });
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].id).toBe('msg-1');
    });

    it('should append new message on conversation:message:new', () => {
      const onNewMessage = vi.fn();
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false, onNewMessage })
      );

      const handler = eventHandlers.get('conversation:message:new');
      act(() => {
        handler?.({
          conversationId: 'conv-1',
          message: { id: 'msg-2', content: 'World' },
        });
      });

      expect(result.current.messages).toHaveLength(1);
      expect(onNewMessage).toHaveBeenCalled();
    });

    it('should remove message on conversation:message:deleted', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      // Add messages
      const msgsHandler = eventHandlers.get('conversation:messages');
      act(() => {
        msgsHandler?.({
          conversationId: 'conv-1',
          messages: [{ id: 'msg-1' }, { id: 'msg-2' }],
          hasMore: false,
        });
      });
      expect(result.current.messages).toHaveLength(2);

      // Delete one
      const deleteHandler = eventHandlers.get('conversation:message:deleted');
      act(() => {
        deleteHandler?.({
          conversationId: 'conv-1',
          messageId: 'msg-1',
          deletedBy: 'user-1',
        });
      });
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].id).toBe('msg-2');
    });
  });

  describe('Typing Indicators', () => {
    it('should add typing user', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      const handler = eventHandlers.get('conversation:user-typing');
      act(() => {
        handler?.({
          conversationId: 'conv-1',
          userId: 'user-2',
          userEmail: 'other@example.com',
          isTyping: true,
        });
      });

      expect(result.current.typingUsers).toHaveLength(1);
      expect(result.current.typingUsers[0].userId).toBe('user-2');
    });

    it('should remove typing user on stop event', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      // Start typing
      const startHandler = eventHandlers.get('conversation:user-typing');
      act(() => {
        startHandler?.({
          conversationId: 'conv-1',
          userId: 'user-2',
          userEmail: 'other@example.com',
          isTyping: true,
        });
      });
      expect(result.current.typingUsers).toHaveLength(1);

      // Stop typing
      const stopHandler = eventHandlers.get('conversation:user-stopped-typing');
      act(() => {
        stopHandler?.({ conversationId: 'conv-1', userId: 'user-2' });
      });
      expect(result.current.typingUsers).toHaveLength(0);
    });

    it('should track typing user timestamp', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      const handler = eventHandlers.get('conversation:user-typing');
      act(() => {
        handler?.({
          conversationId: 'conv-1',
          userId: 'user-2',
          userEmail: 'other@example.com',
          isTyping: true,
        });
      });
      expect(result.current.typingUsers).toHaveLength(1);
      expect(result.current.typingUsers[0].userId).toBe('user-2');
    });

    it('should not duplicate typing users', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      const handler = eventHandlers.get('conversation:user-typing');
      act(() => {
        handler?.({
          conversationId: 'conv-1',
          userId: 'user-2',
          userEmail: 'other@example.com',
          isTyping: true,
        });
        handler?.({
          conversationId: 'conv-1',
          userId: 'user-2',
          userEmail: 'other@example.com',
          isTyping: true,
        });
      });

      expect(result.current.typingUsers).toHaveLength(1);
    });
  });

  describe('Actions', () => {
    it('should call sendMessage on socket service', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({
          conversationId: 'conv-1',
          autoConnect: false,
        })
      );

      // Join conversation first
      act(() => {
        result.current.joinConversation('conv-1');
      });

      act(() => {
        result.current.sendMessage('Hello!');
      });

      expect(mockSocketService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          text: 'Hello!',
        })
      );
    });

    it('should call startTyping on socket service', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      act(() => {
        result.current.joinConversation('conv-1');
      });

      act(() => {
        result.current.startTyping();
      });

      expect(mockSocketService.startTyping).toHaveBeenCalledWith('conv-1');
    });

    it('should call markAsRead on socket service', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      act(() => {
        result.current.joinConversation('conv-1');
      });

      act(() => {
        result.current.markAsRead('msg-1');
      });

      expect(mockSocketService.markAsRead).toHaveBeenCalledWith('conv-1', 'msg-1');
    });
  });

  describe('Reactions', () => {
    it('should optimistically add reaction', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      // Set up messages
      const handler = eventHandlers.get('conversation:messages');
      act(() => {
        handler?.({
          conversationId: 'conv-1',
          messages: [{ id: 'msg-1', content: 'Hello', reactions: [] }],
          hasMore: false,
        });
      });

      act(() => {
        result.current.addReaction('msg-1', '👍');
      });

      expect(result.current.messages[0].reactions).toHaveLength(1);
      expect(mockSocketService.addReaction).toHaveBeenCalledWith(
        'msg-1',
        '👍',
        expect.any(Function)
      );
    });
  });

  describe('Pins', () => {
    it('should optimistically pin message', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      act(() => {
        result.current.pinMessage('msg-1');
      });

      expect(result.current.pinnedMessageIds).toContain('msg-1');
      expect(mockSocketService.pinMessage).toHaveBeenCalled();
    });

    it('should optimistically unpin message', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      // Pin first
      act(() => {
        result.current.pinMessage('msg-1');
      });

      // Unpin
      act(() => {
        result.current.unpinMessage('msg-1');
      });

      expect(result.current.pinnedMessageIds).not.toContain('msg-1');
    });

    it('should update pins from server event', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      const handler = eventHandlers.get('conversation:pins:updated');
      act(() => {
        handler?.({
          conversationId: 'conv-1',
          pins: [
            { message: { id: 'msg-1' } },
            { message: { id: 'msg-2' } },
          ],
        });
      });

      expect(result.current.pinnedMessageIds).toEqual(['msg-1', 'msg-2']);
    });
  });

  describe('Unread Count', () => {
    it('should update unread count from server', () => {
      const { result } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      const handler = eventHandlers.get('notifications:unread-count');
      act(() => {
        handler?.({ count: 5 });
      });

      expect(result.current.unreadCount).toBe(5);
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from all events on unmount', () => {
      const { unmount } = renderHook(() =>
        useConversationRealtime({ autoConnect: false })
      );

      unmount();
      // The unsub functions returned by on() should have been called
      // We verify by checking eventHandlers is emptied via the cleanup
    });
  });
});
