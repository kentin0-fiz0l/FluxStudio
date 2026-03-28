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
const { asyncHandler } = require('../middleware/errorHandler');
const { createBoardSchema, updateBoardSchema, createNodeSchema, bulkPositionSchema } = require('../lib/schemas/design-boards');
const { logAction } = require('../lib/auditLog');

const router = express.Router();

/**
 * GET /api/projects/:projectId/boards
 * List boards for a project
 */
router.get('/projects/:projectId/boards', authenticateToken, asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { includeArchived } = req.query;

  const boards = await designBoardsAdapter.listBoardsForProject({
    projectId,
    includeArchived: includeArchived === 'true'
  });

  res.json({ success: true, boards });
}));

/**
 * POST /api/projects/:projectId/boards
 * Create a new board
 */
router.post('/projects/:projectId/boards', authenticateToken, zodValidate(createBoardSchema), asyncHandler(async (req, res) => {
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

  logAction(req.user.id, 'create', 'design_board', board.id, { name: board.name, projectId }, req);

  res.status(201).json({ success: true, board });
}));

/**
 * GET /api/projects/:projectId/boards/stats
 * Get board stats for a project
 */
router.get('/projects/:projectId/boards/stats', authenticateToken, asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const stats = await designBoardsAdapter.getBoardStatsForProject(projectId);

  res.json({ success: true, stats });
}));

/**
 * GET /api/boards/:boardId
 * Get a single board with nodes
 */
router.get('/:boardId', authenticateToken, asyncHandler(async (req, res) => {
  const { boardId } = req.params;

  const board = await designBoardsAdapter.getBoardById(boardId);
  if (!board) {
    return res.status(404).json({ success: false, error: 'Board not found' });
  }

  const nodes = await designBoardsAdapter.getNodesForBoard(boardId);

  res.json({ success: true, board, nodes });
}));

/**
 * PATCH /api/boards/:boardId
 * Update board metadata
 */
router.patch('/:boardId', authenticateToken, zodValidate(updateBoardSchema), asyncHandler(async (req, res) => {
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

  logAction(req.user.id, 'update', 'design_board', boardId, { changes: { name, description, isArchived, thumbnailAssetId } }, req);

  res.json({ success: true, board: updatedBoard });
}));

/**
 * DELETE /api/boards/:boardId
 * Delete a board
 */
router.delete('/:boardId', authenticateToken, asyncHandler(async (req, res) => {
  const { boardId } = req.params;

  const board = await designBoardsAdapter.getBoardById(boardId);
  if (!board) {
    return res.status(404).json({ success: false, error: 'Board not found' });
  }

  await designBoardsAdapter.deleteBoard(boardId);

  logAction(req.user.id, 'delete', 'design_board', boardId, {}, req);

  res.json({ success: true, message: 'Board deleted' });
}));

/**
 * POST /api/boards/:boardId/nodes
 * Create a node on a board
 */
router.post('/:boardId/nodes', authenticateToken, zodValidate(createNodeSchema), asyncHandler(async (req, res) => {
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
}));

/**
 * GET /api/boards/:boardId/nodes
 * Get all nodes for a board
 */
router.get('/:boardId/nodes', authenticateToken, asyncHandler(async (req, res) => {
  const { boardId } = req.params;

  const board = await designBoardsAdapter.getBoardById(boardId);
  if (!board) {
    return res.status(404).json({ success: false, error: 'Board not found' });
  }

  const nodes = await designBoardsAdapter.getNodesForBoard(boardId);

  res.json({ success: true, nodes });
}));

/**
 * PATCH /api/boards/:boardId/nodes/:nodeId
 * Update a node
 */
router.patch('/:boardId/nodes/:nodeId', authenticateToken, asyncHandler(async (req, res) => {
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
}));

/**
 * DELETE /api/boards/:boardId/nodes/:nodeId
 * Delete a node
 */
router.delete('/:boardId/nodes/:nodeId', authenticateToken, asyncHandler(async (req, res) => {
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
}));

/**
 * POST /api/boards/:boardId/nodes/bulk-position
 * Bulk update node positions
 */
router.post('/:boardId/nodes/bulk-position', authenticateToken, zodValidate(bulkPositionSchema), asyncHandler(async (req, res) => {
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
}));

/**
 * GET /api/boards/:boardId/events
 * Get event history for a board
 */
router.get('/:boardId/events', authenticateToken, asyncHandler(async (req, res) => {
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
}));

module.exports = router;
