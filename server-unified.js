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
const { rateLimit, authRateLimit, printRateLimit, cors, helmet, validateInput, securityErrorHandler, auditLogger, traceIdMiddleware } = require('./middleware/security');
const { csrfProtection, getCsrfToken } = require('./middleware/csrf');
const { cachingMiddleware, staticAssetCaching, configuredApiCaching } = require('./middleware/caching');
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

// Import data helper functions (user CRUD, file/team/project persistence, messaging, auth tokens)
const dataHelpers = require('./lib/data-helpers');
const {
  getUsers, getUserByEmail, getUserById, createUser, updateUser, saveUsers,
  getMessages, createMessage, getChannels,
  authenticateToken
} = dataHelpers;

// Import Sprint 13 - Security Logger
// const transcodingService = require('./services/transcoding-service'); // AWS version
const transcodingService = require('./services/transcoding-service-do'); // DigitalOcean version
const securityLogger = require('./lib/auth/securityLogger');

// Import Sprint 13 Day 2 - Sentry & Anomaly Detection
const { initSentry, requestHandler, tracingHandler, errorHandler, captureAuthError } = require('./lib/monitoring/sentry');
const anomalyDetector = require('./lib/security/anomalyDetector');

// =============================================================================
// GLOBAL ERROR HANDLERS - Catch unhandled errors at the process level
// =============================================================================

// Handle unhandled promise rejections (async errors that escape try/catch)
process.on('unhandledRejection', (reason, promise) => {
  console.error('='.repeat(60));
  console.error('⚠️  UNHANDLED PROMISE REJECTION');
  console.error('='.repeat(60));
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('Stack:', reason instanceof Error ? reason.stack : 'No stack trace');
  console.error('='.repeat(60));

  // Log to Sentry if available
  try {
    const Sentry = require('@sentry/node');
    Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
      tags: { type: 'unhandledRejection' },
      extra: { promise: String(promise) }
    });
  } catch (sentryError) {
    // Sentry not available, already logged to console
  }

  // Log to security logger for audit trail
  try {
    securityLogger.logSecurityEvent({
      type: 'unhandled_rejection',
      severity: 'critical',
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : null,
      timestamp: new Date().toISOString()
    });
  } catch (logError) {
    // Security logger not available
  }
});

