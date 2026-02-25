/**
 * Formations Routes Unit Tests
 * Tests all formation, performer, keyframe, position, audio, scene object, and share endpoints
 * @file tests/routes/formations.routes.test.js
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Test configuration
const JWT_SECRET = 'test-jwt-secret-key-for-tests';

// ─── Mock formations adapter ───
const mockFormationsAdapter = {
  listFormationsForProject: jest.fn(),
  createFormation: jest.fn(),
  getFormationById: jest.fn(),
  updateFormation: jest.fn(),
  deleteFormation: jest.fn(),
  saveFormation: jest.fn(),
  addPerformer: jest.fn(),
  updatePerformer: jest.fn(),
  deletePerformer: jest.fn(),
  addKeyframe: jest.fn(),
  updateKeyframe: jest.fn(),
  deleteKeyframe: jest.fn(),
  setPosition: jest.fn(),
};

// ─── Mock scene objects adapter ───
const mockSceneObjectsAdapter = {
  listByFormation: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  bulkSync: jest.fn(),
};

jest.mock('../../database/formations-adapter', () => mockFormationsAdapter);
jest.mock('../../database/scene-objects-adapter', () => mockSceneObjectsAdapter);

// Mock auth middleware to use our JWT-based approach
jest.mock('../../lib/auth/middleware', () => ({
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Access token is required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
  },
}));

// Setup express app with formations routes
function createTestApp() {
  const app = express();
  app.use(express.json());

  const formationsRouter = require('../../routes/formations');
  app.use('/api', formationsRouter);

  return app;
}

// Helper to generate a valid JWT token
function generateToken(payload = {}) {
  return jwt.sign(
    { id: 'user-1', email: 'test@example.com', type: 'access', ...payload },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Formations Routes', () => {
  let app;
  let validToken;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
    validToken = generateToken();
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/projects/:projectId/formations
  // ═══════════════════════════════════════════════════════════

  describe('GET /api/projects/:projectId/formations', () => {
    it('should list formations for a project', async () => {
      const formations = [
        { id: 'f-1', name: 'Opening', projectId: 'proj-1' },
        { id: 'f-2', name: 'Halftime', projectId: 'proj-1' },
      ];
      mockFormationsAdapter.listFormationsForProject.mockResolvedValue(formations);

      const response = await request(app)
        .get('/api/projects/proj-1/formations')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.formations).toHaveLength(2);
      expect(mockFormationsAdapter.listFormationsForProject).toHaveBeenCalledWith({
        projectId: 'proj-1',
        includeArchived: false,
      });
    });

    it('should pass includeArchived query param', async () => {
      mockFormationsAdapter.listFormationsForProject.mockResolvedValue([]);

      await request(app)
        .get('/api/projects/proj-1/formations?includeArchived=true')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockFormationsAdapter.listFormationsForProject).toHaveBeenCalledWith({
        projectId: 'proj-1',
        includeArchived: true,
      });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/projects/proj-1/formations');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.listFormationsForProject.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/projects/proj-1/formations')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/projects/:projectId/formations
  // ═══════════════════════════════════════════════════════════

  describe('POST /api/projects/:projectId/formations', () => {
    it('should create a formation with valid data', async () => {
      const newFormation = { id: 'f-new', name: 'Opener', projectId: 'proj-1' };
      mockFormationsAdapter.createFormation.mockResolvedValue(newFormation);

      const response = await request(app)
        .post('/api/projects/proj-1/formations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Opener', description: 'Opening formation' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.formation.name).toBe('Opener');
      expect(mockFormationsAdapter.createFormation).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-1',
          name: 'Opener',
          createdBy: 'user-1',
        })
      );
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/projects/proj-1/formations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ description: 'No name' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('name is required');
    });

    it('should return 400 when name is empty string', async () => {
      const response = await request(app)
        .post('/api/projects/proj-1/formations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/projects/proj-1/formations')
        .send({ name: 'Test' });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.createFormation.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/projects/proj-1/formations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Test' });

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/formations/:formationId
  // ═══════════════════════════════════════════════════════════

  describe('GET /api/formations/:formationId', () => {
    it('should return a formation by ID', async () => {
      const formation = { id: 'f-1', name: 'Opener', performers: [], keyframes: [] };
      mockFormationsAdapter.getFormationById.mockResolvedValue(formation);

      const response = await request(app)
        .get('/api/formations/f-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.formation.id).toBe('f-1');
    });

    it('should return 404 when formation not found', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/formations/nonexistent')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/formations/f-1');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.getFormationById.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/formations/f-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PATCH /api/formations/:formationId
  // ═══════════════════════════════════════════════════════════

  describe('PATCH /api/formations/:formationId', () => {
    it('should update formation metadata', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1', name: 'Old' });
      mockFormationsAdapter.updateFormation.mockResolvedValue({ id: 'f-1', name: 'Updated' });

      const response = await request(app)
        .patch('/api/formations/f-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.formation.name).toBe('Updated');
    });

    it('should return 404 when formation not found', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/formations/nonexistent')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .patch('/api/formations/f-1')
        .send({ name: 'Updated' });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1' });
      mockFormationsAdapter.updateFormation.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .patch('/api/formations/f-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/formations/:formationId
  // ═══════════════════════════════════════════════════════════

  describe('DELETE /api/formations/:formationId', () => {
    it('should delete a formation', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1' });
      mockFormationsAdapter.deleteFormation.mockResolvedValue();

      const response = await request(app)
        .delete('/api/formations/f-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 404 when formation not found', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/formations/nonexistent')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/formations/f-1');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1' });
      mockFormationsAdapter.deleteFormation.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .delete('/api/formations/f-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PUT /api/formations/:formationId/save
  // ═══════════════════════════════════════════════════════════

  describe('PUT /api/formations/:formationId/save', () => {
    it('should bulk save formation data', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1' });
      mockFormationsAdapter.saveFormation.mockResolvedValue({
        id: 'f-1',
        name: 'Saved',
        performers: [{ id: 'p-1' }],
        keyframes: [{ id: 'k-1' }],
      });

      const response = await request(app)
        .put('/api/formations/f-1/save')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Saved',
          performers: [{ id: 'p-1', name: 'Alice' }],
          keyframes: [{ id: 'k-1', timestampMs: 0 }],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 when formation not found', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/formations/nonexistent/save')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Test' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put('/api/formations/f-1/save')
        .send({ name: 'Test' });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1' });
      mockFormationsAdapter.saveFormation.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .put('/api/formations/f-1/save')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Test' });

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/formations/:formationId/audio
  // ═══════════════════════════════════════════════════════════

  describe('POST /api/formations/:formationId/audio', () => {
    it('should upload audio track', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1' });
      mockFormationsAdapter.updateFormation.mockResolvedValue({ id: 'f-1', audioTrack: { url: 'https://cdn.example.com/track.mp3' } });

      const response = await request(app)
        .post('/api/formations/f-1/audio')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ url: 'https://cdn.example.com/track.mp3', filename: 'track.mp3', duration: 180 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.audioTrack).toBeDefined();
    });

    it('should return 400 when url or filename missing', async () => {
      const response = await request(app)
        .post('/api/formations/f-1/audio')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ duration: 180 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return 404 when formation not found', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/formations/nonexistent/audio')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ url: 'https://cdn.example.com/track.mp3', filename: 'track.mp3' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/formations/f-1/audio')
        .send({ url: 'https://cdn.example.com/track.mp3', filename: 'track.mp3' });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1' });
      mockFormationsAdapter.updateFormation.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/formations/f-1/audio')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ url: 'https://cdn.example.com/track.mp3', filename: 'track.mp3' });

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/formations/:formationId/audio
  // ═══════════════════════════════════════════════════════════

  describe('DELETE /api/formations/:formationId/audio', () => {
    it('should remove audio track', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1', audioTrack: { url: 'x' } });
      mockFormationsAdapter.updateFormation.mockResolvedValue({ id: 'f-1', audioTrack: null });

      const response = await request(app)
        .delete('/api/formations/f-1/audio')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Audio removed');
    });

    it('should return 404 when formation not found', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/formations/nonexistent/audio')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/formations/f-1/audio');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1' });
      mockFormationsAdapter.updateFormation.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .delete('/api/formations/f-1/audio')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/formations/:formationId/performers
  // ═══════════════════════════════════════════════════════════

  describe('POST /api/formations/:formationId/performers', () => {
    it('should add a performer', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1' });
      mockFormationsAdapter.addPerformer.mockResolvedValue({
        id: 'p-1', name: 'Alice', label: 'A1', formationId: 'f-1',
      });

      const response = await request(app)
        .post('/api/formations/f-1/performers')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Alice', label: 'A1', color: '#ff0000' });

      expect(response.status).toBe(201);
      expect(response.body.performer.name).toBe('Alice');
    });

    it('should return 400 when name or label missing', async () => {
      const response = await request(app)
        .post('/api/formations/f-1/performers')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Alice' }); // missing label

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return 404 when formation not found', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/formations/nonexistent/performers')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Alice', label: 'A1' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/formations/f-1/performers')
        .send({ name: 'Alice', label: 'A1' });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1' });
      mockFormationsAdapter.addPerformer.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/formations/f-1/performers')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Alice', label: 'A1' });

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PATCH /api/formations/:formationId/performers/:performerId
  // ═══════════════════════════════════════════════════════════

  describe('PATCH /api/formations/:formationId/performers/:performerId', () => {
    it('should update a performer', async () => {
      mockFormationsAdapter.updatePerformer.mockResolvedValue({
        id: 'p-1', name: 'Bob', label: 'B1',
      });

      const response = await request(app)
        .patch('/api/formations/f-1/performers/p-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Bob' });

      expect(response.status).toBe(200);
      expect(response.body.performer.name).toBe('Bob');
    });

    it('should return 404 when performer not found', async () => {
      mockFormationsAdapter.updatePerformer.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/formations/f-1/performers/nonexistent')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Bob' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .patch('/api/formations/f-1/performers/p-1')
        .send({ name: 'Bob' });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.updatePerformer.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .patch('/api/formations/f-1/performers/p-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Bob' });

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/formations/:formationId/performers/:performerId
  // ═══════════════════════════════════════════════════════════

  describe('DELETE /api/formations/:formationId/performers/:performerId', () => {
    it('should delete a performer', async () => {
      mockFormationsAdapter.deletePerformer.mockResolvedValue();

      const response = await request(app)
        .delete('/api/formations/f-1/performers/p-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/formations/f-1/performers/p-1');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.deletePerformer.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .delete('/api/formations/f-1/performers/p-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/formations/:formationId/keyframes
  // ═══════════════════════════════════════════════════════════

  describe('POST /api/formations/:formationId/keyframes', () => {
    it('should add a keyframe', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1' });
      mockFormationsAdapter.addKeyframe.mockResolvedValue({
        id: 'k-1', formationId: 'f-1', timestampMs: 5000,
      });

      const response = await request(app)
        .post('/api/formations/f-1/keyframes')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ timestampMs: 5000, transition: 'linear', duration: 2000 });

      expect(response.status).toBe(201);
      expect(response.body.keyframe.timestampMs).toBe(5000);
    });

    it('should return 404 when formation not found', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/formations/nonexistent/keyframes')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ timestampMs: 0 });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/formations/f-1/keyframes')
        .send({ timestampMs: 0 });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1' });
      mockFormationsAdapter.addKeyframe.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/formations/f-1/keyframes')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ timestampMs: 0 });

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PATCH /api/formations/:formationId/keyframes/:keyframeId
  // ═══════════════════════════════════════════════════════════

  describe('PATCH /api/formations/:formationId/keyframes/:keyframeId', () => {
    it('should update a keyframe', async () => {
      mockFormationsAdapter.updateKeyframe.mockResolvedValue({
        id: 'k-1', timestampMs: 10000, transition: 'ease',
      });

      const response = await request(app)
        .patch('/api/formations/f-1/keyframes/k-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ timestampMs: 10000 });

      expect(response.status).toBe(200);
      expect(response.body.keyframe.timestampMs).toBe(10000);
    });

    it('should return 404 when keyframe not found', async () => {
      mockFormationsAdapter.updateKeyframe.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/formations/f-1/keyframes/nonexistent')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ timestampMs: 10000 });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .patch('/api/formations/f-1/keyframes/k-1')
        .send({ timestampMs: 10000 });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.updateKeyframe.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .patch('/api/formations/f-1/keyframes/k-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ timestampMs: 10000 });

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/formations/:formationId/keyframes/:keyframeId
  // ═══════════════════════════════════════════════════════════

  describe('DELETE /api/formations/:formationId/keyframes/:keyframeId', () => {
    it('should delete a keyframe', async () => {
      mockFormationsAdapter.deleteKeyframe.mockResolvedValue();

      const response = await request(app)
        .delete('/api/formations/f-1/keyframes/k-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/formations/f-1/keyframes/k-1');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.deleteKeyframe.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .delete('/api/formations/f-1/keyframes/k-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PUT /api/formations/:formationId/keyframes/:keyframeId/positions/:performerId
  // ═══════════════════════════════════════════════════════════

  describe('PUT /api/formations/:formationId/keyframes/:keyframeId/positions/:performerId', () => {
    it('should set performer position', async () => {
      mockFormationsAdapter.setPosition.mockResolvedValue({
        keyframeId: 'k-1', performerId: 'p-1', x: 50, y: 30, rotation: 90,
      });

      const response = await request(app)
        .put('/api/formations/f-1/keyframes/k-1/positions/p-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ x: 50, y: 30, rotation: 90 });

      expect(response.status).toBe(200);
      expect(response.body.position.x).toBe(50);
      expect(response.body.position.y).toBe(30);
    });

    it('should return 400 when x or y is missing', async () => {
      const response = await request(app)
        .put('/api/formations/f-1/keyframes/k-1/positions/p-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ rotation: 90 }); // missing x and y

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put('/api/formations/f-1/keyframes/k-1/positions/p-1')
        .send({ x: 50, y: 30 });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.setPosition.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .put('/api/formations/f-1/keyframes/k-1/positions/p-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ x: 50, y: 30 });

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/formations/:formationId/scene-objects
  // ═══════════════════════════════════════════════════════════

  describe('GET /api/formations/:formationId/scene-objects', () => {
    it('should list scene objects', async () => {
      mockSceneObjectsAdapter.listByFormation.mockResolvedValue([
        { id: 'so-1', name: 'Prop', type: 'image' },
      ]);

      const response = await request(app)
        .get('/api/formations/f-1/scene-objects')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.sceneObjects).toHaveLength(1);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/formations/f-1/scene-objects');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockSceneObjectsAdapter.listByFormation.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/formations/f-1/scene-objects')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/formations/:formationId/scene-objects
  // ═══════════════════════════════════════════════════════════

  describe('POST /api/formations/:formationId/scene-objects', () => {
    const validSceneObject = {
      name: 'Flag',
      type: 'image',
      position: { x: 10, y: 20 },
      source: { url: 'https://cdn.example.com/flag.png' },
    };

    it('should create a scene object', async () => {
      mockSceneObjectsAdapter.create.mockResolvedValue({ id: 'so-1', ...validSceneObject });

      const response = await request(app)
        .post('/api/formations/f-1/scene-objects')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validSceneObject);

      expect(response.status).toBe(201);
      expect(response.body.sceneObject.name).toBe('Flag');
    });

    it('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .post('/api/formations/f-1/scene-objects')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Flag' }); // missing type, position, source

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/formations/f-1/scene-objects')
        .send(validSceneObject);

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockSceneObjectsAdapter.create.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/formations/f-1/scene-objects')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validSceneObject);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PATCH /api/formations/:formationId/scene-objects/:objectId
  // ═══════════════════════════════════════════════════════════

  describe('PATCH /api/formations/:formationId/scene-objects/:objectId', () => {
    it('should update a scene object', async () => {
      mockSceneObjectsAdapter.update.mockResolvedValue({ id: 'so-1', name: 'Renamed' });

      const response = await request(app)
        .patch('/api/formations/f-1/scene-objects/so-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Renamed' });

      expect(response.status).toBe(200);
      expect(response.body.sceneObject.name).toBe('Renamed');
    });

    it('should return 404 when scene object not found', async () => {
      mockSceneObjectsAdapter.update.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/formations/f-1/scene-objects/nonexistent')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Renamed' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .patch('/api/formations/f-1/scene-objects/so-1')
        .send({ name: 'Renamed' });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockSceneObjectsAdapter.update.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .patch('/api/formations/f-1/scene-objects/so-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Renamed' });

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/formations/:formationId/scene-objects/:objectId
  // ═══════════════════════════════════════════════════════════

  describe('DELETE /api/formations/:formationId/scene-objects/:objectId', () => {
    it('should delete a scene object', async () => {
      mockSceneObjectsAdapter.remove.mockResolvedValue();

      const response = await request(app)
        .delete('/api/formations/f-1/scene-objects/so-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/formations/f-1/scene-objects/so-1');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockSceneObjectsAdapter.remove.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .delete('/api/formations/f-1/scene-objects/so-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PUT /api/formations/:formationId/scene-objects (bulk sync)
  // ═══════════════════════════════════════════════════════════

  describe('PUT /api/formations/:formationId/scene-objects', () => {
    it('should bulk sync scene objects', async () => {
      mockSceneObjectsAdapter.bulkSync.mockResolvedValue([
        { id: 'so-1', name: 'A' },
        { id: 'so-2', name: 'B' },
      ]);

      const response = await request(app)
        .put('/api/formations/f-1/scene-objects')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ objects: [{ id: 'so-1', name: 'A' }, { id: 'so-2', name: 'B' }] });

      expect(response.status).toBe(200);
      expect(response.body.sceneObjects).toHaveLength(2);
    });

    it('should return 400 when objects is not an array', async () => {
      const response = await request(app)
        .put('/api/formations/f-1/scene-objects')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ objects: 'not-an-array' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put('/api/formations/f-1/scene-objects')
        .send({ objects: [] });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockSceneObjectsAdapter.bulkSync.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .put('/api/formations/f-1/scene-objects')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ objects: [] });

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/formations/:formationId/share (public, no auth)
  // ═══════════════════════════════════════════════════════════

  describe('GET /api/formations/:formationId/share', () => {
    it('should return public formation data without auth', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({
        id: 'f-1',
        name: 'Public Formation',
        description: 'Shared',
        stageWidth: 100,
        stageHeight: 100,
        gridSize: 5,
        performers: [{ id: 'p-1' }],
        keyframes: [{ id: 'k-1' }],
      });

      const response = await request(app).get('/api/formations/f-1/share');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Public Formation');
      expect(response.body.data.performers).toHaveLength(1);
    });

    it('should return 404 when formation not found', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue(null);

      const response = await request(app).get('/api/formations/nonexistent/share');

      expect(response.status).toBe(404);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.getFormationById.mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/api/formations/f-1/share');

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/formations/:formationId/share (auth required)
  // ═══════════════════════════════════════════════════════════

  describe('POST /api/formations/:formationId/share', () => {
    it('should generate a share URL', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue({ id: 'f-1', name: 'Shared' });

      const response = await request(app)
        .post('/api/formations/f-1/share')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.shareUrl).toContain('f-1');
    });

    it('should return 404 when formation not found', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/formations/nonexistent/share')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/formations/f-1/share');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockFormationsAdapter.getFormationById.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/formations/f-1/share')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });
});
