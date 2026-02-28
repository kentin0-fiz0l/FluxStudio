/**
 * Design Boards Route Integration Tests
 *
 * Tests board CRUD, node management, bulk position updates,
 * and error handling for the design boards API.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

// --- Mocks ---

// Mock database/config
jest.mock('../../database/config', () => ({
  query: jest.fn(),
  runMigrations: jest.fn()
}));

// Mock lib/auth/tokenService
jest.mock('../../lib/auth/tokenService', () => ({
  verifyAccessToken: jest.fn((token) => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }),
  generateAccessToken: jest.fn()
}));

// Mock auditLog
jest.mock('../../lib/auditLog', () => ({
  logAction: jest.fn()
}));

// Mock logger
jest.mock('../../lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })
}));

// Mock design-boards Zod schemas — pass through to test route handler logic
jest.mock('../../lib/schemas/design-boards', () => {
  const { z } = require('zod');
  return {
    createBoardSchema: z.object({
      name: z.string().min(1, 'Board name is required').optional(),
      description: z.string().optional(),
      organizationId: z.string().optional(),
    }),
    updateBoardSchema: z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      isArchived: z.boolean().optional(),
      thumbnailAssetId: z.string().optional(),
    }),
    createNodeSchema: z.object({
      type: z.string().optional(),
      assetId: z.string().optional(),
      x: z.number().default(0),
      y: z.number().default(0),
      width: z.number().optional(),
      height: z.number().optional(),
      zIndex: z.number().default(0),
      rotation: z.number().default(0),
      locked: z.boolean().default(false),
      data: z.record(z.unknown()).default({}),
    }),
    bulkPositionSchema: z.object({
      updates: z.array(z.object({
        nodeId: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        zIndex: z.number().optional(),
        rotation: z.number().optional(),
      })).optional(),
    }),
  };
});

// Mock design-boards adapter
jest.mock('../../database/design-boards-adapter', () => ({
  listBoardsForProject: jest.fn(),
  createBoard: jest.fn(),
  getBoardById: jest.fn(),
  getNodesForBoard: jest.fn(),
  updateBoard: jest.fn(),
  deleteBoard: jest.fn(),
  createNode: jest.fn(),
  updateNode: jest.fn(),
  deleteNode: jest.fn(),
  bulkUpdateNodePositions: jest.fn(),
  getBoardStatsForProject: jest.fn(),
  getBoardEvents: jest.fn(),
  logEvent: jest.fn(),
}));

const adapter = require('../../database/design-boards-adapter');

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with design-boards routes
function createApp() {
  const app = express();
  app.use(express.json());
  const routes = require('../../routes/design-boards');
  app.use('/api/boards', routes);
  return app;
}

describe('Design Boards Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for GET /api/boards/projects/:projectId/boards without token', async () => {
      await request(app).get('/api/boards/projects/proj-1/boards').expect(401);
    });

    it('should return 401 for POST /api/boards/projects/:projectId/boards without token', async () => {
      await request(app).post('/api/boards/projects/proj-1/boards').send({ name: 'Test' }).expect(401);
    });

    it('should return 401 for GET /api/boards/:boardId without token', async () => {
      await request(app).get('/api/boards/board-1').expect(401);
    });
  });

  // =========================================================================
  // POST /api/boards/projects/:projectId/boards — Create Board
  // =========================================================================
  describe('POST /api/boards/projects/:projectId/boards', () => {
    it('should create a board with name and description', async () => {
      const mockBoard = {
        id: 'board-1',
        name: 'My Board',
        description: 'A design board',
        projectId: 'proj-1',
        ownerId: userId,
      };
      adapter.createBoard.mockResolvedValueOnce(mockBoard);
      adapter.logEvent.mockResolvedValueOnce();

      const res = await request(app)
        .post('/api/boards/projects/proj-1/boards')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'My Board', description: 'A design board' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.board.id).toBe('board-1');
      expect(res.body.board.name).toBe('My Board');
      expect(adapter.createBoard).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-1',
          ownerId: userId,
          name: 'My Board',
          description: 'A design board',
        })
      );
      expect(adapter.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          boardId: 'board-1',
          userId,
          eventType: 'board_created',
        })
      );
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/boards/projects/proj-1/boards')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No name' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Board name is required');
    });

    it('should return 400 when name is empty string', async () => {
      const res = await request(app)
        .post('/api/boards/projects/proj-1/boards')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '   ' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Board name is required');
    });
  });

  // =========================================================================
  // GET /api/boards/:boardId — Get Board
  // =========================================================================
  describe('GET /api/boards/:boardId', () => {
    it('should return board with nodes', async () => {
      const mockBoard = { id: 'board-1', name: 'My Board', projectId: 'proj-1' };
      const mockNodes = [
        { id: 'node-1', type: 'text', x: 10, y: 20 },
        { id: 'node-2', type: 'asset', x: 100, y: 200 },
      ];
      adapter.getBoardById.mockResolvedValueOnce(mockBoard);
      adapter.getNodesForBoard.mockResolvedValueOnce(mockNodes);

      const res = await request(app)
        .get('/api/boards/board-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.board.id).toBe('board-1');
      expect(res.body.nodes).toHaveLength(2);
    });

    it('should return 404 when board not found', async () => {
      adapter.getBoardById.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/boards/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Board not found');
    });
  });

  // =========================================================================
  // PATCH /api/boards/:boardId — Update Board
  // =========================================================================
  describe('PATCH /api/boards/:boardId', () => {
    it('should update board with name, description, isArchived', async () => {
      const mockBoard = { id: 'board-1', name: 'Old Name' };
      const updatedBoard = { id: 'board-1', name: 'New Name', description: 'Updated', isArchived: true };
      adapter.getBoardById.mockResolvedValueOnce(mockBoard);
      adapter.updateBoard.mockResolvedValueOnce(updatedBoard);
      adapter.logEvent.mockResolvedValueOnce();

      const res = await request(app)
        .patch('/api/boards/board-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name', description: 'Updated', isArchived: true })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.board.name).toBe('New Name');
      expect(adapter.updateBoard).toHaveBeenCalledWith('board-1', expect.objectContaining({
        name: 'New Name',
        description: 'Updated',
        isArchived: true,
      }));
    });

    it('should return 404 when board not found', async () => {
      adapter.getBoardById.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch('/api/boards/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(res.body.error).toBe('Board not found');
    });
  });

  // =========================================================================
  // DELETE /api/boards/:boardId — Delete Board
  // =========================================================================
  describe('DELETE /api/boards/:boardId', () => {
    it('should delete board successfully', async () => {
      adapter.getBoardById.mockResolvedValueOnce({ id: 'board-1', name: 'Board' });
      adapter.deleteBoard.mockResolvedValueOnce();

      const res = await request(app)
        .delete('/api/boards/board-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Board deleted');
      expect(adapter.deleteBoard).toHaveBeenCalledWith('board-1');
    });

    it('should return 404 when board not found', async () => {
      adapter.getBoardById.mockResolvedValueOnce(null);

      const res = await request(app)
        .delete('/api/boards/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Board not found');
    });
  });

  // =========================================================================
  // POST /api/boards/:boardId/nodes — Create Node
  // =========================================================================
  describe('POST /api/boards/:boardId/nodes', () => {
    it('should create a node with type, position, dimensions', async () => {
      adapter.getBoardById.mockResolvedValueOnce({ id: 'board-1' });
      const mockNode = { id: 'node-1', boardId: 'board-1', type: 'text', x: 50, y: 100, width: 200, height: 150 };
      adapter.createNode.mockResolvedValueOnce(mockNode);
      adapter.logEvent.mockResolvedValueOnce();

      const res = await request(app)
        .post('/api/boards/board-1/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'text', x: 50, y: 100, width: 200, height: 150 })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.node.id).toBe('node-1');
      expect(res.body.node.type).toBe('text');
      expect(adapter.createNode).toHaveBeenCalledWith(
        expect.objectContaining({ boardId: 'board-1', type: 'text', x: 50, y: 100 })
      );
    });

    it('should return 400 when type is missing', async () => {
      const res = await request(app)
        .post('/api/boards/board-1/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({ x: 10, y: 20 })
        .expect(400);

      expect(res.body.error).toBe('Node type is required');
    });

    it('should return 400 when type is invalid', async () => {
      const res = await request(app)
        .post('/api/boards/board-1/nodes')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'invalid-type' })
        .expect(400);

      expect(res.body.error).toContain('Invalid node type');
    });
  });

  // =========================================================================
  // PATCH /api/boards/:boardId/nodes/:nodeId — Update Node
  // =========================================================================
  describe('PATCH /api/boards/:boardId/nodes/:nodeId', () => {
    it('should update node position', async () => {
      adapter.getBoardById.mockResolvedValueOnce({ id: 'board-1' });
      const updatedNode = { id: 'node-1', x: 300, y: 400 };
      adapter.updateNode.mockResolvedValueOnce(updatedNode);
      adapter.logEvent.mockResolvedValueOnce();

      const res = await request(app)
        .patch('/api/boards/board-1/nodes/node-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ x: 300, y: 400 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.node.x).toBe(300);
      expect(res.body.node.y).toBe(400);
    });
  });

  // =========================================================================
  // DELETE /api/boards/:boardId/nodes/:nodeId — Delete Node
  // =========================================================================
  describe('DELETE /api/boards/:boardId/nodes/:nodeId', () => {
    it('should delete node successfully', async () => {
      adapter.getBoardById.mockResolvedValueOnce({ id: 'board-1' });
      adapter.deleteNode.mockResolvedValueOnce(true);
      adapter.logEvent.mockResolvedValueOnce();

      const res = await request(app)
        .delete('/api/boards/board-1/nodes/node-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Node deleted');
    });

    it('should return 404 when node not found', async () => {
      adapter.getBoardById.mockResolvedValueOnce({ id: 'board-1' });
      adapter.deleteNode.mockResolvedValueOnce(null);

      const res = await request(app)
        .delete('/api/boards/board-1/nodes/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Node not found');
    });
  });

  // =========================================================================
  // POST /api/boards/:boardId/nodes/bulk-position — Bulk Position Update
  // =========================================================================
  describe('POST /api/boards/:boardId/nodes/bulk-position', () => {
    it('should bulk update node positions', async () => {
      adapter.getBoardById.mockResolvedValueOnce({ id: 'board-1' });
      const updatedNodes = [
        { id: 'node-1', x: 10, y: 20 },
        { id: 'node-2', x: 30, y: 40 },
      ];
      adapter.bulkUpdateNodePositions.mockResolvedValueOnce(updatedNodes);
      adapter.logEvent.mockResolvedValueOnce();

      const res = await request(app)
        .post('/api/boards/board-1/nodes/bulk-position')
        .set('Authorization', `Bearer ${token}`)
        .send({
          updates: [
            { nodeId: 'node-1', x: 10, y: 20 },
            { nodeId: 'node-2', x: 30, y: 40 },
          ]
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.nodes).toHaveLength(2);
    });

    it('should return 400 when updates array is empty', async () => {
      const res = await request(app)
        .post('/api/boards/board-1/nodes/bulk-position')
        .set('Authorization', `Bearer ${token}`)
        .send({ updates: [] })
        .expect(400);

      expect(res.body.error).toBe('Updates array is required');
    });

    it('should return 400 when update is missing nodeId', async () => {
      const res = await request(app)
        .post('/api/boards/board-1/nodes/bulk-position')
        .set('Authorization', `Bearer ${token}`)
        .send({ updates: [{ x: 10, y: 20 }] })
        .expect(400);

      expect(res.body.error).toBe('Each update must have a nodeId');
    });
  });

  // =========================================================================
  // Database Error Handling
  // =========================================================================
  describe('Database error handling', () => {
    it('should return 500 when adapter throws on listing boards', async () => {
      adapter.listBoardsForProject.mockRejectedValueOnce(new Error('DB connection failed'));

      const res = await request(app)
        .get('/api/boards/projects/proj-1/boards')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to list boards');
    });

    it('should return 500 when adapter throws on creating board', async () => {
      adapter.createBoard.mockRejectedValueOnce(new Error('Insert failed'));

      const res = await request(app)
        .post('/api/boards/projects/proj-1/boards')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Failing Board' })
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to create board');
    });

    it('should return 500 when adapter throws on getting board', async () => {
      adapter.getBoardById.mockRejectedValueOnce(new Error('Query failed'));

      const res = await request(app)
        .get('/api/boards/board-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to get board');
    });
  });
});
