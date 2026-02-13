/**
 * Unit Tests for Messaging Socket Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Inline the socket mock since vi.hoisted can't import from other files
const { mockSocket, mockIo, eventHandlers } = vi.hoisted(() => {
  const eventHandlers = new Map<string, Function>();

  const mockSocket = {
    on: vi.fn((event: string, handler: Function) => {
      eventHandlers.set(event, handler);
      return mockSocket;
    }),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
    connected: true,
    id: 'mock-socket-id',
  };

  const mockIo = vi.fn(() => mockSocket);

  return { mockSocket, mockIo, eventHandlers };
});

vi.mock('socket.io-client', () => ({ io: mockIo }));

vi.mock('@/services/logging', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { messagingSocketService } from '../messagingSocketService';

describe('MessagingSocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers.clear();
    mockSocket.connected = true;
    localStorage.clear();
    localStorage.setItem('auth_token', 'test-token');
    messagingSocketService.disconnect();
  });

  describe('connect', () => {
    it('should not connect without auth token', () => {
      localStorage.removeItem('auth_token');
      messagingSocketService.connect();
      expect(mockIo).not.toHaveBeenCalled();
    });

    it('should connect with auth token', () => {
      messagingSocketService.connect();
      expect(mockIo).toHaveBeenCalledWith(
        expect.stringContaining('/messaging'),
        expect.objectContaining({
          auth: { token: 'test-token' },
          transports: ['websocket', 'polling'],
          reconnection: true,
        })
      );
    });

    it('should not reconnect if already connected', () => {
      messagingSocketService.connect();
      const callCount = mockIo.mock.calls.length;
      messagingSocketService.connect();
      expect(mockIo.mock.calls.length).toBe(callCount);
    });

    it('should set up event handlers on connect', () => {
      messagingSocketService.connect();
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('disconnect', () => {
    it('should disconnect socket and reset state', () => {
      messagingSocketService.connect();
      messagingSocketService.disconnect();
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(messagingSocketService.getConnectionStatus()).toBe(false);
    });

    it('should leave current conversation before disconnecting', () => {
      messagingSocketService.connect();
      messagingSocketService.joinConversation('conv-1');
      messagingSocketService.disconnect();
      expect(mockSocket.emit).toHaveBeenCalledWith('conversation:leave', 'conv-1');
    });
  });

  describe('joinConversation', () => {
    it('should emit join event and track current conversation', () => {
      messagingSocketService.connect();
      messagingSocketService.joinConversation('conv-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('conversation:join', 'conv-1');
      expect(messagingSocketService.getCurrentConversationId()).toBe('conv-1');
    });
  });

  describe('leaveConversation', () => {
    it('should emit leave event and clear current conversation', () => {
      messagingSocketService.connect();
      messagingSocketService.joinConversation('conv-1');
      vi.clearAllMocks();
      messagingSocketService.leaveConversation('conv-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('conversation:leave', 'conv-1');
      expect(messagingSocketService.getCurrentConversationId()).toBeNull();
    });

    it('should not clear currentConversationId if leaving a different conversation', () => {
      messagingSocketService.connect();
      messagingSocketService.joinConversation('conv-1');
      messagingSocketService.leaveConversation('conv-2');
      expect(messagingSocketService.getCurrentConversationId()).toBe('conv-1');
    });
  });

  describe('sendMessage', () => {
    it('should emit message send event', () => {
      messagingSocketService.connect();
      messagingSocketService.sendMessage({ conversationId: 'conv-1', text: 'Hello' });
      expect(mockSocket.emit).toHaveBeenCalledWith('conversation:message:send', {
        conversationId: 'conv-1',
        text: 'Hello',
      });
    });
  });

  describe('deleteMessage', () => {
    it('should emit delete event', () => {
      messagingSocketService.connect();
      messagingSocketService.deleteMessage('conv-1', 'msg-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('conversation:message:delete', {
        conversationId: 'conv-1',
        messageId: 'msg-1',
      });
    });
  });

  describe('reactions', () => {
    it('should emit add reaction', () => {
      messagingSocketService.connect();
      const cb = vi.fn();
      messagingSocketService.addReaction('msg-1', 'thumbsup', cb);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'conversation:reaction:add',
        { messageId: 'msg-1', emoji: 'thumbsup' },
        cb
      );
    });

    it('should emit remove reaction', () => {
      messagingSocketService.connect();
      messagingSocketService.removeReaction('msg-1', 'thumbsup');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'conversation:reaction:remove',
        { messageId: 'msg-1', emoji: 'thumbsup' },
        undefined
      );
    });
  });

  describe('pins', () => {
    it('should emit pin message', () => {
      messagingSocketService.connect();
      messagingSocketService.pinMessage('msg-1');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'conversation:pin',
        { messageId: 'msg-1' },
        undefined
      );
    });

    it('should emit unpin message', () => {
      messagingSocketService.connect();
      messagingSocketService.unpinMessage('msg-1');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'conversation:unpin',
        { messageId: 'msg-1' },
        undefined
      );
    });
  });

  describe('editMessage', () => {
    it('should emit edit event', () => {
      messagingSocketService.connect();
      messagingSocketService.editMessage('conv-1', 'msg-1', 'edited text');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'conversation:message:edit',
        { conversationId: 'conv-1', messageId: 'msg-1', content: 'edited text' },
        undefined
      );
    });
  });

  describe('forwardMessage', () => {
    it('should emit forward event', () => {
      messagingSocketService.connect();
      messagingSocketService.forwardMessage('src-conv', 'tgt-conv', 'msg-1');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'conversation:message:forward',
        { sourceConversationId: 'src-conv', targetConversationId: 'tgt-conv', messageId: 'msg-1' },
        undefined
      );
    });
  });

  describe('typing indicators', () => {
    it('should emit typing start/stop', () => {
      messagingSocketService.connect();
      messagingSocketService.startTyping('conv-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('conversation:typing:start', 'conv-1');
      messagingSocketService.stopTyping('conv-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('conversation:typing:stop', 'conv-1');
    });
  });

  describe('read receipts', () => {
    it('should emit read event', () => {
      messagingSocketService.connect();
      messagingSocketService.markAsRead('conv-1', 'msg-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('conversation:read', {
        conversationId: 'conv-1',
        messageId: 'msg-1',
      });
    });
  });

  describe('notifications', () => {
    it('should subscribe to notifications', () => {
      messagingSocketService.connect();
      messagingSocketService.subscribeToNotifications();
      expect(mockSocket.emit).toHaveBeenCalledWith('notifications:subscribe');
    });

    it('should mark notification read', () => {
      messagingSocketService.connect();
      messagingSocketService.markNotificationRead('n1');
      expect(mockSocket.emit).toHaveBeenCalledWith('notification:mark-read', 'n1');
    });

    it('should mark all notifications read', () => {
      messagingSocketService.connect();
      messagingSocketService.markAllNotificationsRead();
      expect(mockSocket.emit).toHaveBeenCalledWith('notifications:mark-all-read');
    });
  });

  describe('event handling', () => {
    it('should register and unregister event listeners', () => {
      const cb = vi.fn();
      const unsubscribe = messagingSocketService.on('conversation:message:new', cb);
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should emit events to registered listeners', () => {
      const cb = vi.fn();
      messagingSocketService.on('connect', cb);

      messagingSocketService.connect();
      const connectHandler = eventHandlers.get('connect');
      if (connectHandler) connectHandler();

      expect(cb).toHaveBeenCalled();
    });
  });

  describe('getConnectionStatus', () => {
    it('should return false when not connected', () => {
      expect(messagingSocketService.getConnectionStatus()).toBe(false);
    });
  });
});