// Handle uncaught exceptions (synchronous errors that escape try/catch)
process.on('uncaughtException', (error) => {
  console.error('='.repeat(60));
  console.error('💥 UNCAUGHT EXCEPTION - Server may be in unstable state');
  console.error('='.repeat(60));
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  console.error('='.repeat(60));

  // Log to Sentry if available
  try {
    const Sentry = require('@sentry/node');
    Sentry.captureException(error, {
      tags: { type: 'uncaughtException', fatal: true }
    });
  } catch (sentryError) {
    // Sentry not available
  }

  // Log to security logger for audit trail
  try {
    securityLogger.logSecurityEvent({
      type: 'uncaught_exception',
      severity: 'critical',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  } catch (logError) {
    // Security logger not available
  }

  // For truly fatal errors, give time for logs to flush then exit
  // In production, a process manager (PM2, Docker, etc.) should restart the server
  setTimeout(() => {
    console.error('Exiting due to uncaught exception...');
    process.exit(1);
  }, 1000);
});

// Handle SIGTERM gracefully (container orchestration, load balancer draining)
process.on('SIGTERM', () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('📴 SIGTERM received - Starting graceful shutdown');
  console.log('='.repeat(60));

  // Close HTTP server (stop accepting new connections)
  if (typeof httpServer !== 'undefined' && httpServer.close) {
    httpServer.close(() => {
      console.log('✅ HTTP server closed');

      // Close database connections
      try {
        const { pool } = require('./lib/db');
        if (pool && pool.end) {
          pool.end().then(() => {
            console.log('✅ Database connections closed');
            process.exit(0);
          });
        } else {
          process.exit(0);
        }
      } catch (err) {
        console.log('Database pool not available, exiting');
        process.exit(0);
      }
    });

    // Force exit after 30 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('⚠️ Graceful shutdown timeout - forcing exit');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
});

// =============================================================================

// Initialize cache on startup
let cacheInitialized = false;
cache.initializeCache()
  .then(() => {
    cacheInitialized = true;
    dataHelpers.setCacheInitialized(true);
    console.log('✅ Redis cache initialized for unified service');
  })
  .catch((err) => {
    console.warn('⚠️  Redis cache not available, continuing without cache:', err.message);
  });

// Database adapters (with fallback to file-based storage)
let authAdapter = null;
let messagingAdapter = null;
let projectsAdapter = null;
let designBoardsAdapter = null;
const USE_DATABASE = process.env.USE_DATABASE === 'true';

if (USE_DATABASE) {
  try {
    authAdapter = require('./database/auth-adapter');
    messagingAdapter = require('./database/messaging-adapter');
    projectsAdapter = require('./database/projects-adapter');
    designBoardsAdapter = require('./database/design-boards-adapter');
    console.log('✅ Database adapters loaded for unified service');
  } catch (error) {
    console.warn('⚠️ Failed to load database adapters, falling back to file-based storage:', error.message);
  }
}

// Initialize data helpers with dependencies
dataHelpers.initialize({
  authAdapter,
  messagingAdapter,
  projectsAdapter,
  cache,
  performanceMonitor,
  config,
  query,
  fs,
  path,
  jwt,
  crypto,
  baseDir: __dirname
});

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
const designBoardsNamespace = io.of('/design-boards'); // Design boards real-time collaboration

// Store namespaces in app for access in routes
app.set('printingNamespace', printingNamespace);
app.set('designBoardsNamespace', designBoardsNamespace);

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
app.use(traceIdMiddleware); // Generate unique trace ID for each request
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

// Stripe webhook needs raw body for signature verification
// MUST be before express.json() middleware
app.use('/api/payments/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use('/payments/webhooks/stripe', express.raw({ type: 'application/json' }));

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
  ignorePaths: [
    '/auth/google',
    '/auth/google/callback',
    '/auth/github/callback',
    '/auth/figma/callback',
    '/auth/slack/callback',
    '/auth/apple',
    '/auth/login',
    '/auth/signup',
    '/api/auth/google',
    '/api/auth/google/callback',
    '/api/auth/github/callback',
    '/api/auth/figma/callback',
    '/api/auth/slack/callback',
    '/api/auth/login',
    '/api/auth/signup',
    '/health',
    '/monitoring',
    '/payments/webhooks/stripe',
    '/api/payments/webhooks/stripe'
  ]
}));

// HTTP Caching middleware for API responses
app.use(configuredApiCaching());

