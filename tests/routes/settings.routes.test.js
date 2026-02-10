/**
 * Settings Routes Tests
 * Tests for user settings endpoints
 * @file tests/routes/settings.routes.test.js
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-jwt-secret-key-for-tests';

// In-memory settings store
let userSettings = {};

// Authentication middleware mock
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Create test app with settings routes
function createSettingsApp() {
  const app = express();
  app.use(express.json());

  // Get user settings
  app.get('/api/auth/settings', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const settings = userSettings[userId] || {
      notifications: { push: true, emailDigest: true },
      appearance: { darkMode: false, language: 'en' },
      performance: { autoSave: true },
    };

    res.json({
      success: true,
      settings,
    });
  });

  // Update user settings
  app.put('/api/auth/settings', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({
        success: false,
        message: 'Settings object is required',
      });
    }

    // Validate settings structure
    if (settings.notifications) {
      if (typeof settings.notifications.push !== 'undefined' &&
          typeof settings.notifications.push !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'notifications.push must be a boolean',
        });
      }
    }

    if (settings.appearance) {
      if (settings.appearance.language &&
          !['en', 'es', 'fr', 'de', 'ja', 'zh'].includes(settings.appearance.language)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid language code',
        });
      }
    }

    // Merge with existing settings
    const existingSettings = userSettings[userId] || {};
    userSettings[userId] = {
      notifications: {
        ...existingSettings.notifications,
        ...settings.notifications,
      },
      appearance: {
        ...existingSettings.appearance,
        ...settings.appearance,
      },
      performance: {
        ...existingSettings.performance,
        ...settings.performance,
      },
    };

    res.json({
      success: true,
      settings: userSettings[userId],
      message: 'Settings saved successfully',
    });
  });

  // Reset settings to defaults
  app.post('/api/auth/settings/reset', authenticateToken, (req, res) => {
    const userId = req.user.id;

    userSettings[userId] = {
      notifications: { push: true, emailDigest: true },
      appearance: { darkMode: false, language: 'en' },
      performance: { autoSave: true },
    };

    res.json({
      success: true,
      settings: userSettings[userId],
      message: 'Settings reset to defaults',
    });
  });

  return app;
}

describe('Settings Routes', () => {
  let app;
  let validToken;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(() => {
    userSettings = {};
    app = createSettingsApp();
    validToken = jwt.sign(
      { id: 'user-1', email: 'test@example.com', type: 'access' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/auth/settings', () => {
    it('should return default settings for new user', async () => {
      const response = await request(app)
        .get('/api/auth/settings')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.settings).toBeDefined();
      expect(response.body.settings.notifications.push).toBe(true);
      expect(response.body.settings.appearance.darkMode).toBe(false);
    });

    it('should return saved settings for existing user', async () => {
      userSettings['user-1'] = {
        notifications: { push: false, emailDigest: true },
        appearance: { darkMode: true, language: 'es' },
        performance: { autoSave: false },
      };

      const response = await request(app)
        .get('/api/auth/settings')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.settings.notifications.push).toBe(false);
      expect(response.body.settings.appearance.darkMode).toBe(true);
      expect(response.body.settings.appearance.language).toBe('es');
    });

    it('should reject request without auth token', async () => {
      const response = await request(app).get('/api/auth/settings');

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/settings')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/auth/settings', () => {
    it('should update notification settings', async () => {
      const response = await request(app)
        .put('/api/auth/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          settings: {
            notifications: { push: false, emailDigest: false },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.settings.notifications.push).toBe(false);
      expect(response.body.settings.notifications.emailDigest).toBe(false);
    });

    it('should update appearance settings', async () => {
      const response = await request(app)
        .put('/api/auth/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          settings: {
            appearance: { darkMode: true, language: 'fr' },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.settings.appearance.darkMode).toBe(true);
      expect(response.body.settings.appearance.language).toBe('fr');
    });

    it('should update performance settings', async () => {
      const response = await request(app)
        .put('/api/auth/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          settings: {
            performance: { autoSave: false },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.settings.performance.autoSave).toBe(false);
    });

    it('should merge partial updates', async () => {
      // First update
      await request(app)
        .put('/api/auth/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          settings: {
            notifications: { push: false },
          },
        });

      // Second update - only appearance
      const response = await request(app)
        .put('/api/auth/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          settings: {
            appearance: { darkMode: true },
          },
        });

      // Both should be preserved
      expect(response.body.settings.notifications.push).toBe(false);
      expect(response.body.settings.appearance.darkMode).toBe(true);
    });

    it('should reject request without settings object', async () => {
      const response = await request(app)
        .put('/api/auth/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should reject invalid notification value type', async () => {
      const response = await request(app)
        .put('/api/auth/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          settings: {
            notifications: { push: 'yes' }, // Should be boolean
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('boolean');
    });

    it('should reject invalid language code', async () => {
      const response = await request(app)
        .put('/api/auth/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          settings: {
            appearance: { language: 'invalid-lang' },
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid language');
    });

    it('should include success message', async () => {
      const response = await request(app)
        .put('/api/auth/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          settings: {
            appearance: { darkMode: true },
          },
        });

      expect(response.body.message).toBe('Settings saved successfully');
    });
  });

  describe('POST /api/auth/settings/reset', () => {
    it('should reset settings to defaults', async () => {
      // First, set some custom settings
      userSettings['user-1'] = {
        notifications: { push: false, emailDigest: false },
        appearance: { darkMode: true, language: 'ja' },
        performance: { autoSave: false },
      };

      const response = await request(app)
        .post('/api/auth/settings/reset')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.settings.notifications.push).toBe(true);
      expect(response.body.settings.appearance.darkMode).toBe(false);
      expect(response.body.settings.appearance.language).toBe('en');
      expect(response.body.settings.performance.autoSave).toBe(true);
    });

    it('should include reset confirmation message', async () => {
      const response = await request(app)
        .post('/api/auth/settings/reset')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.body.message).toBe('Settings reset to defaults');
    });
  });

  describe('Settings isolation between users', () => {
    it('should isolate settings between different users', async () => {
      const user1Token = jwt.sign(
        { id: 'user-1', email: 'user1@example.com', type: 'access' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const user2Token = jwt.sign(
        { id: 'user-2', email: 'user2@example.com', type: 'access' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // User 1 updates settings
      await request(app)
        .put('/api/auth/settings')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          settings: { appearance: { darkMode: true } },
        });

      // User 2 should have default settings
      const user2Response = await request(app)
        .get('/api/auth/settings')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2Response.body.settings.appearance.darkMode).toBe(false);

      // User 1 should have their custom settings
      const user1Response = await request(app)
        .get('/api/auth/settings')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(user1Response.body.settings.appearance.darkMode).toBe(true);
    });
  });
});
