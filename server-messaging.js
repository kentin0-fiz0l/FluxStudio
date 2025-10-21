const { config } = require('./config/environment');
const { rateLimit, cors, helmet, validateInput, securityErrorHandler, auditLogger } = require('./middleware/security');

// Import performance monitoring
const { performanceMonitor } = require('./monitoring/performance');

// Database adapter (with fallback to file-based storage)
let messagingAdapter = null;
const USE_DATABASE = process.env.USE_DATABASE === 'true';

if (USE_DATABASE) {
  try {
    messagingAdapter = require('./database/messaging-adapter');
    console.log('✅ Database adapter loaded for messaging service');
  } catch (error) {
    console.warn('⚠️ Failed to load database adapter, falling back to file-based storage:', error.message);
  }
}
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const httpServer = createServer(app);
const PORT = config.MESSAGING_PORT;
const JWT_SECRET = config.JWT_SECRET;

// Storage files
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const CHANNELS_FILE = path.join(__dirname, 'channels.json');
const UPLOADS_DIR = path.join(__dirname, config.UPLOAD_DIR.replace('./', ''));

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize storage files
if (!fs.existsSync(MESSAGES_FILE)) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify({ messages: [] }));
}

if (!fs.existsSync(CHANNELS_FILE)) {
  fs.writeFileSync(CHANNELS_FILE, JSON.stringify({ channels: [] }));
}

// Helper functions with database/file hybrid support
async function getMessages(conversationId = null, limit = 100) {
  if (messagingAdapter) {
    return await performanceMonitor.monitorDatabaseQuery('getMessages', () => messagingAdapter.getMessages(conversationId, limit));
  }
  // Fallback to file-based storage
  const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
  let messages = JSON.parse(data).messages;

  if (conversationId) {
    messages = messages.filter(msg => msg.channelId === conversationId);
  }

  return messages.slice(0, limit);
}

async function createMessage(messageData) {
  if (messagingAdapter) {
    return await performanceMonitor.monitorDatabaseQuery('createMessage', () => messagingAdapter.createMessage(messageData));
  }
  // Fallback to file-based storage
  const messages = await getMessages();
  const newMessage = {
    id: generateMessageId(),
    ...messageData,
    timestamp: new Date().toISOString()
  };
  messages.push(newMessage);
  await saveMessages(messages);
  return newMessage;
}

async function saveMessages(messages) {
  if (messagingAdapter) {
    return await messagingAdapter.saveMessages(messages);
  }
  // Fallback to file-based storage
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify({ messages }, null, 2));
}

async function getChannels() {
  if (messagingAdapter) {
    return await performanceMonitor.monitorDatabaseQuery('getChannels', () => messagingAdapter.getConversations());
  }
  // Fallback to file-based storage
  const data = fs.readFileSync(CHANNELS_FILE, 'utf8');
  return JSON.parse(data).channels;
}

async function createChannel(channelData) {
  if (messagingAdapter) {
    return await performanceMonitor.monitorDatabaseQuery('createChannel', () => messagingAdapter.createConversation(channelData));
  }
  // Fallback to file-based storage
  const channels = await getChannels();
  const newChannel = {
    id: generateChannelId(),
    ...channelData,
    createdAt: new Date().toISOString()
  };
  channels.push(newChannel);
  await saveChannels(channels);
  return newChannel;
}

async function saveChannels(channels) {
  if (messagingAdapter) {
    return await messagingAdapter.saveChannels(channels);
  }
  // Fallback to file-based storage
  fs.writeFileSync(CHANNELS_FILE, JSON.stringify({ channels }, null, 2));
}

// ID generation helpers for file-based fallback
// Uses cryptographically secure random generation
function generateMessageId() {
  return Date.now() + '-' + crypto.randomBytes(5).toString('hex');
}

function generateChannelId() {
  return Date.now() + '-' + crypto.randomBytes(5).toString('hex');
}

