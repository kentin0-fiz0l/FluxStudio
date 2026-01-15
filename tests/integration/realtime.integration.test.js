/**
 * Real-time Integration Tests
 * Tests WebSocket connections and real-time messaging features
 */

const { io: SocketIOClient } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Test configuration
// Updated to use unified backend with /messaging namespace
const MESSAGING_WS_URL = process.env.MESSAGING_WS_URL || 'http://localhost:3001/messaging';
const JWT_SECRET = process.env.JWT_SECRET || 'flux-studio-secret-key-2025';

// Helper function to create authenticated socket connection
function createAuthenticatedSocket(userId = 'test-user', email = 'test@example.com') {
  const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '1h' });

  return SocketIOClient(MESSAGING_WS_URL, {
    auth: { token },
    autoConnect: false
  });
}

// Helper function to wait for event with timeout
function waitForEvent(socket, eventName, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

describe('Real-time Integration Tests', () => {
  let socket1, socket2;
  let testChannelId = 'test-channel-123';

  beforeAll(async () => {
    // Wait for messaging service to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  beforeEach(() => {
    // Create fresh socket connections for each test
    socket1 = createAuthenticatedSocket('user1', 'user1@test.com');
    socket2 = createAuthenticatedSocket('user2', 'user2@test.com');
  });

  afterEach(() => {
    // Clean up socket connections
    if (socket1?.connected) socket1.disconnect();
    if (socket2?.connected) socket2.disconnect();
  });

  describe('Socket Connection', () => {
    test('should establish authenticated connection', (done) => {
      socket1.on('connect', () => {
        expect(socket1.connected).toBe(true);
        done();
      });

      socket1.on('connect_error', (error) => {
        done(error);
      });

      socket1.connect();
    });

    test('should reject connection without valid token', (done) => {
      const invalidSocket = SocketIOClient(MESSAGING_WS_URL, {
        auth: { token: 'invalid-token' },
        autoConnect: false
      });

      invalidSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Invalid token');
        invalidSocket.disconnect();
        done();
      });

      invalidSocket.on('connect', () => {
        invalidSocket.disconnect();
        done(new Error('Should not connect with invalid token'));
      });

      invalidSocket.connect();
    });

    test('should handle user status broadcasting', async () => {
      const statusPromise = waitForEvent(socket2, 'user:status');

      socket1.connect();
      socket2.connect();

      await Promise.all([
        waitForEvent(socket1, 'connect'),
        waitForEvent(socket2, 'connect')
      ]);

      // socket1 connecting should broadcast status to socket2
      const statusEvent = await statusPromise;
      expect(statusEvent.userId).toBe('user1');
      expect(statusEvent.status).toBe('online');
    });
  });

  describe('Channel Management', () => {
    beforeEach(async () => {
      socket1.connect();
      socket2.connect();

      await Promise.all([
        waitForEvent(socket1, 'connect'),
        waitForEvent(socket2, 'connect')
      ]);
    });

    test('should allow users to join channels', async () => {
      const messagesPromise = waitForEvent(socket1, 'channel:messages');

      socket1.emit('channel:join', testChannelId);

      const messages = await messagesPromise;
      expect(Array.isArray(messages)).toBe(true);
    });

    test('should allow users to leave channels', () => {
      return new Promise((resolve) => {
        socket1.emit('channel:join', testChannelId);

        setTimeout(() => {
          socket1.emit('channel:leave', testChannelId);
          // No specific event expected, just verify no error
          resolve();
        }, 100);
      });
    });
  });

  describe('Real-time Messaging', () => {
    beforeEach(async () => {
      socket1.connect();
      socket2.connect();

      await Promise.all([
        waitForEvent(socket1, 'connect'),
        waitForEvent(socket2, 'connect')
      ]);

      // Both users join the same channel
      socket1.emit('channel:join', testChannelId);
      socket2.emit('channel:join', testChannelId);

      // Wait for join operations to complete
      await Promise.all([
        waitForEvent(socket1, 'channel:messages'),
        waitForEvent(socket2, 'channel:messages')
      ]);
    });

    test('should broadcast messages to all channel participants', async () => {
      const messagePromise = waitForEvent(socket2, 'message:new');

      const messageData = {
        channelId: testChannelId,
        text: 'Hello from socket1!',
        replyTo: null,
        file: null
      };

      socket1.emit('message:send', messageData);

      const receivedMessage = await messagePromise;
      expect(receivedMessage.text).toBe(messageData.text);
      expect(receivedMessage.channelId).toBe(testChannelId);
      expect(receivedMessage.userId).toBe('user1');
    });

    test('should handle message editing', async () => {
      // First, send a message
      const messagePromise = waitForEvent(socket2, 'message:new');

      socket1.emit('message:send', {
        channelId: testChannelId,
        text: 'Original message'
      });

      const originalMessage = await messagePromise;

      // Then edit it
      const editPromise = waitForEvent(socket2, 'message:updated');

      socket1.emit('message:edit', {
        messageId: originalMessage.id,
        text: 'Edited message'
      });

      const editedMessage = await editPromise;
      expect(editedMessage.text).toBe('Edited message');
      expect(editedMessage.edited).toBe(true);
    });

    test('should handle message deletion', async () => {
      // Send a message first
      const messagePromise = waitForEvent(socket2, 'message:new');

      socket1.emit('message:send', {
        channelId: testChannelId,
        text: 'Message to delete'
      });

      const message = await messagePromise;

      // Delete the message
      const deletePromise = waitForEvent(socket2, 'message:deleted');

      socket1.emit('message:delete', message.id);

      const deletedMessageId = await deletePromise;
      expect(deletedMessageId).toBe(message.id);
    });

    test('should handle message reactions', async () => {
      // Send a message first
      const messagePromise = waitForEvent(socket2, 'message:new');

      socket1.emit('message:send', {
        channelId: testChannelId,
        text: 'Message to react to'
      });

      const message = await messagePromise;

      // Add reaction
      const reactionPromise = waitForEvent(socket2, 'message:reactions-updated');

      socket1.emit('message:react', {
        messageId: message.id,
        emoji: '👍'
      });

      const reactionUpdate = await reactionPromise;
      expect(reactionUpdate.messageId).toBe(message.id);
      expect(Array.isArray(reactionUpdate.reactions)).toBe(true);
    });
  });

  describe('Direct Messaging', () => {
    beforeEach(async () => {
      socket1.connect();
      socket2.connect();

      await Promise.all([
        waitForEvent(socket1, 'connect'),
        waitForEvent(socket2, 'connect')
      ]);
    });

    test('should send direct messages between users', async () => {
      const dmPromise = waitForEvent(socket2, 'dm:new');

      socket1.emit('dm:send', {
        recipientId: 'user2',
        text: 'Hello user2, this is a direct message!'
      });

      const receivedDM = await dmPromise;
      expect(receivedDM.text).toBe('Hello user2, this is a direct message!');
      expect(receivedDM.senderId).toBe('user1');
      expect(receivedDM.recipientId).toBe('user2');
    });

    test('should handle read receipts for direct messages', async () => {
      // Send DM
      const dmPromise = waitForEvent(socket2, 'dm:new');

      socket1.emit('dm:send', {
        recipientId: 'user2',
        text: 'Read receipt test'
      });

      const dm = await dmPromise;

      // Mark as read
      const readPromise = waitForEvent(socket1, 'dm:read');

      socket2.emit('message:read', dm.id);

      const readReceipt = await readPromise;
      expect(readReceipt.messageId).toBe(dm.id);
      expect(readReceipt.readAt).toBeDefined();
    });
  });

  describe('Typing Indicators', () => {
    beforeEach(async () => {
      socket1.connect();
      socket2.connect();

      await Promise.all([
        waitForEvent(socket1, 'connect'),
        waitForEvent(socket2, 'connect')
      ]);

      socket1.emit('channel:join', testChannelId);
      socket2.emit('channel:join', testChannelId);

      await Promise.all([
        waitForEvent(socket1, 'channel:messages'),
        waitForEvent(socket2, 'channel:messages')
      ]);
    });

    test('should broadcast typing indicators', async () => {
      const typingPromise = waitForEvent(socket2, 'user:typing');

      socket1.emit('typing:start', testChannelId);

      const typingEvent = await typingPromise;
      expect(typingEvent.userId).toBe('user1');
      expect(typingEvent.channelId).toBe(testChannelId);
    });

    test('should broadcast stopped typing indicators', async () => {
      const stoppedTypingPromise = waitForEvent(socket2, 'user:stopped-typing');

      socket1.emit('typing:stop', testChannelId);

      const stoppedEvent = await stoppedTypingPromise;
      expect(stoppedEvent.userId).toBe('user1');
      expect(stoppedEvent.channelId).toBe(testChannelId);
    });
  });

  describe('User Presence', () => {
    beforeEach(async () => {
      socket1.connect();
      socket2.connect();

      await Promise.all([
        waitForEvent(socket1, 'connect'),
        waitForEvent(socket2, 'connect')
      ]);
    });

    test('should track online users', async () => {
      const onlineUsersPromise = waitForEvent(socket1, 'users:online');

      socket1.emit('users:get-online');

      const onlineUsers = await onlineUsersPromise;
      expect(Array.isArray(onlineUsers)).toBe(true);
      expect(onlineUsers.length).toBeGreaterThan(0);

      const user1Online = onlineUsers.find(u => u.userId === 'user1');
      expect(user1Online).toBeTruthy();
      expect(user1Online.status).toBe('online');
    });

    test('should broadcast user disconnect status', async () => {
      const statusPromise = waitForEvent(socket2, 'user:status');

      socket1.disconnect();

      const statusEvent = await statusPromise;
      expect(statusEvent.userId).toBe('user1');
      expect(statusEvent.status).toBe('offline');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      socket1.connect();
      await waitForEvent(socket1, 'connect');
    });

    test('should handle invalid message data', async () => {
      const errorPromise = waitForEvent(socket1, 'error');

      // Send message without required fields
      socket1.emit('message:send', {
        channelId: '', // Invalid empty channel ID
        text: ''       // Invalid empty text
      });

      const error = await errorPromise;
      expect(error.message).toContain('Channel ID');
    });

    test('should handle unauthorized message operations', async () => {
      const errorPromise = waitForEvent(socket1, 'error');

      // Try to edit a non-existent message
      socket1.emit('message:edit', {
        messageId: 'non-existent-message',
        text: 'Should fail'
      });

      const error = await errorPromise;
      expect(error.message).toContain('not found');
    });
  });

  describe('Performance Tests', () => {
    test('should handle multiple concurrent connections', async () => {
      const socketCount = 5;
      const sockets = [];

      // Create multiple socket connections
      for (let i = 0; i < socketCount; i++) {
        const socket = createAuthenticatedSocket(`perf-user-${i}`, `perf${i}@test.com`);
        sockets.push(socket);
        socket.connect();
      }

      // Wait for all connections
      await Promise.all(sockets.map(socket => waitForEvent(socket, 'connect')));

      // All sockets join the same channel
      const channelId = 'performance-test-channel';
      sockets.forEach(socket => socket.emit('channel:join', channelId));

      // Wait for all to receive channel messages
      await Promise.all(sockets.map(socket => waitForEvent(socket, 'channel:messages')));

      // Send a message from first socket
      const messagePromises = sockets.slice(1).map(socket =>
        waitForEvent(socket, 'message:new')
      );

      sockets[0].emit('message:send', {
        channelId,
        text: 'Performance test message'
      });

      // All other sockets should receive the message
      const receivedMessages = await Promise.all(messagePromises);
      receivedMessages.forEach(message => {
        expect(message.text).toBe('Performance test message');
      });

      // Clean up
      sockets.forEach(socket => socket.disconnect());
    });

    test('should handle rapid message sending', async () => {
      socket2.connect();

      await Promise.all([
        waitForEvent(socket1, 'connect'),
        waitForEvent(socket2, 'connect')
      ]);

      const channelId = 'rapid-messages-test';
      socket1.emit('channel:join', channelId);
      socket2.emit('channel:join', channelId);

      await Promise.all([
        waitForEvent(socket1, 'channel:messages'),
        waitForEvent(socket2, 'channel:messages')
      ]);

      const messageCount = 10;
      const receivedMessages = [];

      // Set up listener for incoming messages
      socket2.on('message:new', (message) => {
        receivedMessages.push(message);
      });

      const startTime = Date.now();

      // Send messages rapidly
      for (let i = 0; i < messageCount; i++) {
        socket1.emit('message:send', {
          channelId,
          text: `Rapid message ${i}`
        });
      }

      // Wait for all messages to be received
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (receivedMessages.length >= messageCount) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 10000);
      });

      const duration = Date.now() - startTime;

      expect(receivedMessages.length).toBe(messageCount);
      console.log(`Sent and received ${messageCount} messages in ${duration}ms`);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});