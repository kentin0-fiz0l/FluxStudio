/**
 * Printing Socket.IO Namespace Handler
 * Phase 3A: WebSocket Real-Time Updates
 *
 * Namespace: /printing
 * Purpose: Real-time 3D printer status, temperature, and progress updates
 *
 * This namespace bridges FluxPrint (Python backend) and FluxStudio frontend,
 * providing real-time WebSocket updates for printer monitoring.
 *
 * Features:
 * - Real-time printer status broadcasts
 * - Temperature monitoring with 2s updates
 * - Print progress tracking (1s when printing)
 * - Job completion/failure notifications
 * - Connection status tracking
 * - Auto-cleanup on disconnect
 */

const axios = require('axios');
const io = require('socket.io-client');
const jwt = require('jsonwebtoken');
const { createLogger } = require('../lib/logger');
const log = createLogger('PrintingSocket');

/**
 * FluxPrint WebSocket URL
 * Connect to FluxPrint's WebSocket endpoint to receive printer updates
 */
const FLUXPRINT_WS_URL = process.env.FLUXPRINT_WS_URL || 'http://localhost:5001';
const FLUXPRINT_ENABLED = process.env.ENABLE_FLUXPRINT === 'true';

module.exports = (namespace, JWT_SECRET) => {
  // SECURITY: JWT Authentication Middleware
  // This prevents unauthorized users from connecting to the printing namespace
  // and accessing print job data for projects they don't have access to
  namespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        log.warn('Printing socket connection rejected - no token');
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;

      log.info('Printing socket authenticated user', { userId: socket.userId, email: socket.userEmail });
      next();
    } catch (err) {
      log.warn('Printing socket invalid token', { error: err.message });
      return next(new Error('Invalid or expired token'));
    }
  });
  // Store active connections and FluxPrint client
  const activeClients = new Set();
  let fluxprintClient = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 10;
  const RECONNECT_DELAY = 5000; // 5 seconds

  /**
   * Connect to FluxPrint WebSocket server
   * Acts as a client to FluxPrint and broadcasts to FluxStudio clients
   */
  function connectToFluxPrint() {
    if (!FLUXPRINT_ENABLED) {
      log.warn('FluxPrint disabled, skipping WebSocket connection');
      return;
    }

    if (fluxprintClient && fluxprintClient.connected) {
      log.info('Already connected to FluxPrint WebSocket');
      return;
    }

    log.info('Connecting to FluxPrint WebSocket', { url: `${FLUXPRINT_WS_URL}/ws/printing` });

    fluxprintClient = io(`${FLUXPRINT_WS_URL}/ws/printing`, {
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      transports: ['websocket', 'polling']
    });

    // FluxPrint connection handlers
    fluxprintClient.on('connect', () => {
      log.info('Connected to FluxPrint WebSocket');
      reconnectAttempts = 0;

      // Notify all clients that connection is established
      namespace.emit('printer:connection', {
        connected: true,
        timestamp: Date.now()
      });

      // Request initial status
      fluxprintClient.emit('printer:request_status');
    });

    fluxprintClient.on('disconnect', (reason) => {
      log.warn('Disconnected from FluxPrint WebSocket', { reason });

      // Notify all clients
      namespace.emit('printer:connection', {
        connected: false,
        reason,
        timestamp: Date.now()
      });
    });

    fluxprintClient.on('connect_error', (error) => {
      reconnectAttempts++;
      log.error('FluxPrint WebSocket connection error', { attempt: reconnectAttempts, error: error.message });

      // Notify clients of connection issues
      if (activeClients.size > 0) {
        namespace.emit('printer:connection', {
          connected: false,
          error: error.message,
          reconnectAttempts,
          timestamp: Date.now()
        });
      }
    });

    // Forward FluxPrint events to FluxStudio clients
    fluxprintClient.on('printer:status', (data) => {
      namespace.emit('printer:status', data);
    });

    fluxprintClient.on('printer:temperature', (data) => {
      namespace.emit('printer:temperature', data);
    });

    fluxprintClient.on('printer:progress', (data) => {
      namespace.emit('printer:progress', data);
    });

    fluxprintClient.on('printer:job_complete', (data) => {
      namespace.emit('printer:job_complete', data);
    });

    fluxprintClient.on('printer:job_failed', (data) => {
      namespace.emit('printer:job_failed', data);
    });

    fluxprintClient.on('printer:connection', (data) => {
      namespace.emit('printer:connection', data);
    });
  }

  /**
   * Disconnect from FluxPrint WebSocket
   */
  function disconnectFromFluxPrint() {
    if (fluxprintClient) {
      log.info('Disconnecting from FluxPrint WebSocket');
      fluxprintClient.disconnect();
      fluxprintClient = null;
    }
  }

  // Initialize FluxPrint connection if enabled
  if (FLUXPRINT_ENABLED) {
    connectToFluxPrint();
  }

  // Client connection handlers
  namespace.on('connection', (socket) => {
    log.info('Client connected to /printing namespace', { socketId: socket.id });
    activeClients.add(socket.id);

    // If this is the first client and FluxPrint is not connected, connect now
    if (activeClients.size === 1 && FLUXPRINT_ENABLED && (!fluxprintClient || !fluxprintClient.connected)) {
      connectToFluxPrint();
    }

    // Send connection status to new client
    socket.emit('printer:connection', {
      connected: fluxprintClient ? fluxprintClient.connected : false,
      timestamp: Date.now()
    });

    // Phase 4A: Join project room for project-scoped updates
    // SECURITY: Check project access before allowing room join
    socket.on('project:join', async (projectId) => {
      try {
        if (!projectId || typeof projectId !== 'string') {
          return socket.emit('error', {
            message: 'Invalid project ID',
            code: 'INVALID_PROJECT_ID'
          });
        }

        // TODO: Implement project access check when database is available
        // For now, we trust that the user is authenticated (verified by middleware)
        // In production, you should check:
        // const hasAccess = await checkProjectAccess(socket.userId, projectId);
        // if (!hasAccess) { return socket.emit('error', { message: 'Unauthorized' }); }

        const room = `project:${projectId}`;
        socket.join(room);

        log.info('User joined project room', { userId: socket.userId, socketId: socket.id, room });
        socket.emit('project:joined', { projectId, room });
      } catch (error) {
        log.error('Error handling project:join', error);
        socket.emit('error', {
          message: 'Failed to join project room',
          code: 'PROJECT_JOIN_ERROR'
        });
      }
    });

    // Phase 4A: Leave project room
    socket.on('project:leave', (projectId) => {
      const room = `project:${projectId}`;
      socket.leave(room);
      log.info('Client left project room', { socketId: socket.id, room });
      socket.emit('project:left', { projectId, room });
    });

    // Handle client requests
    socket.on('printer:request_status', () => {
      log.info('Client requested printer status', { socketId: socket.id });

      if (fluxprintClient && fluxprintClient.connected) {
        // Forward request to FluxPrint
        fluxprintClient.emit('printer:request_status');
      } else {
        // FluxPrint not available, send error
        socket.emit('printer:connection', {
          connected: false,
          error: 'FluxPrint service not available',
          timestamp: Date.now()
        });
      }
    });

    socket.on('printer:subscribe', () => {
      log.info('Client subscribed to printer updates', { socketId: socket.id });
      socket.emit('printer:subscribed', { success: true });
    });

    socket.on('printer:unsubscribe', () => {
      log.info('Client unsubscribed from printer updates', { socketId: socket.id });
      socket.emit('printer:unsubscribed', { success: true });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      log.info('Client disconnected from /printing namespace', { socketId: socket.id });
      activeClients.delete(socket.id);

      // If no more clients, disconnect from FluxPrint to save resources
      if (activeClients.size === 0) {
        log.info('No more clients connected, keeping FluxPrint connection for quick reconnection');
        // We keep the connection alive for 60 seconds in case client reconnects
        setTimeout(() => {
          if (activeClients.size === 0 && fluxprintClient) {
            log.info('No clients for 60s, disconnecting from FluxPrint');
            disconnectFromFluxPrint();
          }
        }, 60000);
      }
    });
  });

  // Graceful shutdown handler
  process.on('SIGINT', () => {
    log.info('Shutting down printing namespace (SIGINT)');
    disconnectFromFluxPrint();
  });

  process.on('SIGTERM', () => {
    log.info('Shutting down printing namespace (SIGTERM)');
    disconnectFromFluxPrint();
  });

  log.info('Printing Socket.IO namespace initialized', { enabled: FLUXPRINT_ENABLED, url: FLUXPRINT_WS_URL });
};
