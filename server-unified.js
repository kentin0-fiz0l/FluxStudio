/**
 * FluxStudio Unified Backend Service
 * Combines Authentication + Messaging services into a single backend
 *
 * Architecture:
 * - Single Express server on port 3001
 * - Socket.IO namespaces for separation:
 *   - /auth: Performance monitoring, real-time auth events
 *   - /messaging: Real-time messaging, typing indicators, presence
 * - Shared middleware, database adapters, and security
 *
 * Cost Savings: $360/year by consolidating from 3 services to 2
 * Complexity Reduction: Single codebase for auth + messaging
 *
 * Note: server-collaboration.js remains separate (uses raw WebSocket with Yjs CRDT)
 */

require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');

// Import security and configuration modules
const { config } = require('./config/environment');
const { rateLimit, authRateLimit, printRateLimit, cors, helmet, validateInput, securityErrorHandler, auditLogger } = require('./middleware/security');
const { csrfProtection, getCsrfToken } = require('./middleware/csrf');
const cookieParser = require('cookie-parser');

// Import performance monitoring
const { performanceMonitor } = require('./monitoring/performance');

// Import monitoring endpoints
const { createMonitoringRouter } = require('./monitoring/endpoints');

// Import Redis cache layer
const cache = require('./lib/cache');

// Import database query function (for Phase 1 webhook storage) and migrations
const { query, runMigrations } = require('./database/config');

// Import Week 1 Security Sprint - JWT Refresh Token Routes
const refreshTokenRoutes = require('./lib/auth/refreshTokenRoutes');

// Import Week 2 Security Sprint - Auth Helpers for Token Integration
const { generateAuthResponse } = require('./lib/auth/authHelpers');

// Import file validation utilities
const { validateUploadedFiles, validateFileType } = require('./lib/fileValidator');

// Import Sprint 13 - Security Logger
// const transcodingService = require('./services/transcoding-service'); // AWS version
const transcodingService = require('./services/transcoding-service-do'); // DigitalOcean version
const securityLogger = require('./lib/auth/securityLogger');

// Import Sprint 13 Day 2 - Sentry & Anomaly Detection
const { initSentry, requestHandler, tracingHandler, errorHandler, captureAuthError } = require('./lib/monitoring/sentry');
const anomalyDetector = require('./lib/security/anomalyDetector');

// Initialize cache on startup
let cacheInitialized = false;
cache.initializeCache()
  .then(() => {
    cacheInitialized = true;
    console.log('✅ Redis cache initialized for unified service');
  })
  .catch((err) => {
    console.warn('⚠️  Redis cache not available, continuing without cache:', err.message);
  });

// Database adapters (with fallback to file-based storage)
let authAdapter = null;
let messagingAdapter = null;
const USE_DATABASE = process.env.USE_DATABASE === 'true';

if (USE_DATABASE) {
  try {
    authAdapter = require('./database/auth-adapter');
    messagingAdapter = require('./database/messaging-adapter');
    console.log('✅ Database adapters loaded for unified service');
  } catch (error) {
    console.warn('⚠️ Failed to load database adapters, falling back to file-based storage:', error.message);
  }
}

// Cryptographically secure UUID v4 generator
function uuidv4() {
  return crypto.randomUUID();
}

const app = express();

// Initialize Sentry for error tracking and performance monitoring
initSentry(app);

const httpServer = createServer(app);
const PORT = config.AUTH_PORT; // Port 3001 - single unified endpoint
const JWT_SECRET = config.JWT_SECRET;

// Socket.IO configuration with namespaces
const io = new Server(httpServer, {
  path: '/api/socket.io', // Match frontend path on DigitalOcean App Platform
  cors: {
    origin: config.CORS_ORIGINS,
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true // Allow Engine.IO v3 clients
});

// Add WebSocket performance monitoring
performanceMonitor.monitorWebSocket(io, 'unified-service');

// Create Socket.IO namespaces for separation
const authNamespace = io.of('/auth');
const messagingNamespace = io.of('/messaging');
const printingNamespace = io.of('/printing'); // Phase 3A: Real-time printing updates

// Store printing namespace in app for access in routes (Phase 4A)
app.set('printingNamespace', printingNamespace);

// Google OAuth configuration
const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Simple file-based storage for users (in production, use a real database)
const USERS_FILE = path.join(__dirname, 'users.json');
const FILES_FILE = path.join(__dirname, 'files.json');
const TEAMS_FILE = path.join(__dirname, 'teams.json');
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const CHANNELS_FILE = path.join(__dirname, 'channels.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Initialize files if they don't exist
[USERS_FILE, FILES_FILE, TEAMS_FILE, PROJECTS_FILE, MESSAGES_FILE, CHANNELS_FILE].forEach(file => {
  if (!fs.existsSync(file)) {
    const key = path.basename(file, '.json');
    fs.writeFileSync(file, JSON.stringify({ [key]: [] }));
  }
});

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|pdf|doc|docx|txt|zip|mp4|mov|avi|mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

// Security middleware (applied first)
app.use(helmet);
app.use(cors);
app.use(auditLogger);
app.use(rateLimit());

// Performance monitoring middleware
app.use(performanceMonitor.createExpressMiddleware('unified-service'));

// Sentry request and tracing handlers (must be before routes)
app.use(requestHandler());
app.use(tracingHandler());

// Trust proxy for X-Forwarded-For headers (required for nginx reverse proxy)
app.set('trust proxy', 1);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser (required for CSRF protection)
app.use(cookieParser());

// CSRF Protection (skip for OAuth endpoints)
// Note: DigitalOcean App Platform routes /api/* to this service,
// so paths here should NOT include /api prefix
app.use(csrfProtection({
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  ignorePaths: ['/auth/google', '/auth/apple', '/health', '/monitoring']
}));

// Static file serving
app.use(express.static('build'));
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper functions with database/file hybrid support (Auth)
async function getUsers() {
  if (authAdapter) {
    return await performanceMonitor.monitorDatabaseQuery('getUsers', () => authAdapter.getUsers());
  }
  const data = fs.readFileSync(USERS_FILE, 'utf8');
  return JSON.parse(data).users;
}

async function getUserByEmail(email) {
  if (cacheInitialized) {
    const cached = await cache.get(cache.buildKey.userByEmail(email));
    if (cached) return cached;
  }

  let user;
  if (authAdapter) {
    user = await performanceMonitor.monitorDatabaseQuery('getUserByEmail', () => authAdapter.getUserByEmail(email));
  } else {
    const users = await getUsers();
    user = users.find(user => user.email === email);
  }

  if (user && cacheInitialized) {
    await cache.set(cache.buildKey.userByEmail(email), user, cache.TTL.MEDIUM);
    await cache.set(cache.buildKey.user(user.id), user, cache.TTL.MEDIUM);
  }

  return user;
}

async function getUserById(id) {
  if (cacheInitialized) {
    const cached = await cache.get(cache.buildKey.user(id));
    if (cached) return cached;
  }

  let user;
  if (authAdapter) {
    user = await performanceMonitor.monitorDatabaseQuery('getUserById', () => authAdapter.getUserById(id));
  } else {
    const users = await getUsers();
    user = users.find(user => user.id === id);
  }

  if (user && cacheInitialized) {
    await cache.set(cache.buildKey.user(id), user, cache.TTL.MEDIUM);
  }

  return user;
}

async function createUser(userData) {
  let newUser;
  if (authAdapter) {
    newUser = await performanceMonitor.monitorDatabaseQuery('createUser', () => authAdapter.createUser(userData));
  } else {
    const users = await getUsers();
    newUser = {
      id: uuidv4(),
      ...userData,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    await saveUsers(users);
  }

  if (cacheInitialized && newUser) {
    await cache.set(cache.buildKey.user(newUser.id), newUser, cache.TTL.MEDIUM);
    if (newUser.email) {
      await cache.set(cache.buildKey.userByEmail(newUser.email), newUser, cache.TTL.MEDIUM);
    }
  }

  return newUser;
}

async function updateUser(id, updates) {
  let updatedUser;
  if (authAdapter) {
    updatedUser = await performanceMonitor.monitorDatabaseQuery('updateUser', () => authAdapter.updateUser(id, updates));
  } else {
    const users = await getUsers();
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updates };
      await saveUsers(users);
      updatedUser = users[userIndex];
    } else {
      return null;
    }
  }

  if (cacheInitialized && updatedUser) {
    await cache.invalidate.user(id);
    if (updatedUser.email) {
      await cache.del(cache.buildKey.userByEmail(updatedUser.email));
    }
  }

  return updatedUser;
}

async function saveUsers(users) {
  if (authAdapter) {
    return await authAdapter.saveUsers(users);
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
}

// Helper functions for files, teams, projects
async function getFiles() {
  if (authAdapter) {
    return await authAdapter.getFiles();
  }
  const data = fs.readFileSync(FILES_FILE, 'utf8');
  return JSON.parse(data).files;
}

async function saveFiles(files) {
  if (authAdapter) {
    return await authAdapter.saveFiles(files);
  }
  fs.writeFileSync(FILES_FILE, JSON.stringify({ files }, null, 2));
}

async function getTeams() {
  if (authAdapter) {
    return await authAdapter.getTeams();
  }
  const data = fs.readFileSync(TEAMS_FILE, 'utf8');
  return JSON.parse(data).teams;
}

async function saveTeams(teams) {
  if (authAdapter) {
    return await authAdapter.saveTeams(teams);
  }
  fs.writeFileSync(TEAMS_FILE, JSON.stringify({ teams }, null, 2));
}

async function getProjects() {
  if (authAdapter) {
    return await authAdapter.getProjects();
  }
  const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
  return JSON.parse(data).projects;
}

async function saveProjects(projects) {
  if (authAdapter) {
    return await authAdapter.saveProjects(projects);
  }
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify({ projects }, null, 2));
}

// Helper functions for messaging
async function getMessages(conversationId = null, limit = 100) {
  if (messagingAdapter) {
    return await performanceMonitor.monitorDatabaseQuery('getMessages', () => messagingAdapter.getMessages(conversationId, limit));
  }
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
  const messages = await getMessages();
  const newMessage = {
    id: Date.now() + '-' + crypto.randomBytes(5).toString('hex'),
    ...messageData,
    timestamp: new Date().toISOString()
  };
  messages.push(newMessage);
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify({ messages }, null, 2));
  return newMessage;
}

async function getChannels() {
  if (messagingAdapter) {
    return await performanceMonitor.monitorDatabaseQuery('getChannels', () => messagingAdapter.getConversations());
  }
  const data = fs.readFileSync(CHANNELS_FILE, 'utf8');
  return JSON.parse(data).channels;
}

async function saveChannels(channels) {
  if (messagingAdapter) {
    return await messagingAdapter.saveChannels(channels);
  }
  fs.writeFileSync(CHANNELS_FILE, JSON.stringify({ channels }, null, 2));
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, userType: user.userType },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Simple auth response without database (fallback when USE_DATABASE=false)
function simpleAuthResponse(user) {
  const token = generateToken(user);
  const { password, googleId, ...userWithoutPassword } = user;
  return {
    token,
    accessToken: token,
    user: userWithoutPassword
  };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

// ==============================================
// CONSOLIDATED ROUTE MODULES
// Authentication, Users, Files, Teams, Projects, Messages, Channels
// ==============================================

// Import Phase 1 modules
const oauthManager = require('./lib/oauth-manager');
const mcpManager = require('./lib/mcp-manager');

// Import Phase 4 modules
const GitHubSyncService = require('./services/github-sync-service');

// Initialize MCP Manager on server startup
let mcpInitialized = false;
if (process.env.MCP_AUTO_CONNECT !== 'false') {
  mcpManager.initialize()
    .then(() => {
      mcpInitialized = true;
      console.log('✅ MCP Manager initialized successfully');
    })
    .catch(err => {
      console.warn('⚠️  MCP Manager initialization failed:', err.message);
    });
}

// Initialize GitHub Sync Service (Phase 4)
let githubSyncService = null;
if (USE_DATABASE && authAdapter) {
  try {
    githubSyncService = new GitHubSyncService({
      database: authAdapter.dbConfig,
      syncInterval: 300000 // 5 minutes
    });

    if (process.env.GITHUB_AUTO_SYNC !== 'false') {
      githubSyncService.startAutoSync();
      console.log('✅ GitHub Sync Service initialized with auto-sync enabled');
    }
  } catch (error) {
    console.warn('⚠️  GitHub Sync Service initialization failed:', error.message);
  }
}

// CSRF token endpoint
// Note: DigitalOcean routes /api/csrf-token to this service as /csrf-token
app.get('/csrf-token', getCsrfToken);

// Mount route modules (all auth routes consolidated here for simplicity)
// For a production app, these would be in separate route files in ./routes/

// Load all existing route files from server-auth.js and server-messaging.js
// Due to space constraints, routes are inline. In production, extract to ./routes/*.js

// Import existing route modules
// Note: DigitalOcean App Platform routes /api/* to this service,
// so mount paths should NOT include /api prefix

// Google OAuth endpoint - MUST be defined BEFORE mounting /auth router
// to avoid being caught by the router and returning 404
app.post('/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Missing Google credential' });
    }

    if (!googleClient) {
      return res.status(500).json({ message: 'Google OAuth not configured' });
    }

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists
    let user = await getUserByEmail(email);

    if (!user) {
      // Create new user
      user = await createUser({
        email,
        name: name || email.split('@')[0],
        googleId,
        avatar: picture,
        userType: 'client',
        password: null // OAuth users don't have passwords
      });
      console.log(`✅ New user created via Google OAuth: ${email}`);
    } else if (!user.googleId) {
      // Link Google account to existing user
      await updateUser(user.id, { googleId, avatar: picture || user.avatar });
      console.log(`✅ Google account linked to existing user: ${email}`);
    }

    // Generate auth response
    const authResponse = USE_DATABASE && authAdapter
      ? await generateAuthResponse(user, req)
      : simpleAuthResponse(user);

    res.json(authResponse);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(401).json({ message: 'Google authentication failed', error: error.message });
  }
});