// Cryptographically secure UUID v4 generator
// Uses Node.js built-in crypto.randomUUID() for secure random generation
function uuidv4() {
  return crypto.randomUUID();
}

// Message operations
async function updateMessage(messageId, updates) {
  if (messagingAdapter) {
    return await messagingAdapter.updateMessage(messageId, updates);
  }
  // Fallback to file-based storage
  const messages = await getMessages();
  const messageIndex = messages.findIndex(m => m.id === messageId);
  if (messageIndex >= 0 && updates.authorId === messages[messageIndex].userId) {
    Object.assign(messages[messageIndex], updates);
    await saveMessages(messages);
    return messages[messageIndex];
  }
  return null;
}

async function deleteMessage(messageId) {
  if (messagingAdapter) {
    return await messagingAdapter.deleteMessage(messageId);
  }
  // Fallback to file-based storage
  const messages = await getMessages();
  const messageIndex = messages.findIndex(m => m.id === messageId);
  if (messageIndex >= 0) {
    messages.splice(messageIndex, 1);
    await saveMessages(messages);
    return true;
  }
  return false;
}

// Reaction operations
async function addReaction(messageId, userId, reaction) {
  if (messagingAdapter) {
    return await messagingAdapter.addReaction(messageId, userId, reaction);
  }
  // Fallback to file-based storage (simplified implementation)
  return true;
}

async function removeReaction(messageId, userId, reaction) {
  if (messagingAdapter) {
    return await messagingAdapter.removeReaction(messageId, userId, reaction);
  }
  // Fallback to file-based storage (simplified implementation)
  return true;
}

