/**
 * Formations Route Integration Tests
 *
 * Tests formation CRUD, performer management, keyframe management,
 * position setting, audio tracks, and bulk save operations.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

// --- Mocks ---

jest.mock('../../database/config', () => ({
  query: jest.fn(),
  runMigrations: jest.fn()
}));

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
  setPosition: jest.fn()
};

jest.mock('../../database/formations-adapter', () => mockFormationsAdapter);

function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign({ id: userId, email: 'test@example.com', userType: 'client', ...extra }, JWT_SECRET, { expiresIn: '1h' });
}

function createApp() {
  const app = express();
  app.use(express.json());
  const formationRoutes = require('../../routes/formations');
  app.use('/api', formationRoutes);
  return app;
}

describe('Formations Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);
  });

  beforeEach(() => {
    Object.values(mockFormationsAdapter).forEach(fn => fn.mockReset());
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for GET /api/projects/:projectId/formations without token', async () => {
      await request(app).get('/api/projects/proj-1/formations').expect(401);
    });

    it('should return 401 for POST /api/projects/:projectId/formations without token', async () => {
      await request(app).post('/api/projects/proj-1/formations').send({ name: 'Test' }).expect(401);
    });

    it('should return 401 for GET /api/formations/:id without token', async () => {
      await request(app).get('/api/formations/f-1').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/projects/proj-1/formations')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // =========================================================================
  // GET /api/projects/:projectId/formations
  // =========================================================================
  describe('GET /api/projects/:projectId/formations', () => {
    it('should return formations for a project', async () => {
      mockFormationsAdapter.listFormationsForProject.mockResolvedValueOnce([
        { id: 'f-1', name: 'Opening', projectId: 'proj-1' },
        { id: 'f-2', name: 'Finale', projectId: 'proj-1' }
      ]);

      const res = await request(app)
        .get('/api/projects/proj-1/formations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.formations).toHaveLength(2);
    });

    it('should pass includeArchived parameter', async () => {
      mockFormationsAdapter.listFormationsForProject.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/projects/proj-1/formations?includeArchived=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockFormationsAdapter.listFormationsForProject).toHaveBeenCalledWith({
        projectId: 'proj-1',
        includeArchived: true
      });
    });

    it('should handle errors', async () => {
      mockFormationsAdapter.listFormationsForProject.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/projects/proj-1/formations')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to list formations');
    });
  });

  // =========================================================================
  // POST /api/projects/:projectId/formations
  // =========================================================================
  describe('POST /api/projects/:projectId/formations', () => {
    it('should create a new formation', async () => {
      const mockFormation = { id: 'f-new', name: 'Opening', projectId: 'proj-1' };
      mockFormationsAdapter.createFormation.mockResolvedValueOnce(mockFormation);

      const res = await request(app)
        .post('/api/projects/proj-1/formations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Opening', description: 'Opening formation', stageWidth: 800, stageHeight: 600 })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.formation.name).toBe('Opening');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/projects/proj-1/formations')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No name' })
        .expect(400);

      expect(res.body.error).toBe('Formation name is required');
    });

    it('should return 400 when name is empty string', async () => {
      const res = await request(app)
        .post('/api/projects/proj-1/formations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '   ' })
        .expect(400);

      expect(res.body.error).toBe('Formation name is required');
    });

    it('should handle errors', async () => {
      mockFormationsAdapter.createFormation.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/api/projects/proj-1/formations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test' })
        .expect(500);

      expect(res.body.error).toBe('Failed to create formation');
    });
  });

  // =========================================================================
  // GET /api/formations/:formationId
  // =========================================================================
  describe('GET /api/formations/:formationId', () => {
    it('should return a formation by ID', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce({
        id: 'f-1',
        name: 'Opening',
        performers: [],
        keyframes: []
      });

      const res = await request(app)
        .get('/api/formations/f-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.formation.id).toBe('f-1');
    });

    it('should return 404 for non-existent formation', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/formations/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Formation not found');
    });
  });

  // =========================================================================
  // PATCH /api/formations/:formationId
  // =========================================================================
  describe('PATCH /api/formations/:formationId', () => {
    it('should update formation metadata', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce({ id: 'f-1', name: 'Old Name' });
      mockFormationsAdapter.updateFormation.mockResolvedValueOnce({ id: 'f-1', name: 'New Name' });

      const res = await request(app)
        .patch('/api/formations/f-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.formation.name).toBe('New Name');
    });

    it('should return 404 for non-existent formation', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch('/api/formations/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test' })
        .expect(404);

      expect(res.body.error).toBe('Formation not found');
    });
  });

  // =========================================================================
  // DELETE /api/formations/:formationId
  // =========================================================================
  describe('DELETE /api/formations/:formationId', () => {
    it('should delete a formation', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce({ id: 'f-1' });
      mockFormationsAdapter.deleteFormation.mockResolvedValueOnce();

      const res = await request(app)
        .delete('/api/formations/f-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Formation deleted');
    });

    it('should return 404 for non-existent formation', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce(null);

      const res = await request(app)
        .delete('/api/formations/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Formation not found');
    });
  });

  // =========================================================================
  // PUT /api/formations/:formationId/save
  // =========================================================================
  describe('PUT /api/formations/:formationId/save', () => {
    it('should bulk save formation data', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce({ id: 'f-1' });
      mockFormationsAdapter.saveFormation.mockResolvedValueOnce({
        id: 'f-1',
        name: 'Saved',
        performers: [{ id: 'p-1' }],
        keyframes: [{ id: 'k-1' }]
      });

      const res = await request(app)
        .put('/api/formations/f-1/save')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Saved',
          performers: [{ name: 'Alice', label: 'A' }],
          keyframes: [{ timestampMs: 0 }]
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.formation.performers).toHaveLength(1);
    });

    it('should return 404 for non-existent formation', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce(null);

      const res = await request(app)
        .put('/api/formations/nonexistent/save')
        .set('Authorization', `Bearer ${token}`)
        .send({ performers: [] })
        .expect(404);

      expect(res.body.error).toBe('Formation not found');
    });
  });

  // =========================================================================
  // Audio Endpoints
  // =========================================================================
  describe('Audio Endpoints', () => {
    it('POST /api/formations/:formationId/audio should upload audio', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce({ id: 'f-1' });
      mockFormationsAdapter.updateFormation.mockResolvedValueOnce({ id: 'f-1', audioTrack: { url: 'audio.mp3' } });

      const res = await request(app)
        .post('/api/formations/f-1/audio')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'audio.mp3', filename: 'track.mp3', duration: 120 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.audioTrack).toBeDefined();
    });

    it('POST /api/formations/:formationId/audio should return 400 without url or filename', async () => {
      const res = await request(app)
        .post('/api/formations/f-1/audio')
        .set('Authorization', `Bearer ${token}`)
        .send({ duration: 120 })
        .expect(400);

      expect(res.body.error).toBe('Audio URL and filename are required');
    });

    it('POST /api/formations/:formationId/audio should return 404 for non-existent formation', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/formations/nonexistent/audio')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'audio.mp3', filename: 'track.mp3' })
        .expect(404);

      expect(res.body.error).toBe('Formation not found');
    });

    it('DELETE /api/formations/:formationId/audio should remove audio', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce({ id: 'f-1' });
      mockFormationsAdapter.updateFormation.mockResolvedValueOnce({ id: 'f-1', audioTrack: null });

      const res = await request(app)
        .delete('/api/formations/f-1/audio')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Audio removed');
    });
  });

  // =========================================================================
  // Performer Endpoints
  // =========================================================================
  describe('Performer Endpoints', () => {
    it('POST should add a performer', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce({ id: 'f-1' });
      mockFormationsAdapter.addPerformer.mockResolvedValueOnce({
        id: 'p-1',
        name: 'Alice',
        label: 'A',
        color: '#ff0000'
      });

      const res = await request(app)
        .post('/api/formations/f-1/performers')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Alice', label: 'A', color: '#ff0000' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.performer.name).toBe('Alice');
    });

    it('POST should return 400 without name or label', async () => {
      const res = await request(app)
        .post('/api/formations/f-1/performers')
        .set('Authorization', `Bearer ${token}`)
        .send({ color: '#ff0000' })
        .expect(400);

      expect(res.body.error).toBe('Performer name and label are required');
    });

    it('POST should return 404 for non-existent formation', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/formations/nonexistent/performers')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Alice', label: 'A' })
        .expect(404);

      expect(res.body.error).toBe('Formation not found');
    });

    it('PATCH should update a performer', async () => {
      mockFormationsAdapter.updatePerformer.mockResolvedValueOnce({
        id: 'p-1',
        name: 'Bob',
        label: 'B'
      });

      const res = await request(app)
        .patch('/api/formations/f-1/performers/p-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bob', label: 'B' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.performer.name).toBe('Bob');
    });

    it('PATCH should return 404 for non-existent performer', async () => {
      mockFormationsAdapter.updatePerformer.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch('/api/formations/f-1/performers/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test' })
        .expect(404);

      expect(res.body.error).toBe('Performer not found');
    });

    it('DELETE should delete a performer', async () => {
      mockFormationsAdapter.deletePerformer.mockResolvedValueOnce();

      const res = await request(app)
        .delete('/api/formations/f-1/performers/p-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Performer deleted');
    });
  });

  // =========================================================================
  // Keyframe Endpoints
  // =========================================================================
  describe('Keyframe Endpoints', () => {
    it('POST should add a keyframe', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce({ id: 'f-1' });
      mockFormationsAdapter.addKeyframe.mockResolvedValueOnce({
        id: 'k-1',
        timestampMs: 5000,
        transition: 'linear'
      });

      const res = await request(app)
        .post('/api/formations/f-1/keyframes')
        .set('Authorization', `Bearer ${token}`)
        .send({ timestampMs: 5000, transition: 'linear', duration: 1000 })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.keyframe.timestampMs).toBe(5000);
    });

    it('POST should return 404 for non-existent formation', async () => {
      mockFormationsAdapter.getFormationById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/formations/nonexistent/keyframes')
        .set('Authorization', `Bearer ${token}`)
        .send({ timestampMs: 0 })
        .expect(404);

      expect(res.body.error).toBe('Formation not found');
    });

    it('PATCH should update a keyframe', async () => {
      mockFormationsAdapter.updateKeyframe.mockResolvedValueOnce({
        id: 'k-1',
        timestampMs: 10000
      });

      const res = await request(app)
        .patch('/api/formations/f-1/keyframes/k-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ timestampMs: 10000 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.keyframe.timestampMs).toBe(10000);
    });

    it('PATCH should return 404 for non-existent keyframe', async () => {
      mockFormationsAdapter.updateKeyframe.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch('/api/formations/f-1/keyframes/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .send({ timestampMs: 0 })
        .expect(404);

      expect(res.body.error).toBe('Keyframe not found');
    });

    it('DELETE should delete a keyframe', async () => {
      mockFormationsAdapter.deleteKeyframe.mockResolvedValueOnce();

      const res = await request(app)
        .delete('/api/formations/f-1/keyframes/k-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Keyframe deleted');
    });
  });

  // =========================================================================
  // Position Endpoints
  // =========================================================================
  describe('Position Endpoints', () => {
    it('PUT should set performer position', async () => {
      mockFormationsAdapter.setPosition.mockResolvedValueOnce({
        keyframeId: 'k-1',
        performerId: 'p-1',
        x: 100,
        y: 200,
        rotation: 45
      });

      const res = await request(app)
        .put('/api/formations/f-1/keyframes/k-1/positions/p-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ x: 100, y: 200, rotation: 45 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.position.x).toBe(100);
      expect(res.body.position.y).toBe(200);
    });

    it('PUT should return 400 when x or y is missing', async () => {
      const res = await request(app)
        .put('/api/formations/f-1/keyframes/k-1/positions/p-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ rotation: 45 })
        .expect(400);

      expect(res.body.error).toBe('Position x and y are required');
    });
  });
});
