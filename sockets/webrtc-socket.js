/**
 * WebRTC Signaling Socket.IO Namespace Handler
 * Namespace: /webrtc
 * Purpose: Relay WebRTC signaling messages for voice/video calls
 *
 * Features:
 * - JWT authentication middleware
 * - Call initiation, accept, reject, and end
 * - ICE candidate and SDP offer/answer relay
 * - Participant presence (joined/left)
 * - In-memory active call state
 */

const jwt = require('jsonwebtoken');
const { createLogger } = require('../lib/logger');
const { validateSocketPayload, checkSocketRateLimit, cleanupSocket } = require('../lib/socketValidation');
const schemas = require('../lib/schemas/sockets');
const log = createLogger('WebRTCSocket');

module.exports = (namespace, JWT_SECRET) => {
  // In-memory store of active calls
  // Map<callId, { initiator, participants: Set<userId>, createdAt }>
  const activeCalls = new Map();

  // Map userId -> socket for routing signals to specific users
  const userSockets = new Map();

  // SECURITY: JWT Authentication Middleware
  namespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        log.warn('WebRTC socket connection rejected - no token');
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.userName = decoded.name || decoded.email;

      log.info('WebRTC socket authenticated', { userId: socket.userId });
      next();
    } catch (err) {
      log.warn('WebRTC socket invalid token', { error: err.message });
      return next(new Error('Invalid or expired token'));
    }
  });

  namespace.on('connection', (socket) => {
    const userId = socket.userId;
    log.info('WebRTC client connected', { userId });

    // Track user socket for signaling relay
    userSockets.set(userId, socket);

    // ------------------------------------------------------------------
    // call:initiate -- Start a new call
    // ------------------------------------------------------------------
    socket.on('call:initiate', (data) => {
      if (!checkSocketRateLimit(socket, 'call:initiate', 5, 10000)) return;
      const validated = validateSocketPayload(schemas.callInitiateSchema, data, socket);
      if (!validated) return;
      const { callId, participantIds, callType } = validated;
      log.info('Call initiated', { callId, initiator: userId, participantIds, callType });

      // Store call state
      activeCalls.set(callId, {
        initiator: userId,
        callType: callType || 'video',
        participants: new Set([userId]),
        createdAt: Date.now(),
      });

      // Join the call room
      socket.join(`call:${callId}`);

      // Notify target participants
      for (const targetId of participantIds) {
        const targetSocket = userSockets.get(targetId);
        if (targetSocket) {
          targetSocket.emit('call:incoming', {
            callId,
            callType: callType || 'video',
            fromUserId: userId,
            fromUserName: socket.userName,
          });
        }
      }
    });

    // ------------------------------------------------------------------
    // call:accept -- Accept an incoming call
    // ------------------------------------------------------------------
    socket.on('call:accept', (data) => {
      if (!checkSocketRateLimit(socket, 'call:accept', 5, 10000)) return;
      const validated = validateSocketPayload(schemas.callAcceptSchema, data, socket);
      if (!validated) return;
      const { callId } = validated;
      log.info('Call accepted', { callId, userId });

      const call = activeCalls.get(callId);
      if (!call) return;

      call.participants.add(userId);
      socket.join(`call:${callId}`);

      // Notify all participants in the call
      socket.to(`call:${callId}`).emit('call:participant-joined', {
        callId,
        userId,
        userName: socket.userName,
      });
    });

    // ------------------------------------------------------------------
    // call:reject -- Reject an incoming call
    // ------------------------------------------------------------------
    socket.on('call:reject', (data) => {
      if (!checkSocketRateLimit(socket, 'call:reject', 5, 10000)) return;
      const validated = validateSocketPayload(schemas.callRejectSchema, data, socket);
      if (!validated) return;
      const { callId } = validated;
      log.info('Call rejected', { callId, userId });

      const call = activeCalls.get(callId);
      if (!call) return;

      // Notify the initiator
      const initiatorSocket = userSockets.get(call.initiator);
      if (initiatorSocket) {
        initiatorSocket.emit('call:rejected', {
          callId,
          userId,
          userName: socket.userName,
        });
      }
    });

    // ------------------------------------------------------------------
    // call:end -- End/leave a call
    // ------------------------------------------------------------------
    socket.on('call:end', (data) => {
      if (!checkSocketRateLimit(socket, 'call:end', 5, 10000)) return;
      const validated = validateSocketPayload(schemas.callEndSchema, data, socket);
      if (!validated) return;
      const { callId } = validated;
      log.info('Call ended by user', { callId, userId });

      const call = activeCalls.get(callId);
      if (!call) return;

      call.participants.delete(userId);
      socket.leave(`call:${callId}`);

      // Notify remaining participants
      socket.to(`call:${callId}`).emit('call:participant-left', {
        callId,
        userId,
        userName: socket.userName,
      });

      // Clean up call if no participants remain
      if (call.participants.size === 0) {
        activeCalls.delete(callId);
        log.info('Call cleaned up (no participants)', { callId });
      }
    });

    // ------------------------------------------------------------------
    // signal -- Forward signaling messages (offer/answer/ICE candidates)
    // ------------------------------------------------------------------
    socket.on('signal', (data) => {
      if (!checkSocketRateLimit(socket, 'signal', 30, 5000)) return;
      const validated = validateSocketPayload(schemas.signalSchema, data, socket);
      if (!validated) return;
      const { callId, targetUserId, signal } = validated;
      const targetSocket = userSockets.get(targetUserId);
      if (targetSocket) {
        targetSocket.emit('signal', {
          callId,
          fromUserId: userId,
          signal,
        });
      }
    });

    // ------------------------------------------------------------------
    // Disconnect cleanup
    // ------------------------------------------------------------------
    socket.on('disconnect', () => {
      log.info('WebRTC client disconnected', { userId });
      cleanupSocket(socket.id);
      userSockets.delete(userId);

      // Remove from any active calls
      for (const [callId, call] of activeCalls.entries()) {
        if (call.participants.has(userId)) {
          call.participants.delete(userId);

          namespace.to(`call:${callId}`).emit('call:participant-left', {
            callId,
            userId,
            userName: socket.userName,
          });

          if (call.participants.size === 0) {
            activeCalls.delete(callId);
            log.info('Call cleaned up on disconnect', { callId });
          }
        }
      }
    });
  });

  log.info('WebRTC signaling namespace initialized');
};
