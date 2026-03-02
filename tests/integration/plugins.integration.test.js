/**
 * Plugins Route Integration Tests
 *
 * Tests plugin CRUD operations, installation, settings management,
 * and error handling.
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

const { query } = require('../../database/config');

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

const { logAction } = require('../../lib/auditLog');

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with plugins routes
function createApp() {
  const app = express();
  app.use(express.json());
  const routes = require('../../routes/plugins');
  app.use('/api/plugins', routes);
  return app;
}

describe('Plugins Integration Tests', () => {
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
    it('should return 401 for GET /api/plugins without token', async () => {
      await request(app).get('/api/plugins').expect(401);
    });

    it('should return 401 for POST /api/plugins/install without token', async () => {
      await request(app).post('/api/plugins/install').send({}).expect(401);
    });
  });

  // =========================================================================
  // GET /api/plugins — List Installed Plugins
  // =========================================================================
  describe('GET /api/plugins', () => {
    it('should list installed plugins for current user', async () => {
      const mockPlugins = [
        {
          id: 'inst-1',
          plugin_id: 'dark-theme-pro',
          manifest: { id: 'dark-theme-pro', name: 'Dark Theme Pro', version: '1.0.0', main: 'index.js' },
          state: 'active',
          settings: {},
          installed_at: '2025-01-01',
          updated_at: '2025-01-02',
        },
      ];
      query.mockResolvedValueOnce({ rows: mockPlugins });

      const res = await request(app)
        .get('/api/plugins')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.plugins).toHaveLength(1);
      expect(res.body.plugins[0].pluginId).toBe('dark-theme-pro');
      expect(res.body.plugins[0].state).toBe('active');
    });
  });

  // =========================================================================
  // POST /api/plugins/install — Install Plugin
  // =========================================================================
  describe('POST /api/plugins/install', () => {
    it('should install a plugin with valid manifest', async () => {
      const manifest = {
        id: 'new-plugin',
        name: 'New Plugin',
        version: '1.0.0',
        main: 'plugins/new-plugin/index.js',
      };

      // Check existing (none)
      query.mockResolvedValueOnce({ rows: [] });
      // Insert
      query.mockResolvedValueOnce({
        rows: [{
          id: 'inst-2',
          plugin_id: 'new-plugin',
          manifest: JSON.stringify(manifest),
          state: 'inactive',
          settings: JSON.stringify({}),
          installed_at: '2025-01-01',
          updated_at: '2025-01-01',
        }]
      });

      const res = await request(app)
        .post('/api/plugins/install')
        .set('Authorization', `Bearer ${token}`)
        .send({ manifest })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.plugin.pluginId).toBe('new-plugin');
      expect(res.body.plugin.state).toBe('inactive');
      expect(logAction).toHaveBeenCalledWith(
        userId, 'install', 'plugin', 'new-plugin',
        expect.objectContaining({ name: 'New Plugin' }),
        expect.anything()
      );
    });

    it('should return 400 when manifest is invalid (missing required fields)', async () => {
      const res = await request(app)
        .post('/api/plugins/install')
        .set('Authorization', `Bearer ${token}`)
        .send({ manifest: { id: 'incomplete' } })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 409 when plugin already installed', async () => {
      const manifest = {
        id: 'existing-plugin',
        name: 'Existing Plugin',
        version: '1.0.0',
        main: 'index.js',
      };
      query.mockResolvedValueOnce({ rows: [{ id: 'inst-existing' }] });

      const res = await request(app)
        .post('/api/plugins/install')
        .set('Authorization', `Bearer ${token}`)
        .send({ manifest })
        .expect(409);

      expect(res.body.error).toBe('Plugin already installed');
    });
  });

  // =========================================================================
  // DELETE /api/plugins/:pluginId — Uninstall Plugin
  // =========================================================================
  describe('DELETE /api/plugins/:pluginId', () => {
    it('should uninstall a plugin successfully', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'inst-1' }] });

      const res = await request(app)
        .delete('/api/plugins/dark-theme-pro')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(logAction).toHaveBeenCalledWith(
        userId, 'uninstall', 'plugin', 'dark-theme-pro', {}, expect.anything()
      );
    });

    it('should return 404 when plugin not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/plugins/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Plugin not found');
    });
  });

  // =========================================================================
  // GET /api/plugins/:pluginId/settings — Get Plugin Settings
  // =========================================================================
  describe('GET /api/plugins/:pluginId/settings', () => {
    it('should return plugin settings', async () => {
      query.mockResolvedValueOnce({ rows: [{ settings: { theme: 'dark', fontSize: 14 } }] });

      const res = await request(app)
        .get('/api/plugins/dark-theme-pro/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.settings.theme).toBe('dark');
      expect(res.body.settings.fontSize).toBe(14);
    });

    it('should return 404 when plugin not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/plugins/nonexistent/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Plugin not found');
    });
  });

  // =========================================================================
  // PUT /api/plugins/:pluginId/settings — Update Plugin Settings
  // =========================================================================
  describe('PUT /api/plugins/:pluginId/settings', () => {
    it('should update plugin settings', async () => {
      const updatedSettings = { theme: 'light', fontSize: 16 };
      query.mockResolvedValueOnce({ rows: [{ settings: updatedSettings }] });

      const res = await request(app)
        .put('/api/plugins/dark-theme-pro/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ settings: { theme: 'light', fontSize: 16 } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.settings.theme).toBe('light');
    });

    it('should return 400 when settings is not an object', async () => {
      const res = await request(app)
        .put('/api/plugins/dark-theme-pro/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ settings: 'not-an-object' })
        .expect(400);

      expect(res.body.error).toBe('Expected object, received string');
    });

    it('should return 404 when plugin not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/plugins/nonexistent/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ settings: { key: 'value' } })
        .expect(404);

      expect(res.body.error).toBe('Plugin not found');
    });
  });

  // =========================================================================
  // Database Error Handling
  // =========================================================================
  describe('Database error handling', () => {
    it('should return 500 when query throws on list', async () => {
      query.mockRejectedValueOnce(new Error('DB connection failed'));

      const res = await request(app)
        .get('/api/plugins')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to list plugins');
    });

    it('should return 500 when query throws on install', async () => {
      const manifest = {
        id: 'fail-plugin',
        name: 'Fail Plugin',
        version: '1.0.0',
        main: 'index.js',
      };
      // Check existing passes
      query.mockResolvedValueOnce({ rows: [] });
      // Insert fails
      query.mockRejectedValueOnce(new Error('Insert failed'));

      const res = await request(app)
        .post('/api/plugins/install')
        .set('Authorization', `Bearer ${token}`)
        .send({ manifest })
        .expect(500);

      expect(res.body.error).toBe('Failed to install plugin');
    });

    it('should return 500 when query throws on uninstall', async () => {
      query.mockRejectedValueOnce(new Error('Delete failed'));

      const res = await request(app)
        .delete('/api/plugins/some-plugin')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to uninstall plugin');
    });
  });
});
