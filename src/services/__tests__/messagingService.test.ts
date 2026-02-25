/**
 * Unit Tests for Messaging Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock socketService
const mockSocketService = vi.hoisted(() => ({
  authenticateUser: vi.fn(),
  joinConversation: vi.fn(),
  leaveConversation: vi.fn(),
  sendMessage: vi.fn(),
  startTyping: vi.fn(),
  stopTyping: vi.fn(),
  markMessageAsRead: vi.fn(),
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}));

vi.mock('../socketService', () => ({
  socketService: mockSocketService,
}));

vi.mock('../../lib/logger', () => ({
  serviceLogger: {
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Mock apiService instead of global fetch
vi.mock('@/services/apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    makeRequest: vi.fn(),
  },
}));

import { apiService } from '@/services/apiService';
import { messagingService } from '../messagingService';

/**
 * Helper: mock a successful apiService response.
 * apiRequest extracts result.data, so we wrap the payload.
 */
function mockApiGet(data: any) {
  vi.mocked(apiService.get).mockResolvedValueOnce({ success: true, data });
}

function mockApiPost(data: any) {
  vi.mocked(apiService.post).mockResolvedValueOnce({ success: true, data });
}

function mockApiPatch(data: any) {
  vi.mocked(apiService.patch).mockResolvedValueOnce({ success: true, data });
}

function mockApiDelete(data: any = {}) {
  vi.mocked(apiService.delete).mockResolvedValueOnce({ success: true, data });
}

function mockApiGetError(message = 'Server Error') {
  vi.mocked(apiService.get).mockRejectedValueOnce(new Error(message));
}

function mockApiPostError(message = 'Server Error') {
  vi.mocked(apiService.post).mockRejectedValueOnce(new Error(message));
}

