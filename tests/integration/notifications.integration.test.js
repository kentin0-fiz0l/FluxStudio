/**
 * Notifications Route Integration Tests
 *
 * Tests listing, marking read, unread counts,
 * preferences, and project-scoped notifications.
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

const mockConversationsAdapter = {
  listNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  getUnreadNotificationCount: jest.fn()
};

jest.mock('../../database/messaging-conversations-adapter', () => mockConversationsAdapter);

const mockNotificationService = {
  getUserPreferences: jest.fn(),
  updateUserPreferences: jest.fn()
};

jest.mock('../../services/notification-service', () => mockNotificationService);

jest.mock('../../middleware/security', () => ({
  validateInput: {
    sanitizeInput: (req, res, next) => next()
  }
}));

const { query } = require('../../database/config');

function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign({ id: userId, email: 'test@example.com', userType: 'client', ...extra }, JWT_SECRET, { expiresIn: '1h' });
}

function createApp() {
  const app = express();
  app.use(express.json());
  const notificationRoutes = require('../../routes/notifications');
  app.use('/api/notifications', notificationRoutes);
  return app;
}

describe('Notifications Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);
  });

  beforeEach(() => {
    query.mockReset();
    Object.values(mockConversationsAdapter).forEach(fn => fn.mockReset());
    Object.values(mockNotificationService).forEach(fn => fn.mockReset());
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for GET /api/notifications without token', async () => {
      await request(app).get('/api/notifications').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/notifications')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // =========================================================================
  // GET /api/notifications
  // =========================================================================
  describe('GET /api/notifications', () => {
    it('should return notifications for authenticated user', async () => {
      const mockNotifications = [
        { id: 'n1', type: 'message', title: 'New message', isRead: false },
        { id: 'n2', type: 'mention', title: 'You were mentioned', isRead: true }
      ];
      mockConversationsAdapter.listNotifications.mockResolvedValueOnce(mockNotifications);

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.notifications).toHaveLength(2);
      expect(res.body.pagination).toEqual({ limit: 50, offset: 0 });
    });

    it('should pass query parameters to adapter', async () => {
      mockConversationsAdapter.listNotifications.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/notifications?limit=10&offset=5&onlyUnread=true&projectId=proj-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockConversationsAdapter.listNotifications).toHaveBeenCalledWith({
        userId,
        limit: 10,
        offset: 5,
        onlyUnread: true,
        projectId: 'proj-1'
      });
    });

    it('should cap limit at 100', async () => {
      mockConversationsAdapter.listNotifications.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/notifications?limit=500')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockConversationsAdapter.listNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 })
      );
    });

    it('should handle database errors', async () => {
      mockConversationsAdapter.listNotifications.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to list notifications');
    });
  });

  // =========================================================================
  // PATCH /api/notifications/:id/read
  // =========================================================================
  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const mockNotification = { id: 'n1', isRead: true };
      mockConversationsAdapter.markNotificationRead.mockResolvedValueOnce(mockNotification);

      const res = await request(app)
        .patch('/api/notifications/n1/read')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.notification.isRead).toBe(true);
      expect(mockConversationsAdapter.markNotificationRead).toHaveBeenCalledWith({
        notificationId: 'n1',
        userId
      });
    });

    it('should return 404 for non-existent notification', async () => {
      mockConversationsAdapter.markNotificationRead.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch('/api/notifications/nonexistent/read')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Notification not found');
    });

    it('should handle errors', async () => {
      mockConversationsAdapter.markNotificationRead.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .patch('/api/notifications/n1/read')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to mark notification as read');
    });
  });

  // =========================================================================
  // POST /api/notifications/:id/read
  // =========================================================================
  describe('POST /api/notifications/:id/read', () => {
    it('should mark notification as read via POST', async () => {
      const mockNotification = { id: 'n1', isRead: true };
      mockConversationsAdapter.markNotificationRead.mockResolvedValueOnce(mockNotification);

      const res = await request(app)
        .post('/api/notifications/n1/read')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent notification via POST', async () => {
      mockConversationsAdapter.markNotificationRead.mockResolvedValueOnce(null);

      await request(app)
        .post('/api/notifications/nonexistent/read')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // POST /api/notifications/read-all
  // =========================================================================
  describe('POST /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      mockConversationsAdapter.markAllNotificationsRead.mockResolvedValueOnce(5);

      const res = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.updatedCount).toBe(5);
    });

    it('should handle errors', async () => {
      mockConversationsAdapter.markAllNotificationsRead.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to mark all notifications as read');
    });
  });

  // =========================================================================
  // GET /api/notifications/unread-count
  // =========================================================================
  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count', async () => {
      mockConversationsAdapter.getUnreadNotificationCount.mockResolvedValueOnce(12);

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(12);
    });

    it('should handle errors', async () => {
      mockConversationsAdapter.getUnreadNotificationCount.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to get unread count');
    });
  });

  // =========================================================================
  // GET /api/notifications/preferences
  // =========================================================================
  describe('GET /api/notifications/preferences', () => {
    it('should return user preferences', async () => {
      const prefs = { email: true, push: false, inApp: true };
      mockNotificationService.getUserPreferences.mockResolvedValueOnce(prefs);

      const res = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.preferences).toEqual(prefs);
    });

    it('should handle errors', async () => {
      mockNotificationService.getUserPreferences.mockRejectedValueOnce(new Error('error'));

      const res = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to get preferences');
    });
  });

  // =========================================================================
  // PUT /api/notifications/preferences
  // =========================================================================
  describe('PUT /api/notifications/preferences', () => {
    it('should update user preferences', async () => {
      const updatedPrefs = { email: false, push: true, inApp: true };
      mockNotificationService.updateUserPreferences.mockResolvedValueOnce(updatedPrefs);

      const res = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: false, push: true })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.preferences).toEqual(updatedPrefs);
    });

    it('should handle errors', async () => {
      mockNotificationService.updateUserPreferences.mockRejectedValueOnce(new Error('error'));

      const res = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: false })
        .expect(500);

      expect(res.body.error).toBe('Failed to update preferences');
    });
  });

  // =========================================================================
  // POST /api/notifications/projects/:projectId/read-all
  // =========================================================================
  describe('POST /api/notifications/projects/:projectId/read-all', () => {
    it('should mark all project notifications as read', async () => {
      query.mockResolvedValueOnce({ rowCount: 3, rows: [{ id: '1' }, { id: '2' }, { id: '3' }] });

      const res = await request(app)
        .post('/api/notifications/projects/proj-1/read-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.updatedCount).toBe(3);
      expect(res.body.projectId).toBe('proj-1');
    });

    it('should handle errors', async () => {
      query.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/api/notifications/projects/proj-1/read-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to mark notifications as read');
    });
  });

  // =========================================================================
  // GET /api/notifications/projects/:projectId
  // =========================================================================
  describe('GET /api/notifications/projects/:projectId', () => {
    it('should return project notifications', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 'n1', type: 'message', title: 'Test' }] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      const res = await request(app)
        .get('/api/notifications/projects/proj-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.notifications).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.filter.projectId).toBe('proj-1');
    });

    it('should handle errors', async () => {
      query.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/notifications/projects/proj-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to get project notifications');
    });
  });
});