async function getReactions(messageId) {
  if (messagingAdapter) {
    return await messagingAdapter.getReactions(messageId);
  }
  // Fallback to file-based storage (simplified implementation)
  return [];
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
  },
  fileFilter: function (req, file, cb) {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|pdf|doc|docx|txt|zip|mp4|mov|avi|mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Socket.IO configuration
const io = new Server(httpServer, {
  cors: {
    origin: config.CORS_ORIGINS,
    credentials: true
  }
});

// Add WebSocket performance monitoring
performanceMonitor.monitorWebSocket(io, 'messaging-service');

// Authentication middleware for Socket.IO
io.use(async (socket, next) => {
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

// Store active connections
const activeUsers = new Map();

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.userId}`);

  // Store user connection in memory
  activeUsers.set(socket.userId, {
    socketId: socket.id,
    email: socket.userEmail,
    status: 'online',
    lastSeen: new Date().toISOString()
  });

  try {
    // Update user presence in database if available
    if (USE_DATABASE && messagingAdapter) {
      await messagingAdapter.updateUserPresence(socket.userId, 'online');
    }
  } catch (error) {
    console.error('Error updating user presence:', error);
  }

  // Broadcast user status
  io.emit('user:status', {
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
      io.to(`channel:${channelId}`).emit('message:new', newMessage);
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
      const updatedMessage = await updateMessage(messageId, {
        content: text,
        edited: true,
        authorId: socket.userId // For authorization
      });

      if (!updatedMessage) {
        socket.emit('error', { message: 'Message not found or unauthorized' });
        return;
      }

      // Emit to all users in the channel
      io.to(`channel:${updatedMessage.conversationId}`).emit('message:updated', updatedMessage);
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
      const deleted = await deleteMessage(messageId);

      if (deleted) {
        // Emit to all users in the channel
        io.to(`channel:${channelId}`).emit('message:deleted', messageId);
      } else {
        socket.emit('error', { message: 'Failed to delete message' });
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

      // Check if user already has this reaction
      const existingReactions = await getReactions(messageId);
      const userReaction = existingReactions.find(r => r.reaction === emoji && r.user_id === socket.userId);

      if (userReaction) {
        // Remove reaction
        await removeReaction(messageId, socket.userId, emoji);
      } else {
        // Add reaction
        await addReaction(messageId, socket.userId, emoji);
      }

      // Get updated reactions and emit
      const updatedReactions = await getReactions(messageId);
      io.to(`channel:${message.conversationId}`).emit('message:reactions-updated', {
        messageId,
        reactions: updatedReactions
      });
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
      io.to(`user:${recipientId}`).emit('dm:new', newMessage);

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
        const updatedMessage = await updateMessage(messageId, {
          metadata: {
            ...message.metadata,
            read: true,
            readAt: new Date().toISOString()
          }
        });

        if (updatedMessage) {
          // Notify sender
          io.to(`user:${message.authorId}`).emit('dm:read', {
            messageId,
            readAt: updatedMessage.metadata.readAt
          });
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
    console.log(`User disconnected: ${socket.userId}`);

    // Update user status in memory
    const userData = activeUsers.get(socket.userId);
    if (userData) {
      userData.status = 'offline';
      userData.lastSeen = new Date().toISOString();
    }

    try {
      // Update user presence in database if available
      if (USE_DATABASE && messagingAdapter) {
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
    io.emit('user:status', {
      userId: socket.userId,
      status: 'offline'
    });
  });
});

// Security middleware (applied first)
app.use(helmet);
app.use(cors);
app.use(auditLogger);
app.use(rateLimit());

// Performance monitoring middleware
app.use(performanceMonitor.createExpressMiddleware('messaging-service'));

// Standard middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// JWT middleware for protected routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// File upload endpoint
app.post('/api/upload',
  authenticateToken,
  validateInput.fileUpload,
  upload.single('file'),
  (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileInfo = {
      id: uuidv4(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      uploadedBy: req.user.id,
      uploadedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      file: fileInfo
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'File upload failed' });
  }
});

// REST API endpoints for channels
app.post('/api/channels',
  authenticateToken,
  validateInput.sanitizeInput,
  (req, res) => {
  const { name, teamId, description } = req.body;

  if (!name || !teamId) {
    return res.status(400).json({ message: 'Name and team ID are required' });
  }

  const channels = getChannels();
  const newChannel = {
    id: uuidv4(),
    name,
    teamId,
    description: description || '',
    createdAt: new Date().toISOString(),
    createdBy: req.body.userId // Should come from auth middleware in production
  };

  channels.push(newChannel);
  saveChannels(channels);

  res.json(newChannel);
});

app.get('/api/channels/:teamId',
  authenticateToken,
  (req, res) => {
  const channels = getChannels();
  const teamChannels = channels.filter(c => c.teamId === req.params.teamId);
  res.json(teamChannels);
});

// Message search endpoint
app.get('/api/search/messages',
  authenticateToken,
  async (req, res) => {
  try {
    const { q: searchTerm, conversation_id, limit = 20, offset = 0 } = req.query;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        message: 'Search term must be at least 2 characters long'
      });
    }

    let results = [];
    if (messagingAdapter) {
      results = await messagingAdapter.searchMessages(
        searchTerm.trim(),
        conversation_id || null,
        parseInt(limit),
        parseInt(offset)
      );
    } else {
      // Fallback to file-based search (basic implementation)
      const messages = await getMessages();
      results = messages
        .filter(m => m.content.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    res.json({
      success: true,
      results,
      query: searchTerm,
      total: results.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

// Message threading endpoints
app.get('/api/messages/:messageId/thread',
  authenticateToken,
  async (req, res) => {
  try {
    const { messageId } = req.params;
    const { limit = 50 } = req.query;

    if (!messagingAdapter) {
      return res.status(501).json({
        message: 'Threading requires database mode'
      });
    }

    const threadMessages = await messagingAdapter.getMessageThread(
      parseInt(messageId),
      parseInt(limit)
    );

    res.json({
      success: true,
      thread: threadMessages,
      parentMessageId: messageId
    });
  } catch (error) {
    console.error('Thread fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch thread' });
  }
});

app.get('/api/conversations/:conversationId/threads',
  authenticateToken,
  async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 20 } = req.query;

    if (!messagingAdapter) {
      return res.status(501).json({
        message: 'Threading requires database mode'
      });
    }

    const threads = await messagingAdapter.getThreads(
      parseInt(conversationId),
      parseInt(limit)
    );

    res.json({
      success: true,
      threads,
      conversationId
    });
  } catch (error) {
    console.error('Threads fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch threads' });
  }
});

// Enhanced conversation endpoints
app.get('/api/conversations',
  authenticateToken,
  async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    let conversations = [];
    if (messagingAdapter) {
      conversations = await messagingAdapter.getConversations(
        req.user.id,
        parseInt(limit),
        parseInt(offset)
      );
    } else {
      // Fallback to file-based storage
      const channels = getChannels();
      conversations = channels.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    res.json({
      success: true,
      conversations,
      total: conversations.length
    });
  } catch (error) {
    console.error('Conversations fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

app.get('/api/conversations/:conversationId/messages',
  authenticateToken,
  async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    let messages = [];
    if (messagingAdapter) {
      messages = await messagingAdapter.getMessages(
        parseInt(conversationId),
        parseInt(limit),
        parseInt(offset),
        req.user.id
      );
    } else {
      // Fallback to file-based storage
      const allMessages = await getMessages();
      messages = allMessages
        .filter(m => m.conversationId === parseInt(conversationId))
        .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    res.json({
      success: true,
      messages,
      conversationId,
      total: messages.length
    });
  } catch (error) {
    console.error('Messages fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// User presence endpoints
app.post('/api/presence/typing',
  authenticateToken,
  async (req, res) => {
  try {
    const { conversationId, isTyping = false } = req.body;

    if (!messagingAdapter) {
      return res.status(501).json({
        message: 'Presence tracking requires database mode'
      });
    }

    await messagingAdapter.updateTypingStatus(
      req.user.id,
      parseInt(conversationId),
      isTyping
    );

    // Broadcast typing status to other users in the conversation
    io.to(`conversation:${conversationId}`).emit('user_typing', {
      userId: req.user.id,
      conversationId,
      isTyping,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Typing status error:', error);
    res.status(500).json({ message: 'Failed to update typing status' });
  }
});

app.post('/api/conversations/:conversationId/read',
  authenticateToken,
  async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messageId } = req.body;

    if (!messagingAdapter) {
      return res.status(501).json({
        message: 'Read receipts require database mode'
      });
    }

    await messagingAdapter.markMessageAsRead(
      req.user.id,
      parseInt(conversationId),
      messageId ? parseInt(messageId) : null
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Read receipt error:', error);
    res.status(500).json({ message: 'Failed to mark as read' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    status: 'UP',
    service: 'messaging-service',
    port: PORT,
    uptime: process.uptime() * 1000,
    memory: process.memoryUsage(),
    activeUsers: activeUsers.size,
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    features: {
      websocket: config.ENABLE_WEBSOCKET,
      fileUpload: config.ENABLE_FILE_UPLOAD
    }
  };

  res.json(healthData);
});

// Import health check module
const { createHealthCheck, messagingHealthChecks } = require('./health-check');

// Import monitoring endpoints
const { createMonitoringRouter } = require('./monitoring/endpoints');

// Add health check endpoints
app.use(createHealthCheck({
  serviceName: 'messaging-service',
  port: PORT,
  customChecks: messagingHealthChecks
}));

// Add monitoring endpoints
app.use('/api/monitoring', createMonitoringRouter());

// Add security error handler
app.use(securityErrorHandler);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: config.isDevelopment ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 ${config.APP_NAME} Messaging Service`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 WebSocket connections available on ws://localhost:${PORT}`);
  console.log(`🔒 Security middleware enabled`);
  console.log(`📁 Upload directory: ${UPLOADS_DIR}`);
  console.log(`📊 Active users tracking enabled`);
});