describe('MessagingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setCurrentUser', () => {
    it('should set current user and authenticate socket', () => {
      const user = { id: 'u1', name: 'Test', userType: 'designer' as const, email: 't@t.com', avatar: '' };
      messagingService.setCurrentUser(user);

      expect(mockSocketService.authenticateUser).toHaveBeenCalledWith('u1', {
        name: 'Test',
        userType: 'designer',
      });
      expect(messagingService.getCurrentUser()).toEqual(user);
    });
  });

  describe('getConversations', () => {
    it('should fetch and transform conversations', async () => {
      mockApiGet({
        success: true,
        conversations: [
          {
            id: 'conv-1',
            name: 'Test',
            participants: ['user-1', 'user-2'],
          },
        ],
      });

      const result = await messagingService.getConversations();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('conv-1');
      // String participants should be converted to MessageUser objects
      expect(result[0].participants[0]).toHaveProperty('id', 'user-1');
    });

    it('should handle filter parameters', async () => {
      mockApiGet({ conversations: [] });
      await messagingService.getConversations({ type: 'group' as any });

      expect(apiService.get).toHaveBeenCalledWith(
        expect.stringContaining('type=group')
      );
    });

    it('should return empty array for invalid response', async () => {
      mockApiGet({ conversations: 'not-an-array' });
      const result = await messagingService.getConversations();
      expect(result).toEqual([]);
    });

    it('should handle participant objects that are already MessageUser', async () => {
      const participant = { id: 'u1', name: 'User 1', userType: 'designer' };
      mockApiGet({ conversations: [{ id: 'c1', participants: [participant] }] });

      const result = await messagingService.getConversations();
      expect(result[0].participants[0]).toEqual(participant);
    });

    it('should filter out null participants', async () => {
      mockApiGet({ conversations: [{ id: 'c1', participants: [null, 'user-1', undefined] }] });
      const result = await messagingService.getConversations();
      expect(result[0].participants).toHaveLength(1);
    });
  });

  describe('getConversation', () => {
    it('should fetch a single conversation and transform participants', async () => {
      mockApiGet({ id: 'conv-1', participants: ['user-1'] });
      const result = await messagingService.getConversation('conv-1');
      expect(result.id).toBe('conv-1');
      expect(result.participants[0]).toHaveProperty('id', 'user-1');
    });
  });

  describe('createConversation', () => {
    it('should create conversation and join socket room', async () => {
      mockApiPost({ id: 'new-conv' });

      const result = await messagingService.createConversation({
        type: 'group' as any,
        name: 'New Conv',
        participants: ['user-1'],
      });

      expect(result.id).toBe('new-conv');
      expect(mockSocketService.joinConversation).toHaveBeenCalledWith('new-conv');
      expect(apiService.post).toHaveBeenCalledWith(
        expect.stringContaining('/conversations'),
        expect.objectContaining({ type: 'group' })
      );
    });
  });

  describe('updateConversation', () => {
    it('should send PATCH request', async () => {
      mockApiPatch({ id: 'conv-1', name: 'Updated' });
      await messagingService.updateConversation('conv-1', { name: 'Updated' });

      expect(apiService.patch).toHaveBeenCalledWith(
        expect.stringContaining('/conversations/conv-1'),
        expect.objectContaining({ name: 'Updated' })
      );
    });
  });

  describe('getMessages', () => {
    it('should fetch messages for a conversation', async () => {
      mockApiGet({ messages: [{ id: 'msg-1', content: 'Hello' }] });
      const result = await messagingService.getMessages('conv-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('msg-1');
    });

    it('should pass pagination options', async () => {
      mockApiGet({ messages: [] });
      await messagingService.getMessages('conv-1', { limit: 10, offset: 5 });

      expect(apiService.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=10')
      );
      expect(apiService.get).toHaveBeenCalledWith(
        expect.stringContaining('offset=5')
      );
    });

    it('should return empty array for non-array response', async () => {
      mockApiGet({ messages: 'bad' });
      const result = await messagingService.getMessages('conv-1');
      expect(result).toEqual([]);
    });
  });

  describe('sendMessage', () => {
    it('should throw if user not authenticated', async () => {
      // Set up a user first (singleton may already have one from prior tests)
      const user = { id: 'u1', name: 'Test', userType: 'designer' as const, email: 't@t.com', avatar: '' };
      messagingService.setCurrentUser(user);
      mockApiPost({ id: 'msg-1', content: 'Hello' });

      const result = await messagingService.sendMessage({
        conversationId: 'conv-1',
        type: 'text' as any,
        content: 'Hello',
      });
      expect(result.id).toBe('msg-1');
    });

    it('should send message via API and socket', async () => {
      const user = { id: 'u1', name: 'Test', userType: 'designer' as const, email: 't@t.com', avatar: '' };
      messagingService.setCurrentUser(user);
      mockApiPost({ id: 'msg-1', content: 'Hello' });

      const result = await messagingService.sendMessage({
        conversationId: 'conv-1',
        type: 'text' as any,
        content: 'Hello',
      });

      expect(result.id).toBe('msg-1');
      expect(mockSocketService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'conv-1', content: 'Hello' })
      );
    });
  });

  describe('editMessage', () => {
    it('should send PATCH request', async () => {
      mockApiPatch({ id: 'msg-1', content: 'edited' });
      await messagingService.editMessage('msg-1', 'edited');
      expect(apiService.patch).toHaveBeenCalledWith(
        expect.stringContaining('/messages/msg-1'),
        expect.objectContaining({ content: 'edited' })
      );
    });
  });

  describe('deleteMessage', () => {
    it('should send DELETE request', async () => {
      mockApiDelete({});
      await messagingService.deleteMessage('msg-1');
      expect(apiService.delete).toHaveBeenCalledWith(
        expect.stringContaining('/messages/msg-1')
      );
    });
  });

  describe('searchMessages', () => {
    it('should build search params from options', async () => {
      mockApiGet([]);
      await messagingService.searchMessages({ query: 'hello', conversationId: 'conv-1' } as any);
      expect(apiService.get).toHaveBeenCalledWith(
        expect.stringContaining('query=hello')
      );
    });
  });

  describe('markAsRead', () => {
    it('should call socket and API', async () => {
      mockApiPost({});
      await messagingService.markAsRead('msg-1', 'conv-1');
      expect(mockSocketService.markMessageAsRead).toHaveBeenCalledWith('msg-1', 'conv-1');
    });
  });

  describe('addReaction / removeReaction', () => {
    it('should call socket and API for add', async () => {
      mockApiPost({});
      await messagingService.addReaction('msg-1', 'conv-1', '\u{1F44D}');
      expect(mockSocketService.addReaction).toHaveBeenCalledWith('msg-1', 'conv-1', '\u{1F44D}');
    });

    it('should call socket and API for remove', async () => {
      mockApiDelete({});
      await messagingService.removeReaction('msg-1', 'conv-1', '\u{1F44D}');
      expect(mockSocketService.removeReaction).toHaveBeenCalledWith('msg-1', 'conv-1', '\u{1F44D}');
    });
  });

  describe('notifications', () => {
    it('should fetch notifications', async () => {
      mockApiGet({ notifications: [{ id: 'n1' }] });
      const result = await messagingService.getNotifications();
      expect(result).toHaveLength(1);
    });

    it('should return empty array for invalid notifications response', async () => {
      mockApiGet({ notifications: 'bad' });
      const result = await messagingService.getNotifications();
      expect(result).toEqual([]);
    });

    it('should mark notification as read', async () => {
      mockApiPost({});
      await messagingService.markNotificationAsRead('n1');
      expect(apiService.post).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/read'),
        expect.objectContaining({ ids: ['n1'] })
      );
    });

    it('should mark all notifications as read', async () => {
      mockApiPost({});
      await messagingService.markAllNotificationsAsRead();
      expect(apiService.post).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/read'),
        expect.objectContaining({ all: true })
      );
    });
  });

  describe('real-time features', () => {
    it('should delegate typing to socketService', () => {
      messagingService.startTyping('conv-1');
      expect(mockSocketService.startTyping).toHaveBeenCalledWith('conv-1');

      messagingService.stopTyping('conv-1');
      expect(mockSocketService.stopTyping).toHaveBeenCalledWith('conv-1');
    });

    it('should delegate join/leave to socketService', () => {
      messagingService.joinConversation('conv-1');
      expect(mockSocketService.joinConversation).toHaveBeenCalledWith('conv-1');

      messagingService.leaveConversation('conv-1');
      expect(mockSocketService.leaveConversation).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('event listeners', () => {
    it('should register message received listener', () => {
      const cb = vi.fn();
      messagingService.onMessageReceived(cb);
      expect(mockSocketService.on).toHaveBeenCalledWith('message:received', cb);
    });

    it('should register typing listeners', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      messagingService.onTypingStarted(cb1);
      messagingService.onTypingStopped(cb2);
      expect(mockSocketService.on).toHaveBeenCalledWith('typing:started', cb1);
      expect(mockSocketService.on).toHaveBeenCalledWith('typing:stopped', cb2);
    });
  });

  describe('pinMessage / unpinMessage', () => {
    it('should pin and return true on success', async () => {
      mockApiPost({});
      const result = await messagingService.pinMessage('conv-1', 'msg-1');
      expect(result).toBe(true);
    });

    it('should return false on pin failure', async () => {
      mockApiPostError('Server Error');
      const result = await messagingService.pinMessage('conv-1', 'msg-1');
      expect(result).toBe(false);
    });

    it('should unpin and return true on success', async () => {
      mockApiDelete({});
      const result = await messagingService.unpinMessage('conv-1', 'msg-1');
      expect(result).toBe(true);
    });
  });

  describe('muteConversation / unmuteConversation', () => {
    it('should mute conversation', async () => {
      mockApiPost({});
      const result = await messagingService.muteConversation('conv-1', 24);
      expect(result).toBe(true);
    });

    it('should return false on mute failure', async () => {
      mockApiPostError('Server Error');
      const result = await messagingService.muteConversation('conv-1');
      expect(result).toBe(false);
    });

    it('should unmute conversation', async () => {
      mockApiDelete({});
      const result = await messagingService.unmuteConversation('conv-1');
      expect(result).toBe(true);
    });

    it('should get mute status', async () => {
      mockApiGet({ isMuted: true, mutedUntil: '2025-12-31T00:00:00Z' });
      const result = await messagingService.getMuteStatus('conv-1');
      expect(result.isMuted).toBe(true);
      expect(result.mutedUntil).toBeInstanceOf(Date);
    });
  });

  describe('toggleReaction', () => {
    it('should toggle and return result', async () => {
      mockApiPost({ action: 'added', reactionCounts: [{ emoji: '\u{1F44D}', count: 1 }] });
      const result = await messagingService.toggleReaction('msg-1', 'conv-1', '\u{1F44D}');
      expect(result?.action).toBe('added');
    });

    it('should return null on failure', async () => {
      mockApiPostError('Server Error');
      const result = await messagingService.toggleReaction('msg-1', 'conv-1', '\u{1F44D}');
      expect(result).toBeNull();
    });
  });

  describe('replyToMessage / forwardMessage', () => {
    it('should reply to message', async () => {
      mockApiPost({ message: { id: 'reply-1' } });
      const result = await messagingService.replyToMessage('msg-1', 'conv-1', 'reply text');
      expect(result?.id).toBe('reply-1');
    });

    it('should return null on reply failure', async () => {
      mockApiPostError('Server Error');
      const result = await messagingService.replyToMessage('msg-1', 'conv-1', 'reply');
      expect(result).toBeNull();
    });

    it('should forward message', async () => {
      mockApiPost({ message: { id: 'fwd-1' } });
      const result = await messagingService.forwardMessage('msg-1', 'conv-2');
      expect(result?.id).toBe('fwd-1');
    });
  });

  describe('getMessageThread', () => {
    it('should return thread with message and replies', async () => {
      mockApiGet({ message: { id: 'msg-1' }, replies: [{ id: 'r1' }] });
      const result = await messagingService.getMessageThread('msg-1');
      expect(result.message?.id).toBe('msg-1');
      expect(result.replies).toHaveLength(1);
    });

    it('should return defaults on failure', async () => {
      mockApiGetError('Server Error');
      const result = await messagingService.getMessageThread('msg-1');
      expect(result.message).toBeNull();
      expect(result.replies).toEqual([]);
    });
  });

  describe('getUsers', () => {
    it('should fetch and transform users', async () => {
      mockApiGet({ users: [{ id: 'u1', name: 'User 1', email: 'u@e.com' }] });
      const result = await messagingService.getUsers('User');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('User 1');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      mockApiGet({ user: { id: 'u1', name: 'User' } });
      const result = await messagingService.getUserById('u1');
      expect(result?.id).toBe('u1');
    });

    it('should return null when user not found', async () => {
      mockApiGet({ user: null });
      const result = await messagingService.getUserById('u999');
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockApiGetError('Not found');
      const result = await messagingService.getUserById('u999');
      expect(result).toBeNull();
    });
  });

  describe('API uses apiService', () => {
    it('should use apiService.get for fetching conversations', async () => {
      mockApiGet({ conversations: [] });
      await messagingService.getConversations();
      expect(apiService.get).toHaveBeenCalledWith(
        expect.stringContaining('/conversations')
      );
    });
  });
});