// NOW mount the /auth router (after OAuth route is defined)
// This prevents the router from catching OAuth requests
app.use('/auth', refreshTokenRoutes);

// Mount Sprint 13 Day 5 - Admin API Routes
const adminBlockedIps = require('./lib/api/admin/blockedIps');
const adminTokens = require('./lib/api/admin/tokens');
const adminSecurity = require('./lib/api/admin/security');
const adminMaintenance = require('./lib/api/admin/maintenance');

app.use('/admin/security', adminBlockedIps);
app.use('/admin', adminTokens);
app.use('/admin/security', adminSecurity);
app.use('/admin/maintenance', adminMaintenance);

// Mount monitoring endpoints
app.use('/monitoring', createMonitoringRouter());

// Organizations endpoint (teams API)
// Note: Path is /organizations but DigitalOcean routes /api/organizations to here
app.get('/organizations', authenticateToken, async (req, res) => {
  try {
    // Return user's organizations/teams
    const teams = JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf8')).teams || [];
    const userTeams = teams.filter(team =>
      team.members && team.members.some(member => member.userId === req.user.id)
    );

    const organizations = userTeams.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description,
      role: team.members.find(m => m.userId === req.user.id)?.role || 'member',
      createdAt: team.createdAt,
      memberCount: team.members.length
    }));

    res.json({ organizations });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Failed to fetch organizations', organizations: [] });
  }
});

// ========================================
// PHASE 1: Auth & Core Routes
// ========================================

