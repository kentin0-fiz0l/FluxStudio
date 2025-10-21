/**
 * Messaging Socket.IO Namespace Handler
 * Extracted from server-messaging.js for unified backend consolidation
 *
 * Namespace: /messaging
 * Purpose: Real-time messaging, typing indicators, user presence
 */

const jwt = require('jsonwebtoken');

module.exports = (namespace, createMessage, getMessages, getChannels, messagingAdapter, JWT_SECRET) => {
  // Store active connections
  const activeUsers = new Map();

  // Authentication middleware for Socket.IO namespace
  namespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // Socket.IO connection handling
  namespace.on('connection', async (socket) => {
    console.log(`💬 User connected to messaging: ${socket.userId}`);

    // Store user connection in memory
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      email: socket.userEmail,
      status: 'online',
      lastSeen: new Date().toISOString()
    });

    try {
      // Update user presence in database if available
      if (messagingAdapter && messagingAdapter.updateUserPresence) {
        await messagingAdapter.updateUserPresence(socket.userId, 'online');
      }
    } catch (error) {
      console.error('Error updating user presence:', error);
    }

    // Broadcast user status
    namespace.emit('user:status', {
      userId: socket.userId,
      status: 'online'
    });

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Join team channels
    socket.on('channel:join', async (channelId) => {
      socket.join(`channel:${channelId}`);
      console.log(`User ${socket.userId} joined channel ${channelId}`);

      try {
        // Send recent messages for the channel
        const messages = await getMessages(channelId, 50);
        socket.emit('channel:messages', messages);
      } catch (error) {
        console.error('Error loading channel messages:', error);
        socket.emit('error', { message: 'Failed to load channel messages' });
      }
    });

    // Leave channel
    socket.on('channel:leave', (channelId) => {
      socket.leave(`channel:${channelId}`);
      console.log(`User ${socket.userId} left channel ${channelId}`);
    });

    // Send message
    socket.on('message:send', async (data) => {
      const { channelId, text, replyTo, file } = data;

      if (!channelId || (!text && !file)) {
        socket.emit('error', { message: 'Channel ID and either text or file are required' });
        return;
      }

      try {
        const messageData = {
          conversationId: channelId,
          authorId: socket.userId,
          content: text || '',
          messageType: file ? 'file' : 'text',
          replyToId: replyTo || null,
          attachments: file ? [file] : [],
          metadata: {
            userEmail: socket.userEmail
          }
        };

        const newMessage = await createMessage(messageData);

        // Emit to all users in the channel
        namespace.to(`channel:${channelId}`).emit('message:new', newMessage);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Edit message
    socket.on('message:edit', async (data) => {
      const { messageId, text } = data;

      try {
        // Update message in database (includes authorization check)
        if (messagingAdapter && messagingAdapter.updateMessage) {
          const updatedMessage = await messagingAdapter.updateMessage(messageId, {
            content: text,
            edited: true,
            authorId: socket.userId // For authorization
          });

          if (!updatedMessage) {
            socket.emit('error', { message: 'Message not found or unauthorized' });
            return;
          }

          // Emit to all users in the channel
          namespace.to(`channel:${updatedMessage.conversationId}`).emit('message:updated', updatedMessage);
        } else {
          socket.emit('error', { message: 'Message editing not available in file mode' });
        }
      } catch (error) {
        console.error('Error editing message:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Delete message
    socket.on('message:delete', async (messageId) => {
      try {
        // Get message first to check authorization and get channel
        const messages = await getMessages();
        const message = messages.find(m => m.id === messageId && m.authorId === socket.userId);

        if (!message) {
          socket.emit('error', { message: 'Message not found or unauthorized' });
          return;
        }

        const channelId = message.conversationId;

        if (messagingAdapter && messagingAdapter.deleteMessage) {
          const deleted = await messagingAdapter.deleteMessage(messageId);

          if (deleted) {
            // Emit to all users in the channel
            namespace.to(`channel:${channelId}`).emit('message:deleted', messageId);
          } else {
            socket.emit('error', { message: 'Failed to delete message' });
          }
        } else {
          socket.emit('error', { message: 'Message deletion not available in file mode' });
        }
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Add reaction
    socket.on('message:react', async (data) => {
      const { messageId, emoji } = data;

      try {
        // Check if message exists first
        const messages = await getMessages();
        const message = messages.find(m => m.id === messageId);

        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        if (messagingAdapter && messagingAdapter.addReaction && messagingAdapter.getReactions) {
          // Check if user already has this reaction
          const existingReactions = await messagingAdapter.getReactions(messageId);
          const userReaction = existingReactions.find(r => r.reaction === emoji && r.user_id === socket.userId);

          if (userReaction) {
            // Remove reaction
            await messagingAdapter.removeReaction(messageId, socket.userId, emoji);
          } else {
            // Add reaction
            await messagingAdapter.addReaction(messageId, socket.userId, emoji);
          }

          // Get updated reactions and emit
          const updatedReactions = await messagingAdapter.getReactions(messageId);
          namespace.to(`channel:${message.conversationId}`).emit('message:reactions-updated', {
            messageId,
            reactions: updatedReactions
          });
        } else {
          socket.emit('error', { message: 'Reactions not available in file mode' });
        }
      } catch (error) {
        console.error('Error handling reaction:', error);
        socket.emit('error', { message: 'Failed to update reaction' });
      }
    });

    // Typing indicators
    socket.on('typing:start', (channelId) => {
      socket.to(`channel:${channelId}`).emit('user:typing', {
        userId: socket.userId,
        userEmail: socket.userEmail,
        channelId
      });
    });

    socket.on('typing:stop', (channelId) => {
      socket.to(`channel:${channelId}`).emit('user:stopped-typing', {
        userId: socket.userId,
        channelId
      });
    });

    // Direct messages
    socket.on('dm:send', async (data) => {
      const { recipientId, text } = data;

      if (!recipientId || !text) {
        socket.emit('error', { message: 'Recipient and text are required' });
        return;
      }

      try {
        const messageData = {
          authorId: socket.userId,
          content: text,
          messageType: 'dm',
          metadata: {
            recipientId,
            senderEmail: socket.userEmail,
            read: false
          }
        };

        const newMessage = await createMessage(messageData);

        // Send to recipient if online
        namespace.to(`user:${recipientId}`).emit('dm:new', newMessage);

        // Send back to sender for confirmation
        socket.emit('dm:sent', newMessage);
      } catch (error) {
        console.error('Error sending DM:', error);
        socket.emit('error', { message: 'Failed to send direct message' });
      }
    });

    // Mark message as read
    socket.on('message:read', async (messageId) => {
      try {
        const messages = await getMessages();
        const message = messages.find(m => m.id === messageId);

        if (message && message.messageType === 'dm' && message.metadata?.recipientId === socket.userId) {
          if (messagingAdapter && messagingAdapter.updateMessage) {
            const updatedMessage = await messagingAdapter.updateMessage(messageId, {
              metadata: {
                ...message.metadata,
                read: true,
                readAt: new Date().toISOString()
              }
            });

            if (updatedMessage) {
              // Notify sender
              namespace.to(`user:${message.authorId}`).emit('dm:read', {
                messageId,
                readAt: updatedMessage.metadata.readAt
              });
            }
          }
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Get online users
    socket.on('users:get-online', () => {
      const onlineUsers = Array.from(activeUsers.entries()).map(([userId, data]) => ({
        userId,
        ...data
      }));
      socket.emit('users:online', onlineUsers);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`💬 User disconnected from messaging: ${socket.userId}`);

      // Update user status in memory
      const userData = activeUsers.get(socket.userId);
      if (userData) {
        userData.status = 'offline';
        userData.lastSeen = new Date().toISOString();
      }

      try {
        // Update user presence in database if available
        if (messagingAdapter && messagingAdapter.updateUserPresence) {
          await messagingAdapter.updateUserPresence(socket.userId, 'offline');
        }
      } catch (error) {
        console.error('Error updating user presence on disconnect:', error);
      }

      // Remove from active users after a delay (in case of reconnection)
      setTimeout(() => {
        if (activeUsers.get(socket.userId)?.status === 'offline') {
          activeUsers.delete(socket.userId);
        }
      }, 5000);

      // Broadcast user status
      namespace.emit('user:status', {
        userId: socket.userId,
        status: 'offline'
      });
    });
  });
};
