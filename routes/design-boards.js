/**
 * Design Boards Routes - 2D Collaborative Surfaces API
 *
 * Provides endpoints for:
 * - Board CRUD operations
 * - Node management (text, asset, shape)
 * - Bulk position updates
 * - Board statistics
 * - Event logging
 *
 * All endpoints require authentication.
 */

const express = require('express');
const { authenticateToken } = require('../lib/auth/middleware');
const designBoardsAdapter = require('../database/design-boards-adapter');
const { createLogger } = require('../lib/logger');
const log = createLogger('DesignBoards');
const { zodValidate } = require('../middleware/zodValidate');
const { createBoardSchema, updateBoardSchema, createNodeSchema, bulkPositionSchema } = require('../lib/schemas/design-boards');

const router = express.Router();

/**
 * GET /api/projects/:projectId/boards
 * List boards for a project
 */
router.get('/projects/:projectId/boards', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { includeArchived } = req.query;

    const boards = await designBoardsAdapter.listBoardsForProject({
      projectId,
      includeArchived: includeArchived === 'true'
    });

    res.json({ success: true, boards });
  } catch (error) {
    log.error('Error listing boards', error);
    res.status(500).json({ success: false, error: 'Failed to list boards' });
  }
});

/**
 * POST /api/projects/:projectId/boards
 * Create a new board
 */
router.post('/projects/:projectId/boards', authenticateToken, zodValidate(createBoardSchema), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, organizationId } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Board name is required' });
    }

    const board = await designBoardsAdapter.createBoard({
      projectId,
      organizationId,
      ownerId: req.user.id,
      name: name.trim(),
      description
    });

    // Log the creation event
    await designBoardsAdapter.logEvent({
      boardId: board.id,
      userId: req.user.id,
      eventType: 'board_created',
      payload: { name: board.name }
    });

    res.status(201).json({ success: true, board });
  } catch (error) {
    log.error('Error creating board', error);
    res.status(500).json({ success: false, error: 'Failed to create board' });
  }
});

/**
 * GET /api/projects/:projectId/boards/stats
 * Get board stats for a project
 */
router.get('/projects/:projectId/boards/stats', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const stats = await designBoardsAdapter.getBoardStatsForProject(projectId);

    res.json({ success: true, stats });
  } catch (error) {
    log.error('Error getting board stats', error);
    res.status(500).json({ success: false, error: 'Failed to get board stats' });
  }
});

/**
 * GET /api/boards/:boardId
 * Get a single board with nodes
 */
router.get('/:boardId', authenticateToken, async (req, res) => {
  try {
    const { boardId } = req.params;

    const board = await designBoardsAdapter.getBoardById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    const nodes = await designBoardsAdapter.getNodesForBoard(boardId);

    res.json({ success: true, board, nodes });
  } catch (error) {
    log.error('Error getting board', error);
    res.status(500).json({ success: false, error: 'Failed to get board' });
  }
});

/**
 * PATCH /api/boards/:boardId
 * Update board metadata
 */
router.patch('/:boardId', authenticateToken, zodValidate(updateBoardSchema), async (req, res) => {
  try {
    const { boardId } = req.params;
    const { name, description, isArchived, thumbnailAssetId } = req.body;

    const board = await designBoardsAdapter.getBoardById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    const updatedBoard = await designBoardsAdapter.updateBoard(boardId, {
      name,
      description,
      isArchived,
      thumbnailAssetId
    });

    // Log the update event
    await designBoardsAdapter.logEvent({
      boardId,
      userId: req.user.id,
      eventType: 'board_updated',
      payload: { changes: { name, description, isArchived, thumbnailAssetId } }
    });

    res.json({ success: true, board: updatedBoard });
  } catch (error) {
    log.error('Error updating board', error);
    res.status(500).json({ success: false, error: 'Failed to update board' });
  }
});

/**
 * DELETE /api/boards/:boardId
 * Delete a board
 */
router.delete('/:boardId', authenticateToken, async (req, res) => {
  try {
    const { boardId } = req.params;

    const board = await designBoardsAdapter.getBoardById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    await designBoardsAdapter.deleteBoard(boardId);

    res.json({ success: true, message: 'Board deleted' });
  } catch (error) {
    log.error('Error deleting board', error);
    res.status(500).json({ success: false, error: 'Failed to delete board' });
  }
});

/**
 * POST /api/boards/:boardId/nodes
 * Create a node on a board
 */
