/**
 * Messaging Socket.IO Namespace Handler
 * Extracted from server-messaging.js for unified backend consolidation
 *
 * Namespace: /messaging
 * Purpose: Real-time messaging, typing indicators, user presence, conversations
 */

const jwt = require('jsonwebtoken');
const messagingConversationsAdapter = require('../database/messaging-conversations-adapter');

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

    // ========================================
    // CONVERSATION-BASED EVENTS (NEW)
    // ========================================

    // Join a conversation room
    socket.on('conversation:join', async (conversationId) => {
      try {
        // Verify user is a member of the conversation
        const conversation = await messagingConversationsAdapter.getConversationById(conversationId, socket.userId);
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found or access denied' });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        console.log(`User ${socket.userId} joined conversation ${conversationId}`);

        // Send recent messages for the conversation
        const messagesResult = await messagingConversationsAdapter.listMessages(conversationId, { limit: 50 });
        socket.emit('conversation:messages', {
          conversationId,
          messages: messagesResult.messages,
          hasMore: messagesResult.hasMore
        });

        // Notify other members that user joined
        socket.to(`conversation:${conversationId}`).emit('conversation:user-joined', {
          conversationId,
          userId: socket.userId,
          userEmail: socket.userEmail
        });
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Leave a conversation room
    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);

      // Notify other members that user left
      socket.to(`conversation:${conversationId}`).emit('conversation:user-left', {
        conversationId,
        userId: socket.userId
      });
    });

    // Send message to a conversation
    socket.on('conversation:message:send', async (data) => {
      const { conversationId, text, replyToMessageId, assetId, projectId } = data;

      if (!conversationId || !text) {
        socket.emit('error', { message: 'Conversation ID and text are required' });
        return;
      }

      try {
        // Verify user is a member of the conversation
        const conversation = await messagingConversationsAdapter.getConversationById(conversationId, socket.userId);
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found or access denied' });
          return;
        }

        // Create the message using the new adapter
        const newMessage = await messagingConversationsAdapter.createMessage({
          conversationId,
          authorId: socket.userId,
          content: text,
          replyToMessageId: replyToMessageId || null,
          assetId: assetId || null,
          projectId: projectId || null,
          isSystemMessage: false
        });

        // Emit to all users in the conversation
        namespace.to(`conversation:${conversationId}`).emit('conversation:message:new', {
          conversationId,
          message: newMessage
        });

        // Also notify members via their user rooms (for unread badge updates)
        const members = conversation.members || [];
        members.forEach(member => {
          if (member.userId !== socket.userId) {
            namespace.to(`user:${member.userId}`).emit('conversation:message:notify', {
              conversationId,
              message: newMessage,
              senderEmail: socket.userEmail
            });
          }
        });
      } catch (error) {
        console.error('Error sending conversation message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator for conversations
    socket.on('conversation:typing:start', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('conversation:user-typing', {
        conversationId,
        userId: socket.userId,
        userEmail: socket.userEmail
      });
    });

    socket.on('conversation:typing:stop', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('conversation:user-stopped-typing', {
        conversationId,
        userId: socket.userId
      });
    });

    // Mark conversation as read up to a specific message
    socket.on('conversation:read', async (data) => {
      const { conversationId, messageId } = data;

      if (!conversationId || !messageId) {
        socket.emit('error', { message: 'Conversation ID and message ID are required' });
        return;
      }

      try {
        await messagingConversationsAdapter.setLastRead(conversationId, socket.userId, messageId);

        // Notify other members about the read receipt
        socket.to(`conversation:${conversationId}`).emit('conversation:read-receipt', {
          conversationId,
          userId: socket.userId,
          messageId
        });

        // Confirm to the user
        socket.emit('conversation:read:confirmed', { conversationId, messageId });
      } catch (error) {
        console.error('Error marking conversation as read:', error);
        socket.emit('error', { message: 'Failed to mark as read' });
      }
    });

    // Delete message from conversation
    socket.on('conversation:message:delete', async (data) => {
      const { conversationId, messageId } = data;

      if (!conversationId || !messageId) {
        socket.emit('error', { message: 'Conversation ID and message ID are required' });
        return;
      }

      try {
        const deleted = await messagingConversationsAdapter.deleteMessage(messageId, socket.userId);
        if (deleted) {
          namespace.to(`conversation:${conversationId}`).emit('conversation:message:deleted', {
            conversationId,
            messageId,
            deletedBy: socket.userId
          });
        } else {
          socket.emit('error', { message: 'Message not found or unauthorized' });
        }
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Add reaction to a message
    socket.on('conversation:reaction:add', async (data, ack) => {
      const { messageId, emoji } = data;

      if (!messageId || !emoji) {
        if (ack) ack({ ok: false, error: 'Message ID and emoji are required' });
        return;
      }

      try {
        // Get the message to verify conversation membership
        const message = await messagingConversationsAdapter.getMessageById({ messageId });
        if (!message) {
          if (ack) ack({ ok: false, error: 'Message not found' });
          return;
        }

        // Verify user is a member of the conversation
        const conversation = await messagingConversationsAdapter.getConversationById({
          conversationId: message.conversationId,
          userId: socket.userId
        });
        if (!conversation) {
          if (ack) ack({ ok: false, error: 'Not authorized to react to this message' });
          return;
        }

        // Add the reaction
        const result = await messagingConversationsAdapter.addReaction({
          messageId,
          userId: socket.userId,
          emoji
        });

        // Broadcast to all users in the conversation
        namespace.to(`conversation:${message.conversationId}`).emit('conversation:reaction:updated', {
          messageId,
          reactions: result.reactions,
          updatedBy: socket.userId
        });

        // Acknowledge success
        if (ack) ack({ ok: true, reactions: result.reactions });
      } catch (error) {
        console.error('Error adding reaction:', error);
        if (ack) ack({ ok: false, error: 'Failed to add reaction' });
      }
    });

    // Remove reaction from a message
    socket.on('conversation:reaction:remove', async (data, ack) => {
      const { messageId, emoji } = data;

      if (!messageId || !emoji) {
        if (ack) ack({ ok: false, error: 'Message ID and emoji are required' });
        return;
      }

      try {
        // Get the message to verify conversation membership
        const message = await messagingConversationsAdapter.getMessageById({ messageId });
        if (!message) {
          if (ack) ack({ ok: false, error: 'Message not found' });
          return;
        }

        // Verify user is a member of the conversation
        const conversation = await messagingConversationsAdapter.getConversationById({
          conversationId: message.conversationId,
          userId: socket.userId
        });
        if (!conversation) {
          if (ack) ack({ ok: false, error: 'Not authorized to remove reaction from this message' });
          return;
        }

        // Remove the reaction (users can only remove their own reactions)
        const result = await messagingConversationsAdapter.removeReaction({
          messageId,
          userId: socket.userId,
          emoji
        });

        // Broadcast to all users in the conversation
        namespace.to(`conversation:${message.conversationId}`).emit('conversation:reaction:updated', {
          messageId,
          reactions: result.reactions,
          updatedBy: socket.userId
        });

        // Acknowledge success
        if (ack) ack({ ok: true, reactions: result.reactions });
      } catch (error) {
        console.error('Error removing reaction:', error);
        if (ack) ack({ ok: false, error: 'Failed to remove reaction' });
      }
    });

    // Pin a message
    socket.on('conversation:pin', async (data, ack) => {
      const { messageId } = data || {};

      if (!messageId) {
        if (ack) ack({ ok: false, error: 'Message ID is required' });
        return;
      }

      try {
        // Get the message to verify conversation membership
        const message = await messagingConversationsAdapter.getMessageById({ messageId });
        if (!message) {
          if (ack) ack({ ok: false, error: 'Message not found' });
          return;
        }

        // Verify user is a member of the conversation
        const conversation = await messagingConversationsAdapter.getConversationById({
          conversationId: message.conversationId,
          userId: socket.userId
        });
        if (!conversation) {
          if (ack) ack({ ok: false, error: 'Not authorized to pin messages in this conversation' });
          return;
        }

        // Pin the message
        const pins = await messagingConversationsAdapter.pinMessage({
          messageId,
          userId: socket.userId
        });

        // Broadcast to all users in the conversation
        const payload = {
          conversationId: message.conversationId,
          pins,
          updatedBy: socket.userId
        };
        namespace.to(`conversation:${message.conversationId}`).emit('conversation:pins:updated', payload);

        // Acknowledge success
        if (ack) ack({ ok: true, pins });
      } catch (error) {
        console.error('Error pinning message:', error);
        if (ack) ack({ ok: false, error: 'Failed to pin message' });
      }
    });

    // Unpin a message
    socket.on('conversation:unpin', async (data, ack) => {
      const { messageId } = data || {};

      if (!messageId) {
        if (ack) ack({ ok: false, error: 'Message ID is required' });
        return;
      }

      try {
        // Get the message to verify conversation membership
        const message = await messagingConversationsAdapter.getMessageById({ messageId });
        if (!message) {
          if (ack) ack({ ok: false, error: 'Message not found' });
          return;
        }

        // Verify user is a member of the conversation
        const conversation = await messagingConversationsAdapter.getConversationById({
          conversationId: message.conversationId,
          userId: socket.userId
        });
        if (!conversation) {
          if (ack) ack({ ok: false, error: 'Not authorized to unpin messages in this conversation' });
          return;
        }

        // Unpin the message
        const pins = await messagingConversationsAdapter.unpinMessage({ messageId });

        // Broadcast to all users in the conversation
        const payload = {
          conversationId: message.conversationId,
          pins,
          updatedBy: socket.userId
        };
        namespace.to(`conversation:${message.conversationId}`).emit('conversation:pins:updated', payload);

        // Acknowledge success
        if (ack) ack({ ok: true, pins });
      } catch (error) {
        console.error('Error unpinning message:', error);
        if (ack) ack({ ok: false, error: 'Failed to unpin message' });
      }
    });

    // ========================================
    // MESSAGE EDITING
    // ========================================

    // Edit a message
    socket.on('conversation:message:edit', async (data, ack) => {
      const { conversationId, messageId, content } = data || {};

      if (!conversationId || !messageId || !content) {
        if (ack) ack({ ok: false, error: 'Conversation ID, message ID, and content are required' });
        return;
      }

      try {
        // Verify user is a member of the conversation
        const conversation = await messagingConversationsAdapter.getConversationById({
          conversationId,
          userId: socket.userId
        });
        if (!conversation) {
          if (ack) ack({ ok: false, error: 'Not authorized to edit messages in this conversation' });
          return;
        }

        // Edit the message (adapter verifies ownership)
        const updatedMessage = await messagingConversationsAdapter.editMessage({
          messageId,
          userId: socket.userId,
          content: content.trim()
        });

        if (!updatedMessage) {
          if (ack) ack({ ok: false, error: 'Could not edit message - you may not be the author' });
          return;
        }

        // Transform message for broadcast
        const messagePayload = {
          id: updatedMessage.id,
          conversationId: updatedMessage.conversationId,
          authorId: updatedMessage.userId,
          content: updatedMessage.text,
          replyToMessageId: updatedMessage.replyToMessageId || null,
          assetId: updatedMessage.assetId || null,
          projectId: updatedMessage.projectId || null,
          isSystemMessage: updatedMessage.isSystemMessage || false,
          createdAt: updatedMessage.createdAt,
          updatedAt: new Date().toISOString(),
          editedAt: updatedMessage.editedAt,
          author: {
            id: updatedMessage.userId,
            email: null,
            displayName: updatedMessage.userName || null
          }
        };

        // Broadcast to all users in the conversation
        namespace.to(`conversation:${conversationId}`).emit('conversation:message:edited', {
          message: messagePayload
        });

        // Acknowledge success
        if (ack) ack({ ok: true, message: messagePayload });
      } catch (error) {
        console.error('Error editing message:', error);
        if (ack) ack({ ok: false, error: error.message || 'Failed to edit message' });
      }
    });

    // ========================================
    // MESSAGE FORWARDING
    // ========================================

    // Forward a message to another conversation
    socket.on('conversation:message:forward', async (data, ack) => {
      const { sourceConversationId, targetConversationId, messageId } = data || {};

      if (!sourceConversationId || !targetConversationId || !messageId) {
        if (ack) ack({ ok: false, error: 'Source conversation ID, target conversation ID, and message ID are required' });
        return;
      }

      // Prevent forwarding to the same conversation
      if (sourceConversationId === targetConversationId) {
        if (ack) ack({ ok: false, error: 'Cannot forward a message to the same conversation' });
        return;
      }

      try {
        // Forward the message using the adapter (which verifies membership in both conversations)
        const forwardedMessage = await messagingConversationsAdapter.forwardMessage({
          messageId,
          sourceConversationId,
          targetConversationId,
          userId: socket.userId
        });

        if (!forwardedMessage) {
          if (ack) ack({ ok: false, error: 'Message not found or not authorized to forward' });
          return;
        }

        // Transform message for broadcast
        const messagePayload = {
          id: forwardedMessage.id,
          conversationId: forwardedMessage.conversationId,
          authorId: forwardedMessage.userId,
          content: forwardedMessage.text,
          replyToMessageId: forwardedMessage.replyToMessageId || null,
          assetId: forwardedMessage.assetId || null,
          projectId: forwardedMessage.projectId || null,
          isSystemMessage: forwardedMessage.isSystemMessage || false,
          originalMessageId: forwardedMessage.originalMessageId || null,
          createdAt: forwardedMessage.createdAt,
          author: {
            id: forwardedMessage.userId,
            email: socket.userEmail,
            displayName: forwardedMessage.userName || null
          }
        };

        // Broadcast to all users in the target conversation (reuse message:new event)
        namespace.to(`conversation:${targetConversationId}`).emit('conversation:message:new', {
          conversationId: targetConversationId,
          message: messagePayload
        });

        // Also notify members in target conversation via their user rooms
        const targetConversation = await messagingConversationsAdapter.getConversationById({
          conversationId: targetConversationId,
          userId: socket.userId
        });
        const members = targetConversation?.members || [];
        members.forEach(member => {
          if (member.userId !== socket.userId) {
            namespace.to(`user:${member.userId}`).emit('conversation:message:notify', {
              conversationId: targetConversationId,
              message: messagePayload,
              senderEmail: socket.userEmail
            });
          }
        });

        // Acknowledge success
        if (ack) ack({ ok: true, message: messagePayload });
      } catch (error) {
        console.error('Error forwarding message:', error);
        if (ack) ack({ ok: false, error: error.message || 'Failed to forward message' });
      }
    });

    // ========================================
    // LEGACY CHANNEL-BASED EVENTS (BACKWARD COMPATIBILITY)
    // ========================================

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

    // Typing indicators (legacy channel-based)
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

    // ========================================
    // NOTIFICATION EVENTS (ENHANCED)
    // ========================================

    // Subscribe to notifications (auto-joined to user room on connection)
    socket.on('notifications:subscribe', async () => {
      try {
        // Try the new adapter first, fall back to old adapter
        let count = 0;
        try {
          count = await messagingConversationsAdapter.getUnreadNotificationCount(socket.userId);
        } catch {
          if (messagingAdapter && messagingAdapter.getUnreadNotificationCount) {
            count = await messagingAdapter.getUnreadNotificationCount(socket.userId);
          }
        }
        socket.emit('notifications:unread-count', { count });
      } catch (error) {
        console.error('Error getting unread notification count:', error);
      }
    });

    // Mark notification as read
    socket.on('notification:mark-read', async (notificationId) => {
      try {
        // Try the new adapter first
        let notification = null;
        let count = 0;

        try {
          notification = await messagingConversationsAdapter.markNotificationRead(notificationId, socket.userId);
          count = await messagingConversationsAdapter.getUnreadNotificationCount(socket.userId);
        } catch {
          if (messagingAdapter && messagingAdapter.markNotificationAsRead) {
            notification = await messagingAdapter.markNotificationAsRead(notificationId, socket.userId);
            count = await messagingAdapter.getUnreadNotificationCount(socket.userId);
          }
        }

        if (notification) {
          socket.emit('notification:updated', notification);
          socket.emit('notifications:unread-count', { count });
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });

    // Mark all notifications as read
    socket.on('notifications:mark-all-read', async () => {
      try {
        // Try the new adapter first
        try {
          await messagingConversationsAdapter.markAllNotificationsRead(socket.userId);
        } catch {
          if (messagingAdapter && messagingAdapter.markAllNotificationsAsRead) {
            await messagingAdapter.markAllNotificationsAsRead(socket.userId);
          }
        }

        socket.emit('notifications:unread-count', { count: 0 });
        socket.emit('notifications:all-marked-read');
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        socket.emit('error', { message: 'Failed to mark all notifications as read' });
      }
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

  // ========================================
  // HELPER: Send notification to user
  // ========================================
  namespace.sendNotificationToUser = async (userId, notification) => {
    try {
      const created = await messagingConversationsAdapter.createNotification({
        userId,
        type: notification.type,
        entityId: notification.entityId || null,
        title: notification.title,
        body: notification.body || null
      });

      // Emit to user's room
      namespace.to(`user:${userId}`).emit('notification:new', created);

      // Update unread count
      const count = await messagingConversationsAdapter.getUnreadNotificationCount(userId);
      namespace.to(`user:${userId}`).emit('notifications:unread-count', { count });

      return created;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return null;
    }
  };

  // ========================================
  // HELPER: Broadcast message to conversation members
  // ========================================
  namespace.broadcastToConversation = (conversationId, event, data) => {
    namespace.to(`conversation:${conversationId}`).emit(event, data);
  };
};
