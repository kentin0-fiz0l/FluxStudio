/**
 * FluxStudio Unified Backend Service
 * Combines Authentication + Messaging services into a single backend
 * Deployed: 2026-04-11
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

const { createLogger } = require('./lib/logger');
const log = createLogger('UnifiedServer');

// Import security and configuration modules
const { config } = require('./config/environment');
const { authRateLimit, printRateLimit, cors, oauthCors, helmet, validateInput, securityErrorHandler, auditLogger, traceIdMiddleware } = require('./middleware/security');
const { csrfProtection, getCsrfToken } = require('./middleware/csrf');
const { cachingMiddleware, staticAssetCaching, configuredApiCaching } = require('./middleware/caching');
const advancedRateLimiter = require('./middleware/advancedRateLimiter');
const { apiVersionMiddleware } = require('./middleware/apiVersion');
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
const securityLogger = require('./lib/auth/securityLogger');

// Import Sprint 13 Day 2 - Sentry & Anomaly Detection
const { initSentry, requestHandler, tracingHandler, errorHandler, captureAuthError } = require('./lib/monitoring/sentry');
const anomalyDetector = require('./lib/security/anomalyDetector');

// =============================================================================
// GLOBAL ERROR HANDLERS - Catch unhandled errors at the process level
// =============================================================================

// Handle unhandled promise rejections (async errors that escape try/catch)
process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled promise rejection', reason instanceof Error ? reason : undefined, {
    reason: reason instanceof Error ? undefined : String(reason),
    promise: String(promise),
  });

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
  log.error('Uncaught exception - Server may be in unstable state', error);

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
    log.error('Exiting due to uncaught exception');
    process.exit(1);
  }, 1000);
});

// Handle SIGTERM gracefully (container orchestration, load balancer draining)
process.on('SIGTERM', () => {
  log.info('SIGTERM received - Starting graceful shutdown');

  // Close HTTP server (stop accepting new connections)
  if (typeof httpServer !== 'undefined' && httpServer.close) {
    httpServer.close(() => {
      log.info('HTTP server closed');

      // Close database connections
      try {
        const { pool } = require('./lib/db');
        if (pool && pool.end) {
          pool.end().then(() => {
            log.info('Database connections closed');
            process.exit(0);
          });
        } else {
          process.exit(0);
        }
      } catch (err) {
        log.info('Database pool not available, exiting');
        process.exit(0);
      }
    });

    // Force exit after 30 seconds if graceful shutdown fails
    setTimeout(() => {
      log.error('Graceful shutdown timeout - forcing exit');
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
    log.info('Redis cache initialized for unified service');
  })
  .catch((err) => {
    log.warn('Redis cache not available, continuing without cache', { error: err.message });
  });

// Database adapters (with fallback to file-based storage)
let authAdapter = null;
let messagingAdapter = null;
let projectsAdapter = null;
let designBoardsAdapter = null;
let metmapAdapter = null;
const USE_DATABASE = process.env.USE_DATABASE === 'true';

if (USE_DATABASE) {
  try {
    authAdapter = require('./database/auth-adapter');
    messagingAdapter = require('./database/messaging-adapter');
    projectsAdapter = require('./database/projects-adapter');
    designBoardsAdapter = require('./database/design-boards-adapter');
    metmapAdapter = require('./database/metmap-adapter');
    log.info('Database adapters loaded for unified service');
  } catch (error) {
    log.warn('Failed to load database adapters, falling back to file-based storage', { error: error.message });
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
// Path must be /api/socket.io — DO App Platform does NOT strip the /api prefix
// for the unified-backend service (verified: /api/auth/me works with full path).
// The original 504 errors were from WebSocket upgrade timeouts, not path mismatch.
const io = new Server(httpServer, {
  path: '/api/socket.io',
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
const metmapCollabNamespace = io.of('/metmap-collab'); // Phase 2.2: MetMap real-time collaboration (Yjs)
const notificationsNamespace = io.of('/notifications'); // Sprint 44: Real-time notifications
const webrtcNamespace = io.of('/webrtc'); // WebRTC call signaling

// Store namespaces in app for access in routes
app.set('io', io);
app.set('printingNamespace', printingNamespace);
app.set('designBoardsNamespace', designBoardsNamespace);
app.set('metmapCollabNamespace', metmapCollabNamespace);
app.set('notificationsNamespace', notificationsNamespace);
app.set('webrtcNamespace', webrtcNamespace);

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

// Sprint 43: IP-based rate limiting (applied before all other middleware)
const { ipRateLimiters } = require('./lib/security/ipRateLimit');
app.use(ipRateLimiters.global());

// Security middleware (applied first)
app.use(traceIdMiddleware); // Generate unique trace ID for each request
app.use(apiVersionMiddleware); // Set X-API-Version on every response
app.use(helmet);
// Allow /embed/ routes to be loaded in iframes on external sites
app.use('/embed', (req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy',
    res.getHeader('Content-Security-Policy')?.toString().replace("frame-ancestors 'self'", "frame-ancestors *") || ''
  );
  next();
});
app.use((req, res, next) => {
  if (req.path.match(/\/(api\/)?auth\/(google|github|figma|slack)\/callback/)) {
    return oauthCors(req, res, next);
  }
  return cors(req, res, next);
});
app.use(auditLogger);
app.use(advancedRateLimiter.middleware());

// Performance monitoring middleware
app.use(performanceMonitor.createExpressMiddleware('unified-service'));

// Request timeout middleware
const timeout = require('./middleware/timeout');
app.use(timeout());

// Sentry request and tracing handlers (must be before routes)
app.use(requestHandler());
app.use(tracingHandler());

// Trust proxy for X-Forwarded-For headers (required for nginx reverse proxy)
app.set('trust proxy', 1);

// Stripe webhook needs raw body for signature verification
// MUST be before express.json() middleware
app.use('/api/payments/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use('/payments/webhooks/stripe', express.raw({ type: 'application/json' }));

// Body parsing middleware (default 2mb for most routes)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.raw({ limit: '1mb' }));
app.use(express.text({ limit: '1mb' }));

// Route-specific body size limits
// 50kb for messaging routes
const messagingBodyJson = express.json({ limit: '50kb' });
const messagingBodyUrlencoded = express.urlencoded({ extended: true, limit: '50kb' });
app.use('/messages', messagingBodyJson, messagingBodyUrlencoded);
app.use('/api/messages', messagingBodyJson, messagingBodyUrlencoded);
app.use('/conversations', messagingBodyJson, messagingBodyUrlencoded);
app.use('/api/conversations', messagingBodyJson, messagingBodyUrlencoded);

// 1mb for auth routes
const authBodyJson = express.json({ limit: '1mb' });
const authBodyUrlencoded = express.urlencoded({ extended: true, limit: '1mb' });
app.use('/auth', authBodyJson, authBodyUrlencoded);
app.use('/api/auth', authBodyJson, authBodyUrlencoded);

// 10mb for upload, file, AI, media, and asset routes
const largeBodyJson = express.json({ limit: '10mb' });
const largeBodyUrlencoded = express.urlencoded({ extended: true, limit: '10mb' });
app.use('/uploads', largeBodyJson, largeBodyUrlencoded);
app.use('/api/uploads', largeBodyJson, largeBodyUrlencoded);
app.use('/files', largeBodyJson, largeBodyUrlencoded);
app.use('/api/files', largeBodyJson, largeBodyUrlencoded);
app.use('/ai', largeBodyJson, largeBodyUrlencoded);
app.use('/api/ai', largeBodyJson, largeBodyUrlencoded);
app.use('/media', largeBodyJson, largeBodyUrlencoded);
app.use('/api/media', largeBodyJson, largeBodyUrlencoded);
app.use('/assets', largeBodyJson, largeBodyUrlencoded);
app.use('/api/assets', largeBodyJson, largeBodyUrlencoded);

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
    '/auth/saml',
    '/api/auth/saml',
    '/health',
    '/monitoring',
    '/payments/webhooks/stripe',
    '/api/payments/webhooks/stripe',
    '/api/observability/vitals'
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
// DEGRADED MODE — block API routes when backend is not fully configured
// ==============================================
if (process.env.__DEGRADED_MODE === 'true') {
  log.warn('DEGRADED MODE active — API routes will return 503');
  app.use((req, res, next) => {
    // Allow health, auth routes, and static assets through degraded mode
    const allowedInDegraded = ['/health', '/api/health', '/flags/beta-status', '/api/flags/beta-status'];
    if (allowedInDegraded.includes(req.path) ||
        req.method === 'OPTIONS' ||
        req.path.match(/\/(api\/)?(auth|csrf-token)/) ) {
      return next();
    }
    res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable — backend not fully configured',
      degraded: true,
    });
  });
}

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
const aiMetmapRoutes = require('./routes/ai-metmap');
const aiDesignFeedbackRoutes = require('./routes/ai-design-feedback');
app.use('/ai', aiRoutes);  // Direct path (DO ingress strips /api prefix)
app.use('/api/ai', aiRoutes);
app.use('/ai/metmap', aiMetmapRoutes);
app.use('/api/ai/metmap', aiMetmapRoutes);
app.use('/ai/design-feedback', aiDesignFeedbackRoutes);
app.use('/api/ai/design-feedback', aiDesignFeedbackRoutes);

// Mount AI Formation Vision routes (4A)
const aiFormationVisionRoutes = require('./routes/ai-formation-vision');
app.use('/ai/formation', aiFormationVisionRoutes);
app.use('/api/ai/formation', aiFormationVisionRoutes);

// Mount AI Preferences routes (4D)
const aiPreferencesRoutes = require('./routes/ai-preferences');
app.use('/ai/preferences', aiPreferencesRoutes);
app.use('/api/ai/preferences', aiPreferencesRoutes);

// Mount AI Search routes (Phase 2.3)
const aiSearchRoutes = require('./routes/ai-search');
app.use('/search/ai', aiSearchRoutes);
app.use('/api/search/ai', aiSearchRoutes);

// Mount Analytics routes (Sprint 35)
const analyticsRoutes = require('./routes/analytics');
app.use('/analytics', analyticsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Mount Plugin routes (Sprint 36)
const pluginRoutes = require('./routes/plugins');
app.use('/plugins', pluginRoutes);
app.use('/api/plugins', pluginRoutes);

// Mount Template routes (Sprint 37)
const templateRoutes = require('./routes/templates');
app.use('/templates', templateRoutes);
app.use('/api/templates', templateRoutes);

// Mount Usage routes (Sprint 38)
const usageRoutes = require('./routes/usage');
app.use('/usage', usageRoutes);
app.use('/api/usage', usageRoutes);

// Mount Observability routes (Sprint 40)
const observabilityRoutes = require('./routes/observability');
app.use('/observability', observabilityRoutes);
app.use('/api/observability', observabilityRoutes);

// Sprint 41 T2: GDPR/CCPA Compliance routes
const complianceRoutes = require('./routes/compliance');
app.use('/compliance', complianceRoutes);
app.use('/api/compliance', complianceRoutes);

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
const formationDraftAgentRoutes = require('./routes/formation-draft-agent');
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

// Formation Draft Agent routes - AI formation generation
app.use('/formation-agent', formationDraftAgentRoutes);
app.use('/api/formation-agent', formationDraftAgentRoutes);

// Payments routes - Phase 2 User Adoption
paymentsRoutes.setAuthHelper({ authenticateToken });
app.use('/payments', paymentsRoutes);  // Direct path (DO ingress strips /api prefix)
app.use('/api/payments', paymentsRoutes);  // Also support full path for local dev

// Support routes - Phase 4 User Adoption
app.use('/support', supportRoutes);  // Direct path
app.use('/api/support', supportRoutes);  // Full path for local dev

// Feedback routes - Sprint 56 Beta Widget
const feedbackRoutes = require('./routes/feedback');
app.use('/feedback', feedbackRoutes);
app.use('/api/feedback', feedbackRoutes);

// Formations routes - Drill Writer MVP
// Routes define /projects/:projectId/formations, so mount at /api
app.use('/api', formationsRoutes);
app.use('/', formationsRoutes);  // Direct path for production

// Set Socket.IO namespace for messaging routes (for real-time broadcasts)
messagingRoutes.setMessagingNamespace(messagingNamespace);

// Sprint 18 - extracted route modules
app.use('/integrations', integrationsRoutes);
app.use('/api/integrations', integrationsRoutes);

// Phase 9.4 - LMS Integration (Google Classroom, Canvas)
const lmsRoutes = require('./routes/lms');
app.use('/lms', lmsRoutes);
app.use('/api/lms', lmsRoutes);

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

// Sprint 61: SAML SSO routes
const samlRoutes = require('./routes/saml');
app.use('/auth/saml', samlRoutes);
app.use('/api/auth/saml', samlRoutes);

// Sprint 41: Enterprise & Compliance routes
const adminAuditRoutes = require('./routes/admin-audit');
const accountRoutes = require('./routes/account');
const twoFactorRoutes = require('./routes/two-factor');
const rolesRoutes = require('./routes/roles');
const sessionsRoutes = require('./routes/sessions');

app.use('/admin/audit-logs', adminAuditRoutes);
app.use('/api/admin/audit-logs', adminAuditRoutes);

app.use('/account', accountRoutes);
app.use('/api/account', accountRoutes);

app.use('/2fa', twoFactorRoutes);
app.use('/api/2fa', twoFactorRoutes);

app.use('/organizations/:orgId/roles', rolesRoutes);
app.use('/api/organizations/:orgId/roles', rolesRoutes);

// Sprint 62: Organization SSO settings routes
const orgSsoRoutes = require('./routes/org-sso-settings');
app.use('/organizations/:orgId/sso', orgSsoRoutes);
app.use('/api/organizations/:orgId/sso', orgSsoRoutes);

app.use('/sessions', sessionsRoutes);
app.use('/api/sessions', sessionsRoutes);

// Sprint 44: Referral routes
const referralsRoutes = require('./routes/referrals');
app.use('/referrals', referralsRoutes);
app.use('/api/referrals', referralsRoutes);

// Sprint 87: Unified search with PostgreSQL full-text search
const searchRoutes = require('./routes/search');
app.use('/search', searchRoutes);
app.use('/api/search', searchRoutes);

// Sprint 51: Browser automation routes
const browserRoutes = require('./routes/browser');
app.use('/browser', browserRoutes);
app.use('/api/browser', browserRoutes);

// Sprint 92: Beta waitlist
const betaRoutes = require('./routes/beta');
app.use('/beta', betaRoutes);
app.use('/api/beta', betaRoutes);

// Sprint 42: Feature Flags
const adminFlagsRoutes = require('./routes/admin-flags');
const { featureFlagMiddleware, getFlag } = require('./lib/featureFlags');

// Sprint 56: Public flag check for signup beta gate (no auth required)
// Phase 4: open_registration flag overrides beta gate
const betaStatusHandler = async (_req, res) => {
  try {
    const openRegFlag = await getFlag('open_registration');
    const openRegistration = !!(openRegFlag && openRegFlag.enabled);
    // If open registration is on, beta gate is effectively disabled
    if (openRegistration) {
      return res.json({ betaInviteRequired: false, openRegistration: true });
    }
    const flag = await getFlag('beta_invite_required');
    res.json({ betaInviteRequired: !!(flag && flag.enabled), openRegistration: false });
  } catch {
    // Default to open registration when flags unavailable
    res.json({ betaInviteRequired: false, openRegistration: true });
  }
};
app.get('/flags/beta-status', betaStatusHandler);
app.get('/api/flags/beta-status', betaStatusHandler);

app.use(featureFlagMiddleware);
app.use('/admin/flags', adminFlagsRoutes);
app.use('/api/admin/flags', adminFlagsRoutes);

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
require('./sockets/metmap-collab-socket')(metmapCollabNamespace, metmapAdapter, JWT_SECRET); // Phase 2.2: MetMap real-time collaboration (Yjs)
require('./sockets/notifications-socket')(notificationsNamespace, JWT_SECRET); // Sprint 44: Real-time notifications
require('./sockets/webrtc-socket')(webrtcNamespace, JWT_SECRET); // WebRTC call signaling



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
  log.info('FluxStudio Unified Backend Service started', {
    port: PORT,
    namespaces: ['auth', 'messaging', 'design-boards', 'metmap-collab'],
    healthUrl: `http://localhost:${PORT}/health`,
    monitoringUrl: `http://localhost:${PORT}/api/monitoring`,
  });

  // Run database migrations on startup (if using database)
  if (USE_DATABASE) {
    // CRITICAL: Fix table schema mismatches before running migrations
    // This must run first because the migration runner may fail on other migrations
    try {
      const { runSchemaFixes } = require('./database/schema-fixes');
      await runSchemaFixes(query);
    } catch (fixError) {
      log.warn('Schema fix warning', { error: fixError.message });
    }

    try {
      log.info('Running database migrations');
      await runMigrations();
      log.info('Database migrations completed');
    } catch (migrationError) {
      log.warn('Migration warning', { error: migrationError.message });
      // Don't crash server on migration errors - log and continue
    }
  }

  log.info('Services consolidated', {
    services: ['Authentication', 'Messaging'],
    costSavings: '$360/year (2 services to 1 service)',
  });
});

module.exports = httpServer;