// Static file serving with caching headers
app.use(staticAssetCaching({ maxAge: 604800, immutable: true }));
app.use(express.static('build', {
  maxAge: '1w',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set immutable for hashed assets
    if (/[-_.][a-f0-9]{8,}\./.test(path)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '1d',
  etag: true
}));

// Data helper functions imported from lib/data-helpers.js
// Additional helpers available via dataHelpers object if needed

// ==============================================
// ROUTE MODULES
// ==============================================

// CSRF token endpoint
// Note: DigitalOcean routes /api/csrf-token to this service as /csrf-token
app.get('/csrf-token', getCsrfToken);
// Also serve at /api/csrf-token for local development
app.get('/api/csrf-token', getCsrfToken);

// Mount route modules
// Note: DigitalOcean App Platform routes /api/* to this service,
// so mount paths should NOT include /api prefix

// Mount refresh token routes
app.use('/auth', refreshTokenRoutes);
app.use('/api/auth', refreshTokenRoutes); // Alias for frontend compatibility

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

// Mount AI Design Assistant routes
const aiRoutes = require('./routes/ai');
app.use('/ai', aiRoutes);  // Direct path (DO ingress strips /api prefix)
app.use('/api/ai', aiRoutes);

// Mount Documents routes (collaborative editing)
const documentsRoutes = require('./routes/documents');
app.use('/', documentsRoutes);  // Direct path (DO ingress strips /api prefix)
app.use('/api', documentsRoutes);

// Mount modular route files (Phase 1 refactoring)
const authRoutes = require('./routes/auth');
const filesRoutes = require('./routes/files');
const notificationsRoutes = require('./routes/notifications');
const teamsRoutes = require('./routes/teams');
const projectsRoutes = require('./routes/projects');
const assetsRoutes = require('./routes/assets');
const designBoardsRoutes = require('./routes/design-boards');
const connectorsRoutes = require('./routes/connectors');
const messagingRoutes = require('./routes/messaging');
const messagesRoutes = require('./routes/messaging').messagesRouter;
const metmapRoutes = require('./routes/metmap');
const pushRoutes = require('./routes/push');
const printingRoutes = require('./routes/printing');
const agentRoutes = require('./routes/agent-api');
const paymentsRoutes = require('./routes/payments');
const supportRoutes = require('./routes/support');
const formationsRoutes = require('./routes/formations');
const integrationsRoutes = require('./routes/integrations');
const mediaRoutes = require('./routes/media');
const mcpRoutes = require('./routes/mcp');
const healthRoutes = require('./routes/health');
const usersRoutes = require('./routes/users');
const channelsRoutes = require('./routes/channels');

// Initialize auth routes with database helper
authRoutes.setAuthHelper({
  authenticateToken,
  getUsers,
  saveUsers,
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  generateAuthResponse
});

// Mount auth routes at both paths for compatibility
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

// Mount routes at both paths for DigitalOcean App Platform compatibility
// DO ingress strips /api prefix before forwarding to backend
app.use('/files', filesRoutes);
app.use('/api/files', filesRoutes);

app.use('/notifications', notificationsRoutes);
app.use('/api/notifications', notificationsRoutes);

app.use('/teams', teamsRoutes);
app.use('/api/teams', teamsRoutes);

app.use('/projects', projectsRoutes);
app.use('/api/projects', projectsRoutes);

app.use('/assets', assetsRoutes);
app.use('/api/assets', assetsRoutes);

app.use('/boards', designBoardsRoutes);
app.use('/api/boards', designBoardsRoutes);

app.use('/connectors', connectorsRoutes);
app.use('/api/connectors', connectorsRoutes);

app.use('/conversations', messagingRoutes);
app.use('/api/conversations', messagingRoutes);

app.use('/messages', messagesRoutes);
app.use('/api/messages', messagesRoutes);

app.use('/metmap', metmapRoutes);
app.use('/api/metmap', metmapRoutes);

app.use('/push', pushRoutes);
app.use('/api/push', pushRoutes);

app.use('/printing', printingRoutes);
app.use('/api/printing', printingRoutes);

app.use('/agent', agentRoutes);
app.use('/api/agent', agentRoutes)

// Payments routes - Phase 2 User Adoption
paymentsRoutes.setAuthHelper({ authenticateToken });
app.use('/payments', paymentsRoutes);  // Direct path (DO ingress strips /api prefix)
app.use('/api/payments', paymentsRoutes);  // Also support full path for local dev

// Support routes - Phase 4 User Adoption
app.use('/support', supportRoutes);  // Direct path
app.use('/api/support', supportRoutes);  // Full path for local dev

// Formations routes - Drill Writer MVP
// Routes define /projects/:projectId/formations, so mount at /api
app.use('/api', formationsRoutes);
app.use('/', formationsRoutes);  // Direct path for production

// Set Socket.IO namespace for messaging routes (for real-time broadcasts)
messagingRoutes.setMessagingNamespace(messagingNamespace);

// Sprint 18 - extracted route modules
app.use('/integrations', integrationsRoutes);
app.use('/api/integrations', integrationsRoutes);

app.use('/media', mediaRoutes);
app.use('/api/media', mediaRoutes);

app.use('/mcp', mcpRoutes);
app.use('/api/mcp', mcpRoutes);

app.use('/users', usersRoutes);
app.use('/api/users', usersRoutes);

app.use('/', channelsRoutes);
app.use('/api', channelsRoutes);

app.use('/', healthRoutes);
app.use('/api', healthRoutes);


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
require('./sockets/design-boards-socket')(designBoardsNamespace, designBoardsAdapter, JWT_SECRET); // Design boards real-time collaboration



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
  console.log(`🎨 Design Boards namespace: ws://localhost:${PORT}/design-boards`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Monitoring: http://localhost:${PORT}/api/monitoring`);
  console.log('');

  // Run database migrations on startup (if using database)
  if (USE_DATABASE) {
    // CRITICAL: Fix table schema mismatches before running migrations
    // This must run first because the migration runner may fail on other migrations
    try {
      const { runSchemaFixes } = require('./database/schema-fixes');
      await runSchemaFixes(query);
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
