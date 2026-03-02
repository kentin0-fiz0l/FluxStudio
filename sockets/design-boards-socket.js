/**
 * Design Boards Socket.IO Namespace Handler
 * Real-time collaboration for 2D design boards
 *
 * Namespace: /design-boards
 * Purpose: Real-time node updates, cursor positions, board collaboration
 */

const jwt = require('jsonwebtoken');
const { createLogger } = require('../lib/logger');
const log = createLogger('DesignBoardsSocket');

module.exports = (namespace, designBoardsAdapter, JWT_SECRET) => {
  // Store active board sessions
  const boardSessions = new Map(); // boardId -> Set of { socketId, userId, userEmail, cursor }

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

  // Helper: Get users in a board room
  const getBoardUsers = (boardId) => {
    const session = boardSessions.get(boardId);
    if (!session) return [];
    return Array.from(session.values()).map(({ userId, userEmail, cursor }) => ({
      userId,
      userEmail,
      cursor
    }));
  };

  // Helper: Broadcast to board room except sender
  const broadcastToBoard = (socket, boardId, event, data) => {
    socket.to(`board:${boardId}`).emit(event, data);
  };

  // Socket.IO connection handling
  namespace.on('connection', async (socket) => {
    log.info('User connected', { userId: socket.userId });

    // Join a board for real-time collaboration
    socket.on('board:join', async (boardId) => {
      try {
        // Verify board exists
        const board = await designBoardsAdapter.getBoardById(boardId);
        if (!board) {
          socket.emit('error', { message: 'Board not found' });
          return;
        }

        // Join the board room
        socket.join(`board:${boardId}`);
        socket.currentBoardId = boardId;

        // Track user in board session
        if (!boardSessions.has(boardId)) {
          boardSessions.set(boardId, new Map());
        }
        boardSessions.get(boardId).set(socket.id, {
          userId: socket.userId,
          userEmail: socket.userEmail,
          cursor: null
        });

        log.info('User joined board', { userId: socket.userId, boardId });

        // Notify others in the room
        broadcastToBoard(socket, boardId, 'board:user-joined', {
          userId: socket.userId,
          userEmail: socket.userEmail
        });

        // Send current board state and users to the joining user
        const nodes = await designBoardsAdapter.getNodesForBoard(boardId);
        socket.emit('board:joined', {
          board,
          nodes,
          users: getBoardUsers(boardId)
        });
      } catch (error) {
        log.error('Error joining board', error);
        socket.emit('error', { message: 'Failed to join board' });
      }
    });

    // Leave a board
    socket.on('board:leave', (boardId) => {
      socket.leave(`board:${boardId}`);

      // Remove from board session
      const session = boardSessions.get(boardId);
      if (session) {
        session.delete(socket.id);
        if (session.size === 0) {
          boardSessions.delete(boardId);
        }
      }

      socket.currentBoardId = null;

      log.info('User left board', { userId: socket.userId, boardId });

      // Notify others in the room
      broadcastToBoard(socket, boardId, 'board:user-left', {
        userId: socket.userId
      });
    });

    // Update cursor position (for showing collaborator cursors)
    socket.on('cursor:move', (data) => {
      const { boardId, x, y } = data;

      // Update session cursor
      const session = boardSessions.get(boardId);
      if (session && session.has(socket.id)) {
        session.get(socket.id).cursor = { x, y };
      }

      // Broadcast to others
      broadcastToBoard(socket, boardId, 'cursor:moved', {
        userId: socket.userId,
        userEmail: socket.userEmail,
        x,
        y
      });
    });

    // Node created
    socket.on('node:create', async (data) => {
      const { boardId, node } = data;

      try {
        const createdNode = await designBoardsAdapter.createNode({
          boardId,
          type: node.type,
          assetId: node.assetId,
          x: node.x ?? 0,
          y: node.y ?? 0,
          width: node.width,
          height: node.height,
          zIndex: node.zIndex ?? 0,
          rotation: node.rotation ?? 0,
          locked: node.locked ?? false,
          data: node.data ?? {}
        });

        // Log event
        await designBoardsAdapter.logEvent({
          boardId,
          userId: socket.userId,
          eventType: 'node_created',
          payload: { nodeId: createdNode.id, type: node.type }
        });

        // Broadcast to all (including sender for confirmation)
        namespace.to(`board:${boardId}`).emit('node:created', {
          node: createdNode,
          userId: socket.userId
        });
      } catch (error) {
        log.error('Error creating node', error);
        socket.emit('error', { message: 'Failed to create node' });
      }
    });

    // Node updated (position, size, rotation, data)
    socket.on('node:update', async (data) => {
      const { boardId, nodeId, patch } = data;

      try {
        const updatedNode = await designBoardsAdapter.updateNode(nodeId, patch);

        if (!updatedNode) {
          socket.emit('error', { message: 'Node not found' });
          return;
        }

        // Log event
        await designBoardsAdapter.logEvent({
          boardId,
          userId: socket.userId,
          eventType: 'node_updated',
          payload: { nodeId, changes: Object.keys(patch) }
        });

        // Broadcast to all (including sender for confirmation)
        namespace.to(`board:${boardId}`).emit('node:updated', {
          node: updatedNode,
          userId: socket.userId
        });
      } catch (error) {
        log.error('Error updating node', error);
        socket.emit('error', { message: 'Failed to update node' });
      }
    });

    // Node deleted
    socket.on('node:delete', async (data) => {
      const { boardId, nodeId } = data;

      try {
        const deleted = await designBoardsAdapter.deleteNode(nodeId);

        if (!deleted) {
          socket.emit('error', { message: 'Node not found' });
          return;
        }

        // Log event
        await designBoardsAdapter.logEvent({
          boardId,
          userId: socket.userId,
          eventType: 'node_deleted',
          payload: { nodeId }
        });

        // Broadcast to all
        namespace.to(`board:${boardId}`).emit('node:deleted', {
          nodeId,
          userId: socket.userId
        });
      } catch (error) {
        log.error('Error deleting node', error);
        socket.emit('error', { message: 'Failed to delete node' });
      }
    });

    // Bulk node position update (for multi-select drag)
    socket.on('nodes:bulk-position', async (data) => {
      const { boardId, updates } = data;

      try {
        const updatedNodes = await designBoardsAdapter.bulkUpdateNodePositions(boardId, updates);

        // Log event
        await designBoardsAdapter.logEvent({
          boardId,
          userId: socket.userId,
          eventType: 'nodes_repositioned',
          payload: { count: updates.length, nodeIds: updates.map(u => u.nodeId) }
        });

        // Broadcast to all
        namespace.to(`board:${boardId}`).emit('nodes:bulk-updated', {
          nodes: updatedNodes,
          userId: socket.userId
        });
      } catch (error) {
        log.error('Error bulk updating nodes', error);
        socket.emit('error', { message: 'Failed to bulk update nodes' });
      }
    });

    // Node selection (show what other users have selected)
    socket.on('node:select', (data) => {
      const { boardId, nodeId } = data;

      broadcastToBoard(socket, boardId, 'node:selected', {
        nodeId,
        userId: socket.userId,
        userEmail: socket.userEmail
      });
    });

    // Node deselection
    socket.on('node:deselect', (data) => {
      const { boardId, nodeId } = data;

      broadcastToBoard(socket, boardId, 'node:deselected', {
        nodeId,
        userId: socket.userId
      });
    });

    // Board metadata updated (name, description, etc.)
    socket.on('board:update', async (data) => {
      const { boardId, patch } = data;

      try {
        const updatedBoard = await designBoardsAdapter.updateBoard(boardId, patch);

        if (!updatedBoard) {
          socket.emit('error', { message: 'Board not found' });
          return;
        }

        // Log event
        await designBoardsAdapter.logEvent({
          boardId,
          userId: socket.userId,
          eventType: 'board_updated',
          payload: { changes: Object.keys(patch) }
        });

        // Broadcast to all
        namespace.to(`board:${boardId}`).emit('board:updated', {
          board: updatedBoard,
          userId: socket.userId
        });
      } catch (error) {
        log.error('Error updating board', error);
        socket.emit('error', { message: 'Failed to update board' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      log.info('User disconnected', { userId: socket.userId });

      // Clean up all board sessions this user was part of
      for (const [boardId, session] of boardSessions.entries()) {
        if (session.has(socket.id)) {
          session.delete(socket.id);

          // Notify others in the room
          namespace.to(`board:${boardId}`).emit('board:user-left', {
            userId: socket.userId
          });

          // Clean up empty sessions
          if (session.size === 0) {
            boardSessions.delete(boardId);
          }
        }
      }
    });
  });

  // Export helper for external notifications (e.g., from REST API)
  return {
    notifyBoardUpdate: (boardId, event, data) => {
      namespace.to(`board:${boardId}`).emit(event, data);
    },
    getBoardUsers
  };
};