router.post('/:boardId/nodes', authenticateToken, zodValidate(createNodeSchema), async (req, res) => {
  try {
    const { boardId } = req.params;
    const { type, assetId, x, y, width, height, zIndex, rotation, locked, data } = req.body;

    if (!type) {
      return res.status(400).json({ success: false, error: 'Node type is required' });
    }

    const validTypes = ['text', 'asset', 'shape'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: `Invalid node type. Must be one of: ${validTypes.join(', ')}` });
    }

    if (type === 'asset' && !assetId) {
      return res.status(400).json({ success: false, error: 'Asset ID is required for asset nodes' });
    }

    const board = await designBoardsAdapter.getBoardById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    const node = await designBoardsAdapter.createNode({
      boardId,
      type,
      assetId,
      x: x ?? 0,
      y: y ?? 0,
      width,
      height,
      zIndex: zIndex ?? 0,
      rotation: rotation ?? 0,
      locked: locked ?? false,
      data: data ?? {}
    });

    // Log the creation event
    await designBoardsAdapter.logEvent({
      boardId,
      userId: req.user.id,
      eventType: 'node_created',
      payload: { nodeId: node.id, type, assetId }
    });

    res.status(201).json({ success: true, node });
  } catch (error) {
    log.error('Error creating node', error);
    res.status(500).json({ success: false, error: 'Failed to create node' });
  }
});

/**
 * GET /api/boards/:boardId/nodes
 * Get all nodes for a board
 */
router.get('/:boardId/nodes', authenticateToken, async (req, res) => {
  try {
    const { boardId } = req.params;

    const board = await designBoardsAdapter.getBoardById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    const nodes = await designBoardsAdapter.getNodesForBoard(boardId);

    res.json({ success: true, nodes });
  } catch (error) {
    log.error('Error getting nodes', error);
    res.status(500).json({ success: false, error: 'Failed to get nodes' });
  }
});

/**
 * PATCH /api/boards/:boardId/nodes/:nodeId
 * Update a node
 */
router.patch('/:boardId/nodes/:nodeId', authenticateToken, async (req, res) => {
  try {
    const { boardId, nodeId } = req.params;
    const patch = req.body;

    // Validate the board exists
    const board = await designBoardsAdapter.getBoardById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    const updatedNode = await designBoardsAdapter.updateNode(nodeId, patch);
    if (!updatedNode) {
      return res.status(404).json({ success: false, error: 'Node not found' });
    }

    // Log the update event
    await designBoardsAdapter.logEvent({
      boardId,
      userId: req.user.id,
      eventType: 'node_updated',
      payload: { nodeId, changes: patch }
    });

    res.json({ success: true, node: updatedNode });
  } catch (error) {
    log.error('Error updating node', error);
    res.status(500).json({ success: false, error: 'Failed to update node' });
  }
});

/**
 * DELETE /api/boards/:boardId/nodes/:nodeId
 * Delete a node
 */
router.delete('/:boardId/nodes/:nodeId', authenticateToken, async (req, res) => {
  try {
    const { boardId, nodeId } = req.params;

    // Validate the board exists
    const board = await designBoardsAdapter.getBoardById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    const deleted = await designBoardsAdapter.deleteNode(nodeId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Node not found' });
    }

    // Log the deletion event
    await designBoardsAdapter.logEvent({
      boardId,
      userId: req.user.id,
      eventType: 'node_deleted',
      payload: { nodeId }
    });

    res.json({ success: true, message: 'Node deleted' });
  } catch (error) {
    log.error('Error deleting node', error);
    res.status(500).json({ success: false, error: 'Failed to delete node' });
  }
});

/**
 * POST /api/boards/:boardId/nodes/bulk-position
 * Bulk update node positions
 */
router.post('/:boardId/nodes/bulk-position', authenticateToken, zodValidate(bulkPositionSchema), async (req, res) => {
  try {
    const { boardId } = req.params;
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Updates array is required' });
    }

    // Validate update format
    for (const update of updates) {
      if (!update.nodeId) {
        return res.status(400).json({ success: false, error: 'Each update must have a nodeId' });
      }
    }

    const board = await designBoardsAdapter.getBoardById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    const updatedNodes = await designBoardsAdapter.bulkUpdateNodePositions(boardId, updates);

    // Log the bulk update event
    await designBoardsAdapter.logEvent({
      boardId,
      userId: req.user.id,
      eventType: 'nodes_repositioned',
      payload: { count: updates.length, nodeIds: updates.map(u => u.nodeId) }
    });

    res.json({ success: true, nodes: updatedNodes });
  } catch (error) {
    log.error('Error bulk updating nodes', error);
    res.status(500).json({ success: false, error: 'Failed to bulk update nodes' });
  }
});

/**
 * GET /api/boards/:boardId/events
 * Get event history for a board
 */
router.get('/:boardId/events', authenticateToken, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const board = await designBoardsAdapter.getBoardById(boardId);
    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    const events = await designBoardsAdapter.getBoardEvents(boardId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ success: true, events });
  } catch (error) {
    log.error('Error getting board events', error);
    res.status(500).json({ success: false, error: 'Failed to get board events' });
  }
});

module.exports = router;