// User signup
app.post('/auth/signup',
  authRateLimit,
  validateInput.email,
  validateInput.password,
  validateInput.sanitizeInput,
  async (req, res) => {
  try {
    const { email, password, name, userType = 'client' } = req.body;

    // Check if IP is blocked
    const isBlocked = await anomalyDetector.isIpBlocked(req.ip);
    if (isBlocked) {
      return res.status(429).json({
        message: 'Too many requests. Please try again later.'
      });
    }

    // Check for suspicious user agent
    const isSuspicious = anomalyDetector.checkSuspiciousUserAgent(req.get('user-agent'));
    if (isSuspicious) {
      await securityLogger.logEvent(
        'suspicious_user_agent_detected',
        securityLogger.SEVERITY.WARNING,
        {
          email,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          endpoint: '/auth/signup'
        }
      );
    }

    // Check for rapid signup requests
    const isRapidRequest = await anomalyDetector.checkRequestRate(req.ip, '/auth/signup');
    if (isRapidRequest) {
      await anomalyDetector.blockIpAddress(req.ip, 1800, 'rapid_signup_requests');
      return res.status(429).json({
        message: 'Too many signup attempts. Please try again later.'
      });
    }

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate userType
    const validUserTypes = ['client', 'designer', 'admin'];
    if (!validUserTypes.includes(userType)) {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    const users = await getUsers();
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = {
      id: uuidv4(),
      email,
      name,
      userType,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await saveUsers(users);

    // Generate token pair
    const authResponse = await generateAuthResponse(newUser, req);

    // Log successful signup
    await securityLogger.logSignupSuccess(newUser.id, email, req, {
      userType,
      name
    });

    res.json(authResponse);
  } catch (error) {
    console.error('Signup error:', error);

    // Capture error in Sentry
    captureAuthError(error, {
      endpoint: '/auth/signup',
      email: req.body.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Log failed signup
    await securityLogger.logSignupFailure(req.body.email, error.message, req, {
      error: error.message
    });

    res.status(500).json({ message: 'Server error during signup' });
  }
});

// User login
app.post('/auth/login',
  authRateLimit,
  validateInput.email,
  validateInput.sanitizeInput,
  async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if IP is blocked
    const isBlocked = await anomalyDetector.isIpBlocked(req.ip);
    if (isBlocked) {
      return res.status(429).json({
        message: 'Too many failed attempts. Please try again later.'
      });
    }

    // Find user
    const user = await getUserByEmail(email);

    if (!user) {
      // Check for brute force
      const isBruteForce = await anomalyDetector.checkFailedLoginRate(email, req.ip);
      if (isBruteForce) {
        await anomalyDetector.blockIpAddress(req.ip, 3600, 'brute_force_login');
        return res.status(429).json({
          message: 'Too many failed attempts. Your IP has been temporarily blocked.'
        });
      }

      await securityLogger.logLoginFailure(email, 'User not found', req);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      // Check for brute force
      const isBruteForce = await anomalyDetector.checkFailedLoginRate(email, req.ip);
      if (isBruteForce) {
        await anomalyDetector.blockIpAddress(req.ip, 3600, 'brute_force_login');
        return res.status(429).json({
          message: 'Too many failed attempts. Your IP has been temporarily blocked.'
        });
      }

      await securityLogger.logLoginFailure(email, 'Invalid password', req, {
        userId: user.id
      });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Reset failed login counter
    await anomalyDetector.resetFailedLoginCounter(email, req.ip);

    // Generate token pair
    const authResponse = await generateAuthResponse(user, req);

    // Log successful login
    await securityLogger.logLoginSuccess(user.id, req, {
      email: user.email,
      userType: user.userType
    });

    res.json(authResponse);
  } catch (error) {
    console.error('Login error:', error);

    // Capture error in Sentry
    captureAuthError(error, {
      endpoint: '/auth/login',
      email: req.body.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await securityLogger.logLoginFailure(req.body.email, `Server error: ${error.message}`, req);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
app.get('/auth/me', authenticateToken, async (req, res) => {
  const users = await getUsers();
  const user = users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Remove both password fields (FluxStudio and MetMap compatible)
  const { password: _p, passwordHash: _ph, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// Logout
app.post('/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Apple OAuth (placeholder)
app.post('/auth/apple', async (req, res) => {
  try {
    res.status(501).json({
      message: 'Apple Sign In integration is in development. Please use email/password authentication for now.',
      error: 'OAuth not yet implemented'
    });
  } catch (error) {
    console.error('Apple OAuth error:', error);
    res.status(500).json({ message: 'Apple authentication error' });
  }
});

// ========================================
// PHASE 2: File Management Routes
// ========================================

// Upload file(s)
app.post('/files/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const files = await getFiles();
    const uploadedFiles = [];

    req.files.forEach(file => {
      const fileMetadata = {
        id: uuidv4(),
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        url: `/uploads/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
        uploadedBy: req.user.id,
        uploadedAt: new Date().toISOString(),
        tags: [],
        description: '',
        isPublic: false
      };

      files.push(fileMetadata);
      uploadedFiles.push(fileMetadata);
    });

    await saveFiles(files);

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Error uploading files' });
  }
});

// Get user's files
app.get('/files', authenticateToken, async (req, res) => {
  try {
    const files = await getFiles();
    const userFiles = files.filter(file => file.uploadedBy === req.user.id);

    res.json({ files: userFiles });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ message: 'Error retrieving files' });
  }
});

// Get file by ID
app.get('/files/:id', authenticateToken, async (req, res) => {
  try {
    const files = await getFiles();
    const file = files.find(f => f.id === req.params.id && f.uploadedBy === req.user.id);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.json(file);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ message: 'Error retrieving file' });
  }
});

// Update file metadata
app.put('/files/:id', authenticateToken, async (req, res) => {
  try {
    const files = await getFiles();
    const fileIndex = files.findIndex(f => f.id === req.params.id && f.uploadedBy === req.user.id);

    if (fileIndex === -1) {
      return res.status(404).json({ message: 'File not found' });
    }

    const { description, tags, isPublic } = req.body;

    files[fileIndex] = {
      ...files[fileIndex],
      description: description || files[fileIndex].description,
      tags: tags || files[fileIndex].tags,
      isPublic: isPublic !== undefined ? isPublic : files[fileIndex].isPublic,
      updatedAt: new Date().toISOString()
    };

    await saveFiles(files);
    res.json(files[fileIndex]);
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ message: 'Error updating file' });
  }
});

// Delete file
app.delete('/files/:id', authenticateToken, async (req, res) => {
  try {
    const files = await getFiles();
    const fileIndex = files.findIndex(f => f.id === req.params.id && f.uploadedBy === req.user.id);

    if (fileIndex === -1) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = files[fileIndex];

    // Delete physical file
    try {
      fs.unlinkSync(file.path);
    } catch (err) {
      console.warn('Could not delete physical file:', err.message);
    }

    // Remove from database
    files.splice(fileIndex, 1);
    await saveFiles(files);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

// ========================================
// HLS TRANSCODING & DRM ROUTES
// ========================================

// Submit video for HLS transcoding (DigitalOcean Spaces version)
app.post('/media/transcode', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    // Verify file exists and user owns it
    const fileResult = await query(
      'SELECT id, name, file_url, uploaded_by FROM files WHERE id = $1',
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    if (file.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Extract Spaces key from file_url
    // Supports both formats:
    // - https://fluxstudio.nyc3.digitaloceanspaces.com/uploads/file.mp4
    // - https://fluxstudio.nyc3.cdn.digitaloceanspaces.com/uploads/file.mp4
    const spacesKey = file.file_url.includes('digitaloceanspaces.com/')
      ? file.file_url.split('digitaloceanspaces.com/')[1]
      : file.file_url;

    // Submit transcoding job (will be picked up by FFmpeg worker)
    const job = await transcodingService.createTranscodingJob({
      fileId: file.id,
      fileName: file.name,
      spacesKey: spacesKey,
      userId: req.user.id
    });

    res.json({
      message: 'Transcoding job submitted successfully',
      jobId: job.jobId,
      status: job.status,
      estimatedCompletion: '5-10 minutes',
      hlsUrl: job.outputUrl
    });

  } catch (error) {
    console.error('Transcoding submission error:', error);
    res.status(500).json({
      error: 'Failed to submit transcoding job',
      details: error.message
    });
  }
});

// Get transcoding status for a file
app.get('/media/transcode/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    const status = await transcodingService.getTranscodingStatus(fileId);

    if (!status) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      fileId: status.id,
      fileName: status.name,
      status: status.transcoding_status,
      jobStatus: status.job_status,
      progress: status.progress || 0,
      hlsManifestUrl: status.hls_manifest_url,
      drmProtected: status.drm_protected,
      errorMessage: status.error_message,
      createdAt: status.created_at,
      completedAt: status.completed_at
    });

  } catch (error) {
    console.error('Get transcoding status error:', error);
    res.status(500).json({
      error: 'Failed to get transcoding status',
      details: error.message
    });
  }
});

// Admin endpoint: Monitor all in-progress transcoding jobs
app.post('/media/monitor-jobs', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin check middleware
    // For now, restrict to specific user emails or admin role

    const result = await transcodingService.monitorJobs();

    res.json({
      message: 'Job monitoring completed',
      jobsChecked: result.checked,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Job monitoring error:', error);
    res.status(500).json({
      error: 'Failed to monitor jobs',
      details: error.message
    });
  }
});

// Get HLS manifest (with access control)
app.get('/media/:fileId/manifest', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    const fileResult = await query(
      `SELECT id, hls_manifest_url, drm_protected, is_public, uploaded_by
       FROM files
       WHERE id = $1`,
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    // Check access permissions
    if (!file.is_public && file.uploaded_by !== req.user.id) {
      // TODO: Check organization/project membership
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!file.hls_manifest_url) {
      return res.status(404).json({
        error: 'HLS manifest not available',
        suggestion: 'File may not be transcoded yet'
      });
    }

    // Redirect to CloudFront URL or return manifest URL
    res.json({
      manifestUrl: file.hls_manifest_url,
      drmProtected: file.drm_protected,
      licenseServerUrl: file.drm_protected
        ? `${process.env.FAIRPLAY_LICENSE_SERVER_URL || 'https://fluxstudio.art/fps'}/license?contentId=${fileId}`
        : null
    });

  } catch (error) {
    console.error('Get manifest error:', error);
    res.status(500).json({
      error: 'Failed to get manifest',
      details: error.message
    });
  }
});

// ========================================
// PHASE 3: Team Management Routes
// ========================================

// Create a new team
app.post('/teams', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const teams = await getTeams();

    const newTeam = {
      id: uuidv4(),
      name,
      description: description || '',
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      members: [
        {
          userId: req.user.id,
          role: 'owner',
          joinedAt: new Date().toISOString()
        }
      ],
      invites: []
    };

    teams.push(newTeam);
    await saveTeams(teams);

    res.json({
      message: 'Team created successfully',
      team: newTeam
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ message: 'Error creating team' });
  }
});

// Get user's teams
app.get('/teams', authenticateToken, async (req, res) => {
  try {
    const teams = await getTeams();
    const userTeams = teams.filter(team =>
      team.members.some(member => member.userId === req.user.id)
    );

    res.json({ teams: userTeams });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ message: 'Error retrieving teams' });
  }
});

// Get team by ID
app.get('/teams/:id', authenticateToken, async (req, res) => {
  try {
    const teams = await getTeams();
    const team = teams.find(t => t.id === req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is a member
    const isMember = team.members.some(member => member.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(team);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ message: 'Error retrieving team' });
  }
});

// Update team
app.put('/teams/:id', authenticateToken, async (req, res) => {
  try {
    const teams = await getTeams();
    const teamIndex = teams.findIndex(t => t.id === req.params.id);

    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is owner or admin
    const member = teams[teamIndex].members.find(m => m.userId === req.user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const { name, description } = req.body;

    teams[teamIndex] = {
      ...teams[teamIndex],
      name: name || teams[teamIndex].name,
      description: description !== undefined ? description : teams[teamIndex].description,
      updatedAt: new Date().toISOString()
    };

    await saveTeams(teams);
    res.json(teams[teamIndex]);
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ message: 'Error updating team' });
  }
});

// Invite member to team
app.post('/teams/:id/invite', authenticateToken, async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const teams = await getTeams();
    const teamIndex = teams.findIndex(t => t.id === req.params.id);

    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user has permission to invite
    const member = teams[teamIndex].members.find(m => m.userId === req.user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Check if user is already a member or invited
    const users = await getUsers();
    const invitedUser = users.find(u => u.email === email);

    if (invitedUser) {
      const existingMember = teams[teamIndex].members.find(m => m.userId === invitedUser.id);
      if (existingMember) {
        return res.status(400).json({ message: 'User is already a team member' });
      }
    }

    // Create invitation
    const invite = {
      id: uuidv4(),
      email,
      role,
      invitedBy: req.user.id,
      invitedAt: new Date().toISOString(),
      status: 'pending'
    };

    if (!teams[teamIndex].invites) {
      teams[teamIndex].invites = [];
    }
    teams[teamIndex].invites.push(invite);

    await saveTeams(teams);

    res.json({
      message: 'Invitation sent successfully',
      invite
    });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({ message: 'Error sending invitation' });
  }
});

// Accept team invitation
app.post('/teams/:id/accept-invite', authenticateToken, async (req, res) => {
  try {
    const teams = await getTeams();
    const teamIndex = teams.findIndex(t => t.id === req.params.id);

    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Find invitation for user's email
    const users = await getUsers();
    const user = users.find(u => u.id === req.user.id);
    const inviteIndex = teams[teamIndex].invites.findIndex(
      i => i.email === user.email && i.status === 'pending'
    );

    if (inviteIndex === -1) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    const invite = teams[teamIndex].invites[inviteIndex];

    // Add user as member
    teams[teamIndex].members.push({
      userId: req.user.id,
      role: invite.role,
      joinedAt: new Date().toISOString()
    });

    // Update invitation status
    teams[teamIndex].invites[inviteIndex].status = 'accepted';

    await saveTeams(teams);

    res.json({
      message: 'Successfully joined the team',
      team: teams[teamIndex]
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ message: 'Error accepting invitation' });
  }
});

// Remove member from team
app.delete('/teams/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const teams = await getTeams();
    const teamIndex = teams.findIndex(t => t.id === req.params.id);

    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user has permission to remove members
    const member = teams[teamIndex].members.find(m => m.userId === req.user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      // Allow users to remove themselves
      if (req.params.userId !== req.user.id) {
        return res.status(403).json({ message: 'Permission denied' });
      }
    }

    // Cannot remove the owner
    const targetMember = teams[teamIndex].members.find(m => m.userId === req.params.userId);
    if (targetMember && targetMember.role === 'owner' && req.params.userId !== req.user.id) {
      return res.status(400).json({ message: 'Cannot remove team owner' });
    }

    // Remove member
    teams[teamIndex].members = teams[teamIndex].members.filter(
      m => m.userId !== req.params.userId
    );

    await saveTeams(teams);

    res.json({
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Error removing member' });
  }
});

// Update member role
app.put('/teams/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['owner', 'admin', 'member'];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Valid role is required' });
    }

    const teams = await getTeams();
    const teamIndex = teams.findIndex(t => t.id === req.params.id);

    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user has permission
    const member = teams[teamIndex].members.find(m => m.userId === req.user.id);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({ message: 'Only team owner can change roles' });
    }

    // Find target member
    const targetMemberIndex = teams[teamIndex].members.findIndex(
      m => m.userId === req.params.userId
    );

    if (targetMemberIndex === -1) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Update role
    teams[teamIndex].members[targetMemberIndex].role = role;
    await saveTeams(teams);

    res.json({
      message: 'Member role updated successfully',
      member: teams[teamIndex].members[targetMemberIndex]
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ message: 'Error updating member role' });
  }
});

// ========================================
// PHASE 4: Project Management Routes
// ========================================

// Create a new project
app.post('/projects', authenticateToken, async (req, res) => {
  try {
    const { name, description, teamId, status = 'active' } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const projects = await getProjects();

    const newProject = {
      id: uuidv4(),
      name,
      description: description || '',
      teamId: teamId || null,
      status,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      members: [
        {
          userId: req.user.id,
          role: 'owner',
          joinedAt: new Date().toISOString()
        }
      ],
      channelMetadata: null
    };

    projects.push(newProject);
    await saveProjects(projects);

    res.json({
      message: 'Project created successfully',
      project: newProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Error creating project' });
  }
});

// Get user's projects
app.get('/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await getProjects();
    const userProjects = projects.filter(project =>
      project.members.some(member => member.userId === req.user.id)
    );

    res.json({ projects: userProjects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Error retrieving projects' });
  }
});

// Get project by ID
app.get('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const projects = await getProjects();
    const project = projects.find(p => p.id === req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is a member
    const isMember = project.members.some(member => member.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Error retrieving project' });
  }
});

// Update project
app.put('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const projects = await getProjects();
    const projectIndex = projects.findIndex(p => p.id === req.params.id);

    if (projectIndex === -1) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner or admin
    const member = projects[projectIndex].members.find(m => m.userId === req.user.id);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const { name, description, status } = req.body;

    projects[projectIndex] = {
      ...projects[projectIndex],
      name: name || projects[projectIndex].name,
      description: description !== undefined ? description : projects[projectIndex].description,
      status: status || projects[projectIndex].status,
      updatedAt: new Date().toISOString()
    };

    await saveProjects(projects);
    res.json(projects[projectIndex]);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Error updating project' });
  }
});

// Link message channel to project
app.post('/projects/:id/channel', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.body;

    if (!channelId) {
      return res.status(400).json({ message: 'Channel ID is required' });
    }

    const projects = await getProjects();
    const projectIndex = projects.findIndex(p => p.id === req.params.id);

    if (projectIndex === -1) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is a member
    const isMember = projects[projectIndex].members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Store channel metadata
    projects[projectIndex].channelMetadata = {
      channelId,
      channelType: 'project',
      linkedAt: new Date().toISOString()
    };

    await saveProjects(projects);

    res.json({
      message: 'Channel linked successfully',
      project: projects[projectIndex]
    });
  } catch (error) {
    console.error('Link channel error:', error);
    res.status(500).json({ message: 'Error linking channel' });
  }
});

// Get project's channel metadata
app.get('/projects/:id/channel', authenticateToken, async (req, res) => {
  try {
    const projects = await getProjects();
    const project = projects.find(p => p.id === req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is a member
    const isMember = project.members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      channelMetadata: project.channelMetadata || null,
      hasChannel: !!project.channelMetadata
    });
  } catch (error) {
    console.error('Get channel metadata error:', error);
    res.status(500).json({ message: 'Error retrieving channel' });
  }
});

// ========================================
// PHASE 5: Messaging Routes
// ========================================

// Get user's conversations
app.get('/conversations', authenticateToken, async (req, res) => {
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
      const channels = await getChannels();
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

// Get messages in a conversation
app.get('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
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

// Get user notifications
app.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    let notifications = [];
    if (messagingAdapter) {
      notifications = await messagingAdapter.getNotifications(
        req.user.id,
        parseInt(limit),
        parseInt(offset)
      );
    } else {
      // Fallback: return empty for file-based storage
      notifications = [];
    }

    res.json({
      success: true,
      notifications,
      total: notifications.length
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Get message thread
app.get('/messages/:messageId/thread', authenticateToken, async (req, res) => {
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

// Get conversation threads
app.get('/conversations/:conversationId/threads', authenticateToken, async (req, res) => {
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

// Mark conversation as read
app.post('/conversations/:conversationId/read', authenticateToken, async (req, res) => {
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

// Search messages
app.get('/search/messages', authenticateToken, async (req, res) => {
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
      // Fallback to file-based search
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

// Typing status endpoint
app.post('/presence/typing', authenticateToken, async (req, res) => {
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

    res.json({ success: true });
  } catch (error) {
    console.error('Typing status error:', error);
    res.status(500).json({ message: 'Failed to update typing status' });
  }
});

// Create channel
app.post('/channels', authenticateToken, validateInput.sanitizeInput, async (req, res) => {
  const { name, teamId, description } = req.body;

  if (!name || !teamId) {
    return res.status(400).json({ message: 'Name and team ID are required' });
  }

  const channels = await getChannels();
  const newChannel = {
    id: uuidv4(),
    name,
    teamId,
    description: description || '',
    createdAt: new Date().toISOString(),
    createdBy: req.user.id
  };

  channels.push(newChannel);
  await saveChannels(channels);

  res.json(newChannel);
});

// Get channels by team
app.get('/channels/:teamId', authenticateToken, async (req, res) => {
  const channels = await getChannels();
  const teamChannels = channels.filter(c => c.teamId === req.params.teamId);
  res.json(teamChannels);
});

// POST /organizations - Create organization
app.post('/organizations', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Organization name is required' });
    }

    const teams = await getTeams();

    // Create new organization (team)
    const organization = {
      id: uuidv4(),
      name,
      description: description || '',
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [{
        userId: req.user.id,
        role: 'admin',
        joinedAt: new Date().toISOString()
      }],
      invites: []
    };

    teams.push(organization);
    await saveTeams(teams);

    performanceMonitor.incrementCounter('organizations_created');

    res.status(201).json({
      organization: {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        role: 'admin',
        createdAt: organization.createdAt,
        memberCount: 1
      }
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ message: 'Failed to create organization' });
  }
});

// ========================================
// PHASE 6: OAuth Integration Routes
// Figma, Slack, GitHub integrations
// ========================================

// Get OAuth authorization URL (initiate OAuth flow)
app.get('/integrations/:provider/auth', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user.id;

    const { url, stateToken } = await oauthManager.getAuthorizationURL(provider, userId);

    res.json({
      authorizationUrl: url,
      stateToken,
      provider
    });
  } catch (error) {
    console.error(`OAuth init error (${req.params.provider}):`, error);
    res.status(500).json({ message: error.message });
  }
});

// OAuth callback handler (GET - for direct browser redirects)
app.get('/integrations/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ message: 'Missing OAuth code or state' });
    }

    const result = await oauthManager.handleCallback(provider, code, state);

    // Redirect to frontend callback page
    res.redirect(`https://fluxstudio.art/auth/callback/${provider}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
  } catch (error) {
    console.error(`OAuth callback error (${req.params.provider}):`, error);
    res.redirect(`https://fluxstudio.art/auth/callback/${provider}?error=${encodeURIComponent(error.message)}`);
  }
});

// OAuth callback handler (POST - for frontend OAuth callback page)
app.post('/integrations/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: 'Missing OAuth code or state'
      });
    }

    const result = await oauthManager.handleCallback(provider, code, state);

    const providerData = result.userInfo || {};
    const permissions = providerData.scope || [];

    res.json({
      success: true,
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} integration successful`,
      data: {
        provider,
        permissions: Array.isArray(permissions) ? permissions : permissions.split ? permissions.split(' ') : [],
        accountName: providerData.name || providerData.username || providerData.email || null
      }
    });
  } catch (error) {
    console.error(`OAuth callback error (${req.params.provider}):`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'OAuth callback failed'
    });
  }
});

// Get user's active integrations
app.get('/integrations', authenticateToken, async (req, res) => {
  try {
    const integrations = await oauthManager.getUserIntegrations(req.user.id);
    res.json({ integrations });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ message: 'Error retrieving integrations' });
  }
});

// Disconnect an integration
app.delete('/integrations/:provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    await oauthManager.disconnectIntegration(req.user.id, provider);

    res.json({
      message: `${provider} integration disconnected successfully`,
      provider
    });
  } catch (error) {
    console.error(`Disconnect integration error (${req.params.provider}):`, error);
    res.status(500).json({ message: error.message });
  }
});

// ========================================
// Figma Integration Routes
// ========================================

// Get Figma files for authenticated user
app.get('/integrations/figma/files', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'figma');
    const FigmaService = require('./src/services/figmaService').default;
    const figma = new FigmaService(accessToken);

    const me = await figma.getMe();
    const teamId = me.teams && me.teams.length > 0 ? me.teams[0].id : null;

    if (!teamId) {
      return res.json({ projects: [], files: [] });
    }

    const projects = await figma.getTeamProjects(teamId);

    res.json({
      teamId,
      projects,
      user: {
        id: me.id,
        email: me.email,
        handle: me.handle
      }
    });
  } catch (error) {
    console.error('Figma files error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get Figma file details
app.get('/integrations/figma/files/:fileKey', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'figma');
    const FigmaService = require('./src/services/figmaService').default;
    const figma = new FigmaService(accessToken);

    const file = await figma.getFile(req.params.fileKey);

    res.json(file);
  } catch (error) {
    console.error('Figma file details error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get Figma file comments
app.get('/integrations/figma/comments/:fileKey', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'figma');
    const FigmaService = require('./src/services/figmaService').default;
    const figma = new FigmaService(accessToken);

    const comments = await figma.getComments(req.params.fileKey);

    res.json({ comments });
  } catch (error) {
    console.error('Figma comments error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Figma webhook endpoint
app.post('/integrations/figma/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-figma-signature'];
    const webhookSecret = process.env.FIGMA_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const FigmaService = require('./src/services/figmaService').default;
      const isValid = FigmaService.verifyWebhookSignature(
        JSON.stringify(req.body),
        signature,
        webhookSecret
      );

      if (!isValid) {
        return res.status(401).json({ message: 'Invalid webhook signature' });
      }
    }

    const FigmaService = require('./src/services/figmaService').default;
    const webhook = FigmaService.parseWebhook(req.body);

    console.log('Figma webhook received:', webhook);

    // Store webhook in database for processing
    await query(
      `INSERT INTO integration_webhooks (provider, event_type, event_id, payload, ip_address, signature_valid)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'figma',
        webhook.event_type,
        webhook.timestamp,
        JSON.stringify(req.body),
        req.ip,
        !!webhookSecret && !!signature
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Figma webhook error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ========================================
// Slack Integration Routes
// ========================================

// Get Slack channels
app.get('/integrations/slack/channels', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'slack');
    const SlackService = require('./src/services/slackService').default;
    const slack = new SlackService(accessToken);

    const channels = await slack.listChannels(true);

    res.json({ channels });
  } catch (error) {
    console.error('Slack channels error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Post message to Slack channel
app.post('/integrations/slack/message', authenticateToken, async (req, res) => {
  try {
    const { channel, text, blocks } = req.body;

    if (!channel || !text) {
      return res.status(400).json({ message: 'Channel and text are required' });
    }

    const accessToken = await oauthManager.getAccessToken(req.user.id, 'slack');
    const SlackService = require('./src/services/slackService').default;
    const slack = new SlackService(accessToken);

    const message = await slack.postMessage(channel, text, { blocks });

    res.json({ message });
  } catch (error) {
    console.error('Slack post message error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Send project update to Slack
app.post('/integrations/slack/project-update', authenticateToken, async (req, res) => {
  try {
    const { channel, projectName, updateType, details } = req.body;

    if (!channel || !projectName || !updateType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const accessToken = await oauthManager.getAccessToken(req.user.id, 'slack');
    const SlackService = require('./src/services/slackService').default;
    const slack = new SlackService(accessToken);

    const message = await slack.sendProjectUpdate(channel, projectName, updateType, details);

    res.json({ message });
  } catch (error) {
    console.error('Slack project update error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Slack webhook endpoint
app.post('/integrations/slack/webhook', async (req, res) => {
  try {
    const SlackService = require('./src/services/slackService').default;

    // Handle URL verification challenge
    const challenge = SlackService.handleChallenge(req.body);
    if (challenge) {
      return res.json({ challenge });
    }

    // Verify webhook signature
    const signature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];
    const webhookSecret = process.env.SLACK_SIGNING_SECRET;

    if (webhookSecret && signature && timestamp) {
      const isValid = SlackService.verifyWebhookSignature(
        webhookSecret,
        timestamp,
        JSON.stringify(req.body),
        signature
      );

      if (!isValid) {
        return res.status(401).json({ message: 'Invalid webhook signature' });
      }
    }

    const webhook = SlackService.parseWebhook(req.body);

    console.log('Slack webhook received:', webhook);

    // Store webhook in database for processing
    await query(
      `INSERT INTO integration_webhooks (provider, event_type, payload, ip_address, signature_valid)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'slack',
        webhook.type,
        JSON.stringify(req.body),
        req.ip,
        !!webhookSecret && !!signature
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Slack webhook error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ========================================
// GitHub Integration Routes
// ========================================

// Get GitHub repositories for authenticated user
app.get('/integrations/github/repositories', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { type, sort, direction, per_page } = req.query;

    const { data } = await octokit.repos.listForAuthenticatedUser({
      type: type || 'owner',
      sort: sort || 'updated',
      direction: direction || 'desc',
      per_page: per_page ? parseInt(per_page) : 30
    });

    res.json({ repositories: data });
  } catch (error) {
    console.error('GitHub repositories error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single GitHub repository
app.get('/integrations/github/repositories/:owner/:repo', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo } = req.params;

    const { data } = await octokit.repos.get({ owner, repo });

    res.json(data);
  } catch (error) {
    console.error('GitHub repository error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get GitHub issues for a repository
app.get('/integrations/github/repositories/:owner/:repo/issues', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo } = req.params;
    const { state, labels, sort, direction, per_page } = req.query;

    const { data } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: state || 'open',
      labels,
      sort: sort || 'created',
      direction: direction || 'desc',
      per_page: per_page ? parseInt(per_page) : 30
    });

    res.json({ issues: data });
  } catch (error) {
    console.error('GitHub issues error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single GitHub issue
app.get('/integrations/github/repositories/:owner/:repo/issues/:issue_number', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo, issue_number } = req.params;

    const { data } = await octokit.issues.get({
      owner,
      repo,
      issue_number: parseInt(issue_number)
    });

    res.json(data);
  } catch (error) {
    console.error('GitHub issue error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create GitHub issue
app.post('/integrations/github/repositories/:owner/:repo/issues', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo } = req.params;
    const { title, body, labels, assignees } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Issue title is required' });
    }

    const { data } = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
      assignees
    });

    res.json(data);
  } catch (error) {
    console.error('GitHub create issue error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update GitHub issue
app.patch('/integrations/github/repositories/:owner/:repo/issues/:issue_number', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo, issue_number } = req.params;
    const { title, body, state, labels, assignees } = req.body;

    const { data } = await octokit.issues.update({
      owner,
      repo,
      issue_number: parseInt(issue_number),
      title,
      body,
      state,
      labels,
      assignees
    });

    res.json(data);
  } catch (error) {
    console.error('GitHub update issue error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add comment to GitHub issue
app.post('/integrations/github/repositories/:owner/:repo/issues/:issue_number/comments', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo, issue_number } = req.params;
    const { body } = req.body;

    if (!body) {
      return res.status(400).json({ message: 'Comment body is required' });
    }

    const { data } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: parseInt(issue_number),
      body
    });

    res.json(data);
  } catch (error) {
    console.error('GitHub add comment error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get GitHub pull requests for a repository
app.get('/integrations/github/repositories/:owner/:repo/pulls', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo } = req.params;
    const { state, sort, direction, per_page } = req.query;

    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state: state || 'open',
      sort: sort || 'created',
      direction: direction || 'desc',
      per_page: per_page ? parseInt(per_page) : 30
    });

    res.json({ pulls: data });
  } catch (error) {
    console.error('GitHub pull requests error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get GitHub commits for a repository
app.get('/integrations/github/repositories/:owner/:repo/commits', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo } = req.params;
    const { sha, path, per_page } = req.query;

    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      sha,
      path,
      per_page: per_page ? parseInt(per_page) : 30
    });

    res.json({ commits: data });
  } catch (error) {
    console.error('GitHub commits error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get GitHub branches for a repository
app.get('/integrations/github/repositories/:owner/:repo/branches', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo } = req.params;

    const { data } = await octokit.repos.listBranches({ owner, repo });

    const branches = data.map(branch => ({
      name: branch.name,
      protected: branch.protected
    }));

    res.json({ branches });
  } catch (error) {
    console.error('GitHub branches error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get GitHub repository collaborators
app.get('/integrations/github/repositories/:owner/:repo/collaborators', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo } = req.params;

    const { data } = await octokit.repos.listCollaborators({ owner, repo });

    const collaborators = data.map(collab => ({
      login: collab.login,
      avatar_url: collab.avatar_url,
      permissions: collab.permissions || { admin: false, push: false, pull: false }
    }));

    res.json({ collaborators });
  } catch (error) {
    console.error('GitHub collaborators error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Link GitHub repository to FluxStudio project
app.post('/integrations/github/repositories/:owner/:repo/link', authenticateToken, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    // Verify access token exists
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'github');

    // Get project and verify user has access
    const projects = await getProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = projects[projectIndex].members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Store GitHub repository link metadata
    if (!projects[projectIndex].githubMetadata) {
      projects[projectIndex].githubMetadata = {};
    }

    projects[projectIndex].githubMetadata = {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      linkedAt: new Date().toISOString(),
      linkedBy: req.user.id
    };

    await saveProjects(projects);

    res.json({
      message: 'Repository linked successfully',
      project: projects[projectIndex]
    });
  } catch (error) {
    console.error('GitHub link repository error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get authenticated GitHub user
app.get('/integrations/github/user', authenticateToken, async (req, res) => {
  try {
    const accessToken = await oauthManager.getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { data } = await octokit.users.getAuthenticated();

    res.json({
      login: data.login,
      name: data.name,
      email: data.email,
      avatar_url: data.avatar_url,
      bio: data.bio,
      public_repos: data.public_repos
    });
  } catch (error) {
    console.error('GitHub user error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GitHub webhook endpoint for issue synchronization
app.post('/integrations/github/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    const event = req.headers['x-github-event'];

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

      if (signature !== digest) {
        return res.status(401).json({ message: 'Invalid webhook signature' });
      }
    }

    console.log('GitHub webhook received:', {
      event,
      action: req.body.action,
      repository: req.body.repository?.full_name
    });

    // Store webhook in database for async processing
    await query(
      `INSERT INTO integration_webhooks (provider, event_type, payload, ip_address, signature_valid)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'github',
        event,
        JSON.stringify(req.body),
        req.ip,
        !!webhookSecret && !!signature
      ]
    );

    // Respond immediately to GitHub
    res.json({ success: true });

    // Process webhook asynchronously
    if (githubSyncService && event === 'issues') {
      console.log(`GitHub issue ${req.body.action}: ${req.body.issue?.title}`);

      setImmediate(async () => {
        try {
          await githubSyncService.processWebhookEvent(req.body);
          console.log('✅ GitHub issue webhook processed successfully');
        } catch (error) {
          console.error('❌ Error processing GitHub issue webhook:', error);
        }
      });
    }
  } catch (error) {
    console.error('GitHub webhook error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GitHub Sync API Endpoints

// Manually trigger sync for a specific repository link
app.post('/integrations/github/sync/:linkId', authenticateToken, async (req, res) => {
  try {
    if (!githubSyncService) {
      return res.status(503).json({
        message: 'GitHub Sync Service not available (requires database mode)'
      });
    }

    const { linkId } = req.params;

    const result = await githubSyncService.syncIssuesFromGitHub(linkId);

    res.json({
      message: 'Sync completed successfully',
      ...result
    });
  } catch (error) {
    console.error('GitHub manual sync error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Start auto-sync
app.post('/integrations/github/sync/start', authenticateToken, async (req, res) => {
  try {
    if (!githubSyncService) {
      return res.status(503).json({
        message: 'GitHub Sync Service not available (requires database mode)'
      });
    }

    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    githubSyncService.startAutoSync();

    res.json({
      message: 'Auto-sync started successfully',
      interval: githubSyncService.syncInterval
    });
  } catch (error) {
    console.error('GitHub start auto-sync error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Stop auto-sync
app.post('/integrations/github/sync/stop', authenticateToken, async (req, res) => {
  try {
    if (!githubSyncService) {
      return res.status(503).json({
        message: 'GitHub Sync Service not available (requires database mode)'
      });
    }

    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    githubSyncService.stopAutoSync();

    res.json({
      message: 'Auto-sync stopped successfully'
    });
  } catch (error) {
    console.error('GitHub stop auto-sync error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get sync status for a repository link
app.get('/integrations/github/sync/status/:linkId', authenticateToken, async (req, res) => {
  try {
    if (!githubSyncService) {
      return res.status(503).json({
        message: 'GitHub Sync Service not available (requires database mode)'
      });
    }

    const { linkId } = req.params;
    const link = await githubSyncService.getRepositoryLink(linkId);

    if (!link) {
      return res.status(404).json({ message: 'Repository link not found' });
    }

    res.json({
      link: {
        id: link.id,
        owner: link.owner,
        repo: link.repo,
        fullName: link.full_name,
        syncStatus: link.sync_status,
        lastSyncedAt: link.last_synced_at,
        lastError: link.last_error,
        autoCreateTasks: link.auto_create_tasks,
        syncIssues: link.sync_issues
      },
      isAutoSyncRunning: githubSyncService.isRunning
    });
  } catch (error) {
    console.error('GitHub sync status error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ========================================
// PHASE 7: MCP Routes
// Model Context Protocol for natural language database queries
// ========================================

// Execute natural language database query
app.post('/mcp/query', authenticateToken, async (req, res) => {
  try {
    const { query: naturalLanguageQuery } = req.body;

    if (!naturalLanguageQuery) {
      return res.status(400).json({ message: 'Query is required' });
    }

    if (!mcpInitialized) {
      return res.status(503).json({
        message: 'MCP service not available',
        fallback: 'Try using direct SQL queries instead'
      });
    }

    const result = await mcpManager.queryDatabase(naturalLanguageQuery, req.user.id);

    res.json(result);
  } catch (error) {
    console.error('MCP query error:', error);
    res.status(500).json({ message: error.message });
  }
});

// List available MCP tools
app.get('/mcp/tools', authenticateToken, async (req, res) => {
  try {
    if (!mcpInitialized) {
      return res.json({ tools: {}, available: false });
    }

    const tools = mcpManager.listTools();

    res.json({ tools, available: true });
  } catch (error) {
    console.error('MCP list tools error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Clear MCP query cache
app.post('/mcp/cache/clear', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    if (!mcpInitialized) {
      return res.status(503).json({ message: 'MCP service not available' });
    }

    mcpManager.clearCache();

    res.json({ message: 'MCP cache cleared successfully' });
  } catch (error) {
    console.error('MCP cache clear error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'unified-backend',
    timestamp: new Date().toISOString(),
    services: ['auth', 'messaging'],
    port: PORT,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Health check endpoint with /api prefix for DigitalOcean App Platform
// DO ingress prepends /api to health check path
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'unified-backend',
    timestamp: new Date().toISOString(),
    services: ['auth', 'messaging'],
    port: PORT,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Debug endpoint to check database tables
app.get('/admin/db-status', async (req, res) => {
  try {
    const { query } = require('./lib/db');

    // Get all tables
    const tables = await query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    // Check for essential tables
    const tableNames = tables.rows.map(r => r.tablename);
    const essentialTables = ['users', 'refresh_tokens', 'security_events', 'organizations', 'projects'];
    const missingTables = essentialTables.filter(t => !tableNames.includes(t));

    res.json({
      status: missingTables.length === 0 ? 'complete' : 'incomplete',
      totalTables: tableNames.length,
      tables: tableNames,
      essentialTables: {
        present: essentialTables.filter(t => tableNames.includes(t)),
        missing: missingTables
      }
    });

  } catch (err) {
    res.status(500).json({
      error: 'Failed to check database status',
      message: err.message
    });
  }
});

// Database initialization endpoint (idempotent - safe to call multiple times)
app.post('/admin/init-database', async (req, res) => {
  try {
    const { query } = require('./lib/db');

    console.log('🔍 Checking database status...');

    // Get current tables
    const currentTables = await query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    const tableNames = currentTables.rows.map(r => r.tablename);
    const hasUsers = tableNames.includes('users');

    // Force mode: allow init with special header
    const forceInit = req.headers['x-force-init'] === 'true';

    // Simple auth: require JWT_SECRET if tables exist (unless forcing)
    const authHeader = req.headers['x-admin-secret'];
    const isAuthorized = (authHeader === JWT_SECRET) || !hasUsers || forceInit;

    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Database already initialized. JWT_SECRET required for re-initialization.',
        currentTables: tableNames
      });
    }

    console.log('🚀 Running database initialization...');
    console.log(`📊 Current tables: ${tableNames.length}`);

    // Read and execute additive migration SQL (works with existing schemas)
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, 'database', 'add-missing-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Using additive migration: add-missing-tables.sql');

    // Execute SQL
    await query(sql);

    console.log('✅ Database initialization completed');

    // Verify tables after init
    const finalTables = await query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    const finalTableNames = finalTables.rows.map(r => r.tablename);

    res.json({
      success: true,
      message: 'Database initialized successfully',
      beforeInit: {
        tableCount: tableNames.length,
        tables: tableNames
      },
      afterInit: {
        tableCount: finalTableNames.length,
        tables: finalTableNames
      },
      tablesCreated: finalTableNames.filter(t => !tableNames.includes(t))
    });

  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    res.status(500).json({
      error: 'Database initialization failed',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Import health check module
const { createHealthCheck, authHealthChecks, messagingHealthChecks } = require('./health-check');

// Combine health checks from both services
const unifiedHealthChecks = {
  ...authHealthChecks,
  ...messagingHealthChecks
};

app.use(createHealthCheck({
  serviceName: 'unified-backend',
  port: PORT,
  customChecks: unifiedHealthChecks
}));

// Note: All routes from server-auth.js and server-messaging.js would be extracted here
// For brevity, I'm importing the socket handlers separately

// Socket.IO namespace handlers
require('./sockets/auth-socket')(authNamespace, performanceMonitor, authAdapter);
require('./sockets/messaging-socket')(messagingNamespace, createMessage, getMessages, getChannels, messagingAdapter, JWT_SECRET);
require('./sockets/printing-socket')(printingNamespace, JWT_SECRET); // Phase 3A + Security: Real-time printing updates with JWT auth

// ============================================================================
// FluxPrint Integration - 3D Printing Proxy Layer (Phase 1 + Phase 2.5)
// ============================================================================
// Proxies requests to FluxPrint microservice running on localhost:5001
// Enables seamless 3D printing capabilities within FluxStudio workflow
// Phase 2.5: Database integration for print job logging and project linking

const FLUXPRINT_URL = process.env.FLUXPRINT_SERVICE_URL || 'http://localhost:5001';
const FLUXPRINT_ENABLED = process.env.FLUXPRINT_ENABLED === 'true';

// Validate FluxPrint URL on startup
if (FLUXPRINT_ENABLED) {
  try {
    const fluxPrintUrl = new URL(FLUXPRINT_URL);

    // Validate protocol
    if (!['http:', 'https:'].includes(fluxPrintUrl.protocol)) {
      throw new Error(`Invalid protocol: ${fluxPrintUrl.protocol}. Must be http: or https:`);
    }

    // Validate hostname
    if (!fluxPrintUrl.hostname) {
      throw new Error('FluxPrint URL must include a hostname');
    }

    // Warn about localhost in production
    if (process.env.NODE_ENV === 'production' && fluxPrintUrl.hostname === 'localhost') {
      console.warn('⚠️  WARNING: FluxPrint is configured to use localhost in production environment');
    }

    console.log(`✅ FluxPrint URL validated: ${FLUXPRINT_URL}`);
  } catch (error) {
    console.error('❌ FLUXPRINT_SERVICE_URL validation failed:', error.message);
    console.error('   FluxPrint features will be disabled');
    // Don't crash the server, just disable the feature
    process.env.FLUXPRINT_ENABLED = 'false';
  }
}

// Import print job logger service (Phase 2.5)
const printJobLogger = require('./services/printJobLogger');

// Middleware to check if FluxPrint service is enabled
const checkFluxPrintEnabled = (req, res, next) => {
  if (!FLUXPRINT_ENABLED) {
    return res.status(503).json({
      error: 'FluxPrint service is not enabled',
      message: 'Set FLUXPRINT_ENABLED=true in environment configuration'
    });
  }
  next();
};

// Helper function to proxy requests to FluxPrint
const proxyToFluxPrint = async (req, res, endpoint, method = 'GET', options = {}) => {
  try {
    const url = `${FLUXPRINT_URL}${endpoint}`;
    const config = {
      method,
      url,
      headers: {
        ...req.headers,
        host: new URL(FLUXPRINT_URL).host,
      },
      params: req.query,
      timeout: options.timeout || 30000,
      validateStatus: () => true, // Don't throw on any status
    };

    // Add request body for POST/PUT requests
    if (method !== 'GET' && method !== 'DELETE') {
      config.data = req.body;
    }

    // Handle multipart form data
    if (options.multipart) {
      config.headers['content-type'] = req.headers['content-type'];
      config.data = req.body;
    }

    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`FluxPrint proxy error [${endpoint}]:`, error.message);

    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({
        error: 'FluxPrint service unavailable',
        message: 'Unable to connect to FluxPrint service. Please ensure it is running on port 5001.'
      });
    } else if (error.code === 'ETIMEDOUT') {
      res.status(504).json({
        error: 'FluxPrint service timeout',
        message: 'The request to FluxPrint service timed out.'
      });
    } else {
      res.status(500).json({
        error: 'Proxy error',
        message: error.message
      });
    }
  }
};

// Get printer status
app.get('/api/printing/status', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, '/api/printer/status');
});

// Get current print job
app.get('/api/printing/job', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, '/api/job');
});

// Get print queue
app.get('/api/printing/queue', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, '/api/queue');
});

// Add job to print queue (with database logging)
app.post('/api/printing/queue', printRateLimit, checkFluxPrintEnabled, authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { project_id } = req.body;

    // If project_id is provided, check permissions
    if (project_id) {
      const projectAccessQuery = await query(`
        SELECT p.id, p."clientId" as owner_id, pm.role
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
        WHERE p.id = $1 AND p.deleted_at IS NULL
      `, [project_id, userId]);

      if (projectAccessQuery.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = projectAccessQuery.rows[0];
      const isOwner = project.owner_id === userId;
      const memberRole = project.role;
      const canPrint = isOwner || memberRole === 'manager' || memberRole === 'editor';

      if (!canPrint) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You need owner, manager, or editor role to queue print jobs'
        });
      }
    }

    // Proxy request to FluxPrint
    const response = await axios.post(`${FLUXPRINT_URL}/api/queue`, req.body, {
      headers: { ...req.headers, host: new URL(FLUXPRINT_URL).host },
      timeout: 30000,
      validateStatus: () => true,
    });

    // If successful, log to database
    if (response.status === 200 || response.status === 201) {
      try {
        const { file_name, project_id, file_id, metadata } = req.body;
        const fluxprintQueueId = response.data?.queue_id || response.data?.id;

        await printJobLogger.createPrintJob({
          file_name,
          fluxprint_queue_id: fluxprintQueueId,
          project_id: project_id || null,
          file_id: file_id || null,
          metadata: metadata || {},
        });
      } catch (logError) {
        // Log error but don't fail the request
        console.error('Failed to log print job:', logError.message);
      }
    }

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('FluxPrint queue POST error:', error.message);
    res.status(500).json({ error: 'Failed to add job to queue', message: error.message });
  }
});

// Remove job from print queue
app.delete('/api/printing/queue/:id', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, `/api/queue/${req.params.id}`, 'DELETE');
});

// Reorder print queue
app.post('/api/printing/queue/reorder', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, '/api/queue/reorder', 'POST');
});

// Start specific job from queue
app.post('/api/printing/queue/:id/start', checkFluxPrintEnabled, authenticateToken, async (req, res) => {
  // Starting a job requires authentication but not project-specific permissions
  // since the job was already authorized when added to the queue
  await proxyToFluxPrint(req, res, `/api/queue/${req.params.id}/start`, 'POST');
});

// Clear entire print queue
app.delete('/api/printing/queue', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, '/api/queue', 'DELETE');
});

// Get uploaded files list
app.get('/api/printing/files', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, '/api/files');
});

// Upload file for printing (with optional project linking)
app.post('/api/printing/files/upload', checkFluxPrintEnabled, authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const { project_id } = req.query;  // Optional project_id for auto-linking
    const userId = req.user.id;

    const formData = new FormData();

    // Add files to form data
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        formData.append('files', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype
        });
      });
    }

    const response = await axios.post(`${FLUXPRINT_URL}/api/files/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 60000, // 60 second timeout for file uploads
      validateStatus: () => true,
    });

    // If project_id provided and upload successful, auto-link files
    if (project_id && response.status === 200 && req.files && req.files.length > 0) {
      try {
        // Verify user has access to project
        const hasAccess = await canUserAccessProject(userId, project_id);

        if (hasAccess) {
          const { createId } = require('@paralleldrive/cuid2');

          // Link each uploaded file to the project
          for (const file of req.files) {
            const filename = file.originalname;

            // Check if already linked
            const existingLink = await query(
              'SELECT id FROM printing_files WHERE filename = $1 AND project_id = $2',
              [filename, project_id]
            );

            if (existingLink.rows.length === 0) {
              // Create new link
              await query(`
                INSERT INTO printing_files (
                  id, project_id, filename, file_size, uploaded_by
                ) VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (project_id, filename) DO NOTHING
              `, [
                createId(),
                project_id,
                filename,
                file.size,
                userId
              ]);
            }
          }

          // Add project_id to response
          response.data.linked_to_project = project_id;
        }
      } catch (linkError) {
        console.error('Auto-link error (non-fatal):', linkError.message);
        // Don't fail upload if linking fails
      }
    }

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('FluxPrint file upload error:', error.message);
    res.status(500).json({
      error: 'File upload failed',
      message: error.message
    });
  }
});

// Delete file
app.delete('/api/printing/files/:filename', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, `/api/files/${req.params.filename}`, 'DELETE');
});

// Get temperature data
app.get('/api/printing/temperature', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, '/api/printer/temperature');
});

// Proxy MJPEG camera stream
app.get('/api/printing/camera/stream', checkFluxPrintEnabled, async (req, res) => {
  try {
    const response = await axios({
      method: 'GET',
      url: `${FLUXPRINT_URL}/api/camera/stream`,
      responseType: 'stream',
      timeout: 0, // No timeout for streaming
    });

    // Set headers for MJPEG stream
    res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Pipe the stream
    response.data.pipe(res);

    // Handle stream errors
    response.data.on('error', (error) => {
      console.error('Camera stream error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Camera stream error' });
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      response.data.destroy();
    });
  } catch (error) {
    console.error('FluxPrint camera stream error:', error.message);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Camera stream unavailable',
        message: error.message
      });
    }
  }
});

// ============================================================================
// FluxPrint Database Integration - Print Job Management (Phase 2.5)
// ============================================================================

// Get active print jobs
app.get('/api/printing/jobs/active', async (req, res) => {
  try {
    const activeJobs = await printJobLogger.getActiveJobs();
    res.json(activeJobs);
  } catch (error) {
    console.error('Failed to get active jobs:', error.message);
    res.status(500).json({ error: 'Failed to get active jobs', message: error.message });
  }
});

// Get print job history
app.get('/api/printing/jobs/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const history = await printJobLogger.getJobHistory(limit);
    res.json(history);
  } catch (error) {
    console.error('Failed to get job history:', error.message);
    res.status(500).json({ error: 'Failed to get job history', message: error.message });
  }
});

// Get print statistics for a project
app.get('/api/printing/projects/:projectId/stats', async (req, res) => {
  try {
    const { projectId } = req.params;
    const stats = await printJobLogger.getProjectStats(projectId);
    res.json(stats || { message: 'No print jobs found for this project' });
  } catch (error) {
    console.error('Failed to get project stats:', error.message);
    res.status(500).json({ error: 'Failed to get project stats', message: error.message });
  }
});

// Link a print job to a project
app.post('/api/printing/jobs/:jobId/link', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { project_id, file_id } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    const linked = await printJobLogger.linkToProject(jobId, project_id, file_id);
    if (linked) {
      res.json({ success: true, job: linked });
    } else {
      res.status(404).json({ error: 'Print job not found' });
    }
  } catch (error) {
    console.error('Failed to link job to project:', error.message);
    res.status(500).json({ error: 'Failed to link job to project', message: error.message });
  }
});

// Update print job status manually
app.patch('/api/printing/jobs/:jobId/status', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, progress, error_message } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    await printJobLogger.updateJobStatus(jobId, status, progress, { error_message });

    // Calculate print time if job is completed
    if (status === 'completed') {
      await printJobLogger.calculatePrintTime(jobId);
    }

    res.json({ success: true, jobId, status });
  } catch (error) {
    console.error('Failed to update job status:', error.message);
    res.status(500).json({ error: 'Failed to update job status', message: error.message });
  }
});

// Sync job status from FluxPrint (useful for monitoring updates)
app.post('/api/printing/jobs/sync/:fluxprintQueueId', async (req, res) => {
  try {
    const { fluxprintQueueId } = req.params;
    const { status, progress } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const updated = await printJobLogger.updateJobByFluxPrintId(
      parseInt(fluxprintQueueId),
      status,
      progress
    );

    if (updated) {
      // Calculate print time if job is completed
      if (status === 'completed') {
        await printJobLogger.calculatePrintTime(updated.id);
      }
      res.json({ success: true, job: updated });
    } else {
      res.status(404).json({ error: 'Print job not found' });
    }
  } catch (error) {
    console.error('Failed to sync job status:', error.message);
    res.status(500).json({ error: 'Failed to sync job status', message: error.message });
  }
});

// Get print job by ID
app.get('/api/printing/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await query('SELECT * FROM print_jobs WHERE id = $1', [jobId]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Print job not found' });
    }
  } catch (error) {
    console.error('Failed to get print job:', error.message);
    res.status(500).json({ error: 'Failed to get print job', message: error.message });
  }
});

// ============================================================================
// Phase 3D: Project-File Association Endpoints
// ============================================================================

/**
 * Helper function: Check if user can access project
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID
 * @returns {Promise<boolean>} - True if user has access
 */
async function canUserAccessProject(userId, projectId) {
  try {
    const result = await query(`
      SELECT p.id
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = $1
        AND (p."clientId" = $2 OR pm.user_id = $2)
        AND p.deleted_at IS NULL
      LIMIT 1
    `, [projectId, userId]);

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking project access:', error);
    return false;
  }
}

/**
 * Link a file to a project
 * POST /api/printing/files/:filename/link
 */
app.post('/api/printing/files/:filename/link', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const { project_id, file_id, metadata, notes } = req.body;
    const userId = req.user.id;

    // Validation
    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    // Sanitize filename to prevent path traversal
    if (filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Check project access
    const hasAccess = await canUserAccessProject(userId, project_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to access this project' });
    }

    // Check if file already linked to a different project
    const existingLink = await query(
      'SELECT id, project_id FROM printing_files WHERE filename = $1',
      [filename]
    );

    if (existingLink.rows.length > 0) {
      const existing = existingLink.rows[0];
      if (existing.project_id !== project_id) {
        return res.status(409).json({
          error: 'File already linked to another project',
          linked_to: existing.project_id
        });
      }
      // Already linked to this project
      return res.status(200).json({
        success: true,
        message: 'File already linked to this project',
        file: existing
      });
    }

    // Create the link
    const { createId } = require('@paralleldrive/cuid2');
    const fileRecordId = createId();

    const result = await query(`
      INSERT INTO printing_files (
        id, project_id, file_id, filename, uploaded_by, metadata, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      fileRecordId,
      project_id,
      file_id || null,
      filename,
      userId,
      metadata ? JSON.stringify(metadata) : '{}',
      notes || null
    ]);

    res.status(201).json({
      success: true,
      file: result.rows[0]
    });
  } catch (error) {
    console.error('Failed to link file to project:', error);
    res.status(500).json({
      error: 'Failed to link file to project',
      message: error.message
    });
  }
});

/**
 * Unlink a file from a project
 * DELETE /api/printing/files/:filename/link
 */
app.delete('/api/printing/files/:filename/link', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const { project_id } = req.query;
    const userId = req.user.id;

    // Sanitize filename
    if (filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Get the current link
    const existingLink = await query(
      'SELECT id, project_id FROM printing_files WHERE filename = $1',
      [filename]
    );

    if (existingLink.rows.length === 0) {
      return res.status(404).json({ error: 'File link not found' });
    }

    const linkedProjectId = existingLink.rows[0].project_id;

    // Verify project_id if provided
    if (project_id && linkedProjectId !== project_id) {
      return res.status(400).json({ error: 'File is not linked to the specified project' });
    }

    // Check project access
    const hasAccess = await canUserAccessProject(userId, linkedProjectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to modify this project' });
    }

    // Delete the link
    await query('DELETE FROM printing_files WHERE filename = $1', [filename]);

    res.json({
      success: true,
      message: 'File unlinked from project'
    });
  } catch (error) {
    console.error('Failed to unlink file:', error);
    res.status(500).json({
      error: 'Failed to unlink file',
      message: error.message
    });
  }
});

/**
 * Get files for a project
 * GET /api/printing/projects/:projectId/files
 */
app.get('/api/printing/projects/:projectId/files', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    // Check project access
    const hasAccess = await canUserAccessProject(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to view this project' });
    }

    // Get files with print statistics
    const result = await query(`
      SELECT
        pf.*,
        u.email as uploaded_by_email,
        COUNT(pj.id) as print_count,
        MAX(pj.completed_at) as last_printed,
        SUM(pj.material_used) FILTER (WHERE pj.status = 'completed') as total_material_used
      FROM printing_files pf
      LEFT JOIN users u ON pf.uploaded_by = u.id
      LEFT JOIN print_jobs pj ON pf.filename = pj.file_name AND pj.project_id = pf.project_id
      WHERE pf.project_id = $1
      GROUP BY pf.id, u.email
      ORDER BY pf.upload_date DESC
      LIMIT $2 OFFSET $3
    `, [projectId, limit, offset]);

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM printing_files WHERE project_id = $1',
      [projectId]
    );

    res.json({
      files: result.rows,
      total_files: parseInt(countResult.rows[0].count),
      limit,
      offset
    });
  } catch (error) {
    console.error('Failed to get project files:', error);
    res.status(500).json({
      error: 'Failed to get project files',
      message: error.message
    });
  }
});

/**
 * Enhanced project stats (extends existing endpoint)
 * GET /api/printing/projects/:projectId/stats/detailed
 */
app.get('/api/printing/projects/:projectId/stats/detailed', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Check project access
    const hasAccess = await canUserAccessProject(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to view this project' });
    }

    // Get detailed stats from view
    const result = await query(
      'SELECT * FROM project_print_stats_detailed WHERE project_id = $1',
      [projectId]
    );

    if (result.rows.length === 0) {
      return res.json({
        project_id: projectId,
        message: 'No printing activity for this project yet'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to get detailed project stats:', error);
    res.status(500).json({
      error: 'Failed to get detailed project stats',
      message: error.message
    });
  }
});

/**
 * Enhanced job history with project filtering
 * Extends existing /api/printing/jobs/history endpoint
 */
app.get('/api/printing/jobs/history/filter', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { project_id, limit = 100, offset = 0 } = req.query;

    let queryText = `
      SELECT
        pj.*,
        p.title as project_name,
        EXTRACT(EPOCH FROM (pj.completed_at - pj.started_at))::INTEGER as duration_seconds
      FROM print_jobs pj
      LEFT JOIN projects p ON pj.project_id = p.id
      WHERE (pj.completed_at IS NOT NULL OR pj.status IN ('failed', 'canceled'))
    `;

    const queryParams = [];
    let paramIndex = 1;

    // Add project filter if specified
    if (project_id) {
      // Verify user has access to this project
      const hasAccess = await canUserAccessProject(userId, project_id);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to view this project' });
      }

      queryText += ` AND pj.project_id = $${paramIndex}`;
      queryParams.push(project_id);
      paramIndex++;
    }

    queryText += ` ORDER BY COALESCE(pj.completed_at, pj.canceled_at, pj.created_at) DESC`;
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, queryParams);

    res.json(result.rows);
  } catch (error) {
    console.error('Failed to get filtered job history:', error);
    res.status(500).json({
      error: 'Failed to get filtered job history',
      message: error.message
    });
  }
});

// ============================================================================
// Phase 4A: Designer-First Quick Print API
// ============================================================================

/**
 * Quick Print Endpoint - Designer-friendly one-click printing
 * POST /api/printing/quick-print
 *
 * Simplified endpoint that handles:
 * 1. File validation
 * 2. Project access control
 * 3. Queue job with FluxPrint
 * 4. Create database record
 * 5. Link to project
 * 6. Return estimate
 */
app.post('/api/printing/quick-print', printRateLimit, csrfProtection, authenticateToken, async (req, res) => {
  try {
    const { filename, projectId, config } = req.body;
    const userId = req.user.id;

    // Validation
    if (!filename) {
      return res.status(400).json({ error: 'filename is required' });
    }

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    if (!config || !config.material || !config.quality) {
      return res.status(400).json({
        error: 'config with material and quality is required',
        example: {
          material: 'PLA',
          quality: 'standard',
          copies: 1,
          supports: false,
          infill: 20,
          notes: 'Optional notes'
        }
      });
    }

    // Check project access and role
    const projectAccessQuery = await query(`
      SELECT p.id, p."clientId" as owner_id, pm.role
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `, [projectId, userId]);

    if (projectAccessQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectAccessQuery.rows[0];
    const isOwner = project.owner_id === userId;
    const memberRole = project.role;

    // Check print permissions: owner, manager, or editor can print
    // Viewers cannot print
    const canPrint = isOwner || memberRole === 'manager' || memberRole === 'editor';

    if (!canPrint) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'You need owner, manager, or editor role to print files'
      });
    }

    // Sanitize filename to prevent path traversal
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Validate file is 3D printable
    const ext = filename.toLowerCase().split('.').pop();
    const printableExtensions = ['stl', 'obj', 'gltf', 'glb', 'gcode', '3mf'];
    if (!printableExtensions.includes(ext)) {
      return res.status(400).json({
        error: 'File type not supported for printing',
        supported: printableExtensions
      });
    }

    // Validate material and quality
    const validMaterials = ['PLA', 'PETG', 'ABS', 'TPU', 'NYLON'];
    const validQualities = ['draft', 'standard', 'high', 'ultra'];

    if (!validMaterials.includes(config.material)) {
      return res.status(400).json({
        error: 'Invalid material',
        valid: validMaterials
      });
    }

    if (!validQualities.includes(config.quality)) {
      return res.status(400).json({
        error: 'Invalid quality preset',
        valid: validQualities
      });
    }

    // Check project access
    const hasAccess = await canUserAccessProject(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'You do not have permission to access this project'
      });
    }

    // Check if file exists in FluxPrint
    try {
      const fileCheckResponse = await axios.get(`${FLUXPRINT_URL}/api/files`, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (fileCheckResponse.status === 200) {
        const files = fileCheckResponse.data.files || [];
        const fileExists = files.some(f => f === filename);

        if (!fileExists) {
          return res.status(404).json({
            error: 'File not found in print queue',
            message: 'Please upload the file first before printing'
          });
        }
      }
    } catch (fileCheckError) {
      console.error('File check error (non-fatal):', fileCheckError.message);
      // Continue anyway - FluxPrint queue will validate
    }

    // Queue job with FluxPrint
    const queuePayload = {
      file_name: filename,
      project_id: projectId,
      metadata: {
        material: config.material,
        quality: config.quality,
        copies: config.copies || 1,
        supports: config.supports || false,
        infill: config.infill || 20,
        notes: config.notes || '',
        queued_by: userId,
        queued_at: new Date().toISOString()
      }
    };

    const queueResponse = await axios.post(`${FLUXPRINT_URL}/api/queue`, queuePayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      validateStatus: () => true
    });

    if (queueResponse.status !== 200 && queueResponse.status !== 201) {
      return res.status(queueResponse.status).json({
        error: 'Failed to queue print job',
        message: queueResponse.data?.error || 'FluxPrint service error'
      });
    }

    const fluxprintQueueId = queueResponse.data?.queue_id || queueResponse.data?.id;

    // Create database record
    const { createId } = require('@paralleldrive/cuid2');
    const jobId = createId();

    await query(`
      INSERT INTO print_jobs (
        id,
        fluxprint_queue_id,
        file_name,
        project_id,
        status,
        progress,
        print_settings,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      jobId,
      fluxprintQueueId,
      filename,
      projectId,
      'queued',
      0,
      JSON.stringify({
        material: config.material,
        quality: config.quality,
        supports: config.supports,
        infill: config.infill
      }),
      JSON.stringify({
        copies: config.copies,
        notes: config.notes,
        queued_by: userId
      })
    ]);

    // Link file to project if not already linked
    try {
      const existingLink = await query(
        'SELECT id FROM printing_files WHERE filename = $1 AND project_id = $2',
        [filename, projectId]
      );

      if (existingLink.rows.length === 0) {
        await query(`
          INSERT INTO printing_files (
            id, project_id, filename, uploaded_by
          ) VALUES ($1, $2, $3, $4)
          ON CONFLICT (project_id, filename) DO NOTHING
        `, [
          createId(),
          projectId,
          filename,
          userId
        ]);
      }
    } catch (linkError) {
      console.error('File linking error (non-fatal):', linkError.message);
    }

    // Calculate estimate
    const materialCosts = {
      PLA: 0.02,
      PETG: 0.025,
      ABS: 0.022,
      TPU: 0.035,
      NYLON: 0.04
    };

    const qualityTimeMultipliers = {
      draft: 0.6,
      standard: 1.0,
      high: 1.4,
      ultra: 2.0
    };

    // Rough estimation (in production, use slicer API)
    const baseMaterialGrams = 50; // Placeholder
    const baseTimeHours = 3; // Placeholder
    const materialGrams = baseMaterialGrams * (config.copies || 1);
    const timeHours = baseTimeHours * qualityTimeMultipliers[config.quality] * (config.copies || 1);
    const materialCost = materialGrams * materialCosts[config.material];
    const totalCost = materialCost + 5; // $5 base print fee

    const estimate = {
      timeHours: Math.floor(timeHours),
      timeMinutes: Math.round((timeHours % 1) * 60),
      materialGrams,
      materialCost: parseFloat(materialCost.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      confidence: 'low' // Low until we integrate slicer
    };

    // Broadcast to project room via WebSocket
    const printingNamespace = req.app.get('printingNamespace');
    if (printingNamespace) {
      printingNamespace.to(`project:${projectId}`).emit('print:status-update', {
        fileId: jobId,
        filename,
        projectId,
        status: 'queued',
        progress: 0,
        estimate,
        queueId: fluxprintQueueId
      });
    }

    res.json({
      success: true,
      jobId,
      queueId: fluxprintQueueId,
      estimate,
      message: 'Print job queued successfully'
    });

  } catch (error) {
    console.error('Quick print error:', error.message);
    res.status(500).json({
      error: 'Failed to queue print job',
      message: error.message
    });
  }
});

/**
 * Print Estimate Endpoint
 * POST /api/printing/estimate
 *
 * Calculate print time and cost estimates before printing
 */
app.post('/api/printing/estimate', authenticateToken, async (req, res) => {
  try {
    const { filename, material, quality, copies = 1 } = req.body;

    // Validation
    if (!filename) {
      return res.status(400).json({ error: 'filename is required' });
    }

    if (!material) {
      return res.status(400).json({ error: 'material is required' });
    }

    if (!quality) {
      return res.status(400).json({ error: 'quality is required' });
    }

    const validMaterials = ['PLA', 'PETG', 'ABS', 'TPU', 'NYLON'];
    const validQualities = ['draft', 'standard', 'high', 'ultra'];

    if (!validMaterials.includes(material)) {
      return res.status(400).json({
        error: 'Invalid material',
        valid: validMaterials
      });
    }

    if (!validQualities.includes(quality)) {
      return res.status(400).json({
        error: 'Invalid quality preset',
        valid: validQualities
      });
    }

    // Material cost per gram
    const materialCosts = {
      PLA: 0.02,
      PETG: 0.025,
      ABS: 0.022,
      TPU: 0.035,
      NYLON: 0.04
    };

    // Quality time multipliers
    const qualityTimeMultipliers = {
      draft: 0.6,
      standard: 1.0,
      high: 1.4,
      ultra: 2.0
    };

    // Try to get accurate estimate from FluxPrint slicer API
    let estimate;
    try {
      const slicerResponse = await axios.post(
        `${FLUXPRINT_URL}/api/slicer/estimate`,
        { filename, quality },
        { timeout: 10000, validateStatus: () => true }
      );

      if (slicerResponse.status === 200 && slicerResponse.data) {
        const slicerData = slicerResponse.data;
        estimate = {
          timeHours: Math.floor(slicerData.print_time_minutes / 60),
          timeMinutes: Math.round(slicerData.print_time_minutes % 60),
          materialGrams: slicerData.filament_used_g * copies,
          materialCost: parseFloat((slicerData.filament_used_g * copies * materialCosts[material]).toFixed(2)),
          totalCost: parseFloat((slicerData.filament_used_g * copies * materialCosts[material] + 5).toFixed(2)),
          confidence: 'high'
        };
      } else {
        throw new Error('Slicer API unavailable');
      }
    } catch (slicerError) {
      console.log('Slicer API unavailable, using rough estimate');

      // Fallback: rough estimation based on file size
      const baseMaterialGrams = 50;
      const baseTimeHours = 3;
      const materialGrams = baseMaterialGrams * copies;
      const timeHours = baseTimeHours * qualityTimeMultipliers[quality] * copies;
      const materialCost = materialGrams * materialCosts[material];
      const totalCost = materialCost + 5;

      estimate = {
        timeHours: Math.floor(timeHours),
        timeMinutes: Math.round((timeHours % 1) * 60),
        materialGrams,
        materialCost: parseFloat(materialCost.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        confidence: 'low'
      };
    }

    res.json(estimate);

  } catch (error) {
    console.error('Estimate calculation error:', error.message);
    res.status(500).json({
      error: 'Failed to calculate estimate',
      message: error.message
    });
  }
});

/**
 * Get Project Files (with print status)
 * GET /api/projects/:projectId/files
 */
app.get('/api/projects/:projectId/files', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Check project access
    const hasAccess = await canUserAccessProject(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'You do not have permission to access this project'
      });
    }

    // Get files linked to project from database
    const result = await query(`
      SELECT
        pf.id,
        pf.filename as name,
        pf.file_size as size,
        pf.created_at as "uploadedAt",
        pf.uploaded_by as "uploadedBy",
        pj.status as "printStatus",
        pj.progress as "printProgress",
        pj.id as "printJobId"
      FROM printing_files pf
      LEFT JOIN print_jobs pj ON pf.filename = pj.file_name
        AND pj.project_id = pf.project_id
        AND pj.status IN ('queued', 'printing')
      WHERE pf.project_id = $1
      ORDER BY pf.created_at DESC
    `, [projectId]);

    // Add file type detection
    const files = result.rows.map(file => ({
      ...file,
      type: file.name ? file.name.split('.').pop()?.toLowerCase() : 'unknown',
      printStatus: file.printStatus || 'idle'
    }));

    res.json(files);

  } catch (error) {
    console.error('Failed to get project files:', error.message);
    res.status(500).json({
      error: 'Failed to get project files',
      message: error.message
    });
  }
});

/**
 * Upload Files to Project
 * POST /api/projects/:projectId/files/upload
 */
app.post('/api/projects/:projectId/files/upload',
  rateLimit,
  csrfProtection,
  authenticateToken,
  upload.array('files', 10),
  validateUploadedFiles,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      // Check project access
      const hasAccess = await canUserAccessProject(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'You do not have permission to access this project'
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      // Validate file sizes (max 100MB per file)
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      for (const file of req.files) {
        if (file.size > MAX_FILE_SIZE) {
          return res.status(400).json({
            error: 'File too large',
            filename: file.originalname,
            maxSize: '100MB'
          });
        }
      }

      // Validate file types (magic bytes check would be better)
      const allowedExtensions = [
        'stl', 'obj', 'gltf', 'glb', 'gcode', '3mf', // 3D files
        'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', // Images
        'pdf', 'doc', 'docx', 'txt', 'md' // Documents
      ];

      for (const file of req.files) {
        const ext = file.originalname.toLowerCase().split('.').pop();
        if (!allowedExtensions.includes(ext)) {
          return res.status(400).json({
            error: 'File type not allowed',
            filename: file.originalname,
            allowed: allowedExtensions
          });
        }
      }

      // Upload files to FluxPrint
      const formData = new FormData();
      req.files.forEach(file => {
        formData.append('files', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype
        });
      });

      const uploadResponse = await axios.post(
        `${FLUXPRINT_URL}/api/files/upload`,
        formData,
        {
          headers: { ...formData.getHeaders() },
          timeout: 60000,
          validateStatus: () => true
        }
      );

      if (uploadResponse.status !== 200) {
        return res.status(uploadResponse.status).json({
          error: 'File upload to FluxPrint failed',
          message: uploadResponse.data?.error || 'Unknown error'
        });
      }

      // Link files to project in database
      const { createId } = require('@paralleldrive/cuid2');
      const uploadedFiles = [];

      for (const file of req.files) {
        try {
          // Check if already linked
          const existingLink = await query(
            'SELECT id FROM printing_files WHERE filename = $1 AND project_id = $2',
            [file.originalname, projectId]
          );

          if (existingLink.rows.length === 0) {
            const fileId = createId();
            await query(`
              INSERT INTO printing_files (
                id, project_id, filename, file_size, uploaded_by
              ) VALUES ($1, $2, $3, $4, $5)
            `, [
              fileId,
              projectId,
              file.originalname,
              file.size,
              userId
            ]);

            uploadedFiles.push({
              id: fileId,
              name: file.originalname,
              size: file.size,
              type: file.originalname.split('.').pop()?.toLowerCase()
            });
          }
        } catch (linkError) {
          console.error('File link error:', linkError.message);
        }
      }

      res.json({
        success: true,
        files: uploadedFiles,
        message: `${uploadedFiles.length} file(s) uploaded successfully`
      });

    } catch (error) {
      console.error('File upload error:', error.message);
      res.status(500).json({
        error: 'File upload failed',
        message: error.message
      });
    }
  }
);

/**
 * Delete Project File
 * DELETE /api/projects/:projectId/files/:fileId
 */
app.delete('/api/projects/:projectId/files/:fileId', csrfProtection, authenticateToken, async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const userId = req.user.id;

    // Check project access
    const hasAccess = await canUserAccessProject(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'You do not have permission to access this project'
      });
    }

    // Get file info
    const fileResult = await query(
      'SELECT filename FROM printing_files WHERE id = $1 AND project_id = $2',
      [fileId, projectId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filename = fileResult.rows[0].filename;

    // Delete from database
    await query('DELETE FROM printing_files WHERE id = $1', [fileId]);

    // Try to delete from FluxPrint (non-fatal if fails)
    try {
      await axios.delete(`${FLUXPRINT_URL}/api/files/${filename}`, {
        timeout: 5000,
        validateStatus: () => true
      });
    } catch (deleteError) {
      console.error('FluxPrint file deletion error (non-fatal):', deleteError.message);
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('File deletion error:', error.message);
    res.status(500).json({
      error: 'Failed to delete file',
      message: error.message
    });
  }
});

console.log('✅ Phase 4A Designer-First Quick Print API registered');
console.log('✅ FluxPrint proxy routes registered');
console.log('✅ FluxPrint database integration routes registered (Phase 2.5)');
console.log('✅ FluxPrint project-file association routes registered (Phase 3D)');

// API 404 handler for unknown API routes
// Note: Disabled to allow Socket.IO to work properly
// Socket.IO needs to handle its own 404s at the HTTP server level
// app.use('/', (req, res, next) => {
//   if (!res.headersSent) {
//     res.status(404).json({ message: 'API endpoint not found' });
//   } else {
//     next();
//   }
// });

// Sentry error handler (must be after all routes, before other error handlers)
app.use(errorHandler());

// Security error handler (must be last)
app.use(securityErrorHandler);

httpServer.listen(PORT, async () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🚀 FluxStudio Unified Backend Service');
  console.log('='.repeat(60));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔐 Auth namespace: ws://localhost:${PORT}/auth`);
  console.log(`💬 Messaging namespace: ws://localhost:${PORT}/messaging`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Monitoring: http://localhost:${PORT}/api/monitoring`);
  console.log('');

  // Run database migrations on startup (if using database)
  if (USE_DATABASE) {
    // CRITICAL: Fix table schema mismatches before running migrations
    // This must run first because the migration runner may fail on other migrations
    try {
      console.log('🔧 Fixing database table schemas...');
      const fixResult = await query(`
        DO $$
        BEGIN
          -- =============================================
          -- FIX refresh_tokens TABLE
          -- =============================================

          -- Drop FK constraints that might block changes
          ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
          ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS fk_user;

          -- Fix 1: Convert user_id from UUID to TEXT if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'refresh_tokens'
            AND column_name = 'user_id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE refresh_tokens ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
            RAISE NOTICE 'Fixed: refresh_tokens.user_id converted from UUID to TEXT';
          END IF;

          -- Fix 2: Add 'token' column if it doesn't exist (code expects 'token', table has 'token_hash')
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'refresh_tokens'
            AND column_name = 'token'
          ) THEN
            -- If token_hash exists, rename it to token
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'refresh_tokens'
              AND column_name = 'token_hash'
            ) THEN
              ALTER TABLE refresh_tokens RENAME COLUMN token_hash TO token;
              RAISE NOTICE 'Fixed: refresh_tokens.token_hash renamed to token';
            ELSE
              -- Otherwise add token column
              ALTER TABLE refresh_tokens ADD COLUMN token TEXT;
              RAISE NOTICE 'Fixed: refresh_tokens.token column added';
            END IF;
          END IF;

          -- Fix 3: Add device_name column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'refresh_tokens'
            AND column_name = 'device_name'
          ) THEN
            ALTER TABLE refresh_tokens ADD COLUMN device_name VARCHAR(255);
            RAISE NOTICE 'Fixed: refresh_tokens.device_name column added';
          END IF;

          -- Fix 4: Add last_used_at column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'refresh_tokens'
            AND column_name = 'last_used_at'
          ) THEN
            ALTER TABLE refresh_tokens ADD COLUMN last_used_at TIMESTAMP DEFAULT NOW();
            RAISE NOTICE 'Fixed: refresh_tokens.last_used_at column added';
          END IF;

          -- Fix 5: Add revoked_at column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'refresh_tokens'
            AND column_name = 'revoked_at'
          ) THEN
            ALTER TABLE refresh_tokens ADD COLUMN revoked_at TIMESTAMP;
            RAISE NOTICE 'Fixed: refresh_tokens.revoked_at column added';
          END IF;

          -- =============================================
          -- FIX security_events TABLE
          -- =============================================

          -- Drop FK constraints
          ALTER TABLE security_events DROP CONSTRAINT IF EXISTS security_events_user_id_fkey;
          ALTER TABLE security_events DROP CONSTRAINT IF EXISTS fk_security_events_user_id;

          -- Convert security_events.user_id from UUID to TEXT if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'security_events'
            AND column_name = 'user_id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE security_events ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
            RAISE NOTICE 'Fixed: security_events.user_id converted from UUID to TEXT';
          END IF;

          -- =============================================
          -- FIX organizations TABLE
          -- =============================================

          -- Drop FK constraints that reference organizations.id (only if tables exist)
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
            ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_organization_id_fkey;
            ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS fk_organization_members_org_id;
          END IF;

          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
            ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_organization_id_fkey;
            ALTER TABLE teams DROP CONSTRAINT IF EXISTS fk_teams_organization_id;
          END IF;

          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
            ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_organization_id_fkey;
            ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_organization_id;
          END IF;

          -- Convert organizations.id from UUID to TEXT if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'organizations'
            AND column_name = 'id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE organizations ALTER COLUMN id TYPE TEXT USING id::TEXT;
            RAISE NOTICE 'Fixed: organizations.id converted from UUID to TEXT';
          END IF;

          -- Convert organizations.owner_id from UUID to TEXT if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'organizations'
            AND column_name = 'owner_id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE organizations ALTER COLUMN owner_id TYPE TEXT USING owner_id::TEXT;
            RAISE NOTICE 'Fixed: organizations.owner_id converted from UUID to TEXT';
          END IF;

          -- =============================================
          -- FIX organization_members TABLE (if exists)
          -- =============================================

          -- Convert organization_members.organization_id from UUID to TEXT if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'organization_members'
            AND column_name = 'organization_id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE organization_members ALTER COLUMN organization_id TYPE TEXT USING organization_id::TEXT;
            RAISE NOTICE 'Fixed: organization_members.organization_id converted from UUID to TEXT';
          END IF;

          -- Convert organization_members.user_id from UUID to TEXT if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'organization_members'
            AND column_name = 'user_id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE organization_members ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
            RAISE NOTICE 'Fixed: organization_members.user_id converted from UUID to TEXT';
          END IF;

          -- =============================================
          -- FIX teams TABLE (if exists)
          -- =============================================

          -- Drop FK constraints (only if table exists)
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
            ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_team_id_fkey;
            ALTER TABLE team_members DROP CONSTRAINT IF EXISTS fk_team_members_team_id;
          END IF;

          -- Convert teams.id from UUID to TEXT if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'teams'
            AND column_name = 'id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE teams ALTER COLUMN id TYPE TEXT USING id::TEXT;
            RAISE NOTICE 'Fixed: teams.id converted from UUID to TEXT';
          END IF;

          -- Convert teams.organization_id from UUID to TEXT if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'teams'
            AND column_name = 'organization_id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE teams ALTER COLUMN organization_id TYPE TEXT USING organization_id::TEXT;
            RAISE NOTICE 'Fixed: teams.organization_id converted from UUID to TEXT';
          END IF;

          -- =============================================
          -- FIX team_members TABLE (if exists)
          -- =============================================

          -- Convert team_members.team_id from UUID to TEXT if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'team_members'
            AND column_name = 'team_id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE team_members ALTER COLUMN team_id TYPE TEXT USING team_id::TEXT;
            RAISE NOTICE 'Fixed: team_members.team_id converted from UUID to TEXT';
          END IF;

          -- Convert team_members.user_id from UUID to TEXT if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'team_members'
            AND column_name = 'user_id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE team_members ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
            RAISE NOTICE 'Fixed: team_members.user_id converted from UUID to TEXT';
          END IF;

          -- =============================================
          -- FIX projects TABLE
          -- =============================================

          -- Convert projects.id from UUID to TEXT if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'projects'
            AND column_name = 'id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE projects ALTER COLUMN id TYPE TEXT USING id::TEXT;
            RAISE NOTICE 'Fixed: projects.id converted from UUID to TEXT';
          END IF;

          -- Convert projects.organization_id from UUID to TEXT if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'projects'
            AND column_name = 'organization_id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE projects ALTER COLUMN organization_id TYPE TEXT USING organization_id::TEXT;
            RAISE NOTICE 'Fixed: projects.organization_id converted from UUID to TEXT';
          END IF;

          -- Convert projects.team_id from UUID to TEXT if needed
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'projects'
            AND column_name = 'team_id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE projects ALTER COLUMN team_id TYPE TEXT USING team_id::TEXT;
            RAISE NOTICE 'Fixed: projects.team_id converted from UUID to TEXT';
          END IF;

        END $$;
      `);
      console.log('✅ Database schema fixes complete');
    } catch (fixError) {
      console.error('⚠️ Schema fix warning:', fixError.message);
    }

    try {
      console.log('🔄 Running database migrations...');
      await runMigrations();
      console.log('✅ Database migrations completed');
    } catch (migrationError) {
      console.error('⚠️ Migration warning:', migrationError.message);
      // Don't crash server on migration errors - log and continue
    }
  }

  console.log('');
  console.log('Services consolidated:');
  console.log('  ✅ Authentication (formerly port 3001)');
  console.log('  ✅ Messaging (formerly port 3002)');
  console.log('');
  console.log('Cost savings: $360/year (2 services → 1 service)');
  console.log('='.repeat(60));
  console.log('');
});

module.exports = httpServer;
