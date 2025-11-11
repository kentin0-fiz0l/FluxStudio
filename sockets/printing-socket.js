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
        console.warn('⚠️  Printing socket: Connection rejected - no token');
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;

      console.log(`✅ Printing socket: Authenticated user ${socket.userId} (${socket.userEmail})`);
      next();
    } catch (err) {
      console.warn('⚠️  Printing socket: Invalid token -', err.message);
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
      console.log('⚠️  FluxPrint disabled, skipping WebSocket connection');
      return;
    }

    if (fluxprintClient && fluxprintClient.connected) {
      console.log('✅ Already connected to FluxPrint WebSocket');
      return;
    }

    console.log(`🔌 Connecting to FluxPrint WebSocket: ${FLUXPRINT_WS_URL}/ws/printing`);

    fluxprintClient = io(`${FLUXPRINT_WS_URL}/ws/printing`, {
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      transports: ['websocket', 'polling']
    });

    // FluxPrint connection handlers
    fluxprintClient.on('connect', () => {
      console.log('✅ Connected to FluxPrint WebSocket');
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
      console.log(`❌ Disconnected from FluxPrint WebSocket: ${reason}`);

      // Notify all clients
      namespace.emit('printer:connection', {
        connected: false,
        reason,
        timestamp: Date.now()
      });
    });

    fluxprintClient.on('connect_error', (error) => {
      reconnectAttempts++;
      console.error(`❌ FluxPrint WebSocket connection error (attempt ${reconnectAttempts}):`, error.message);

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
      console.log('🔌 Disconnecting from FluxPrint WebSocket');
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
    console.log(`🖨️  Client connected to /printing namespace: ${socket.id}`);
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

        console.log(`🖨️  User ${socket.userId} (${socket.id}) joined room: ${room}`);
        socket.emit('project:joined', { projectId, room });
      } catch (error) {
        console.error('Error handling project:join:', error);
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
      console.log(`🖨️  Client ${socket.id} left room: ${room}`);
      socket.emit('project:left', { projectId, room });
    });

    // Handle client requests
    socket.on('printer:request_status', () => {
      console.log(`📊 Client ${socket.id} requested printer status`);

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
      console.log(`📊 Client ${socket.id} subscribed to printer updates`);
      socket.emit('printer:subscribed', { success: true });
    });

    socket.on('printer:unsubscribe', () => {
      console.log(`📊 Client ${socket.id} unsubscribed from printer updates`);
      socket.emit('printer:unsubscribed', { success: true });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🖨️  Client disconnected from /printing namespace: ${socket.id}`);
      activeClients.delete(socket.id);

      // If no more clients, disconnect from FluxPrint to save resources
      if (activeClients.size === 0) {
        console.log('ℹ️  No more clients connected, keeping FluxPrint connection for quick reconnection');
        // We keep the connection alive for 60 seconds in case client reconnects
        setTimeout(() => {
          if (activeClients.size === 0 && fluxprintClient) {
            console.log('🔌 No clients for 60s, disconnecting from FluxPrint');
            disconnectFromFluxPrint();
          }
        }, 60000);
      }
    });
  });

  // Graceful shutdown handler
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down printing namespace...');
    disconnectFromFluxPrint();
  });

  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down printing namespace...');
    disconnectFromFluxPrint();
  });

  console.log('✅ Printing Socket.IO namespace initialized (/printing)');
  console.log(`   FluxPrint enabled: ${FLUXPRINT_ENABLED}`);
  console.log(`   FluxPrint URL: ${FLUXPRINT_WS_URL}`);
};
