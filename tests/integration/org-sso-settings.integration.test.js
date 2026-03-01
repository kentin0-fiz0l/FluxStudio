/**
 * Organization SSO Settings Integration Tests
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

jest.mock('../../lib/auth/middleware', () => {
  const actual = jest.requireActual('../../lib/auth/middleware');
  return {
    ...actual,
    authenticateToken: actual.authenticateToken
  };
});

jest.mock('../../lib/auth/permissions', () => ({
  requirePermission: jest.fn(() => (req, res, next) => next())
}));

jest.mock('../../lib/auth/samlService', () => ({
  invalidateCache: jest.fn(),
  generateMetadata: jest.fn()
}));

jest.mock('../../lib/auth/domainVerification', () => ({
  getVerifiedDomains: jest.fn(),
  createVerification: jest.fn(),
  checkVerification: jest.fn()
}));

jest.mock('../../lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }))
}));

const { query } = require('../../database/config');
const samlService = require('../../lib/auth/samlService');
const domainVerification = require('../../lib/auth/domainVerification');

function createTestToken(userId = 'test-user', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'admin@example.com', userType: 'admin', orgId: 'org-1', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/organizations/:orgId/sso', require('../../routes/org-sso-settings'));
  return app;
}

describe('Org SSO Settings Integration Tests', () => {
  let app;
  let token;

  beforeAll(() => {
    app = createApp();
    token = createTestToken();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 without token', async () => {
      await request(app)
        .get('/organizations/org-1/sso')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/organizations/org-1/sso')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // =========================================================================
  // GET /organizations/:orgId/sso
  // =========================================================================
  describe('GET /organizations/:orgId/sso', () => {
    it('should return SSO configuration', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          idp_sso_url: 'https://idp.example.com',
          idp_certificate: 'cert',
          sp_entity_id: 'entity',
          attribute_mapping: {},
          want_assertions_signed: true,
          auto_provision: false,
          default_role: 'member',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const res = await request(app)
        .get('/organizations/org-1/sso')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.config.idpSsoUrl).toBe('https://idp.example.com');
    });

    it('should return 404 when no config found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/organizations/org-1/sso')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('No SSO configuration found');
    });
  });

  // =========================================================================
  // PUT /organizations/:orgId/sso
  // =========================================================================
  describe('PUT /organizations/:orgId/sso', () => {
    it('should create/update SSO configuration', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          idp_sso_url: 'https://idp.example.com',
          idp_certificate: 'cert',
          sp_entity_id: 'entity',
          attribute_mapping: {},
          want_assertions_signed: true,
          auto_provision: false,
          default_role: 'member',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const res = await request(app)
        .put('/organizations/org-1/sso')
        .set('Authorization', `Bearer ${token}`)
        .send({
          idpSsoUrl: 'https://idp.example.com',
          entityId: 'entity',
          idpCertificate: 'cert'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(samlService.invalidateCache).toHaveBeenCalledWith('org-1');
    });

    it('should return 400 for Zod validation failure (missing fields)', async () => {
      const res = await request(app)
        .put('/organizations/org-1/sso')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle partial update with optional fields', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          idp_sso_url: 'https://idp.example.com',
          idp_certificate: 'cert',
          sp_entity_id: 'entity',
          attribute_mapping: { email: 'mail' },
          want_assertions_signed: false,
          auto_provision: true,
          default_role: 'viewer',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const res = await request(app)
        .put('/organizations/org-1/sso')
        .set('Authorization', `Bearer ${token}`)
        .send({
          idpSsoUrl: 'https://idp.example.com',
          entityId: 'entity',
          idpCertificate: 'cert',
          attributeMapping: { email: 'mail' },
          wantAssertionsSigned: false,
          autoProvision: true,
          defaultRole: 'viewer'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.config.autoProvision).toBe(true);
    });
  });

  // =========================================================================
  // DELETE /organizations/:orgId/sso
  // =========================================================================
  describe('DELETE /organizations/:orgId/sso', () => {
    it('should disable SSO', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'config-1' }] });

      const res = await request(app)
        .delete('/organizations/org-1/sso')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(samlService.invalidateCache).toHaveBeenCalledWith('org-1');
    });

    it('should return 404 when no config found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/organizations/org-1/sso')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('No SSO configuration found');
    });
  });

  // =========================================================================
  // GET /organizations/:orgId/sso/metadata
  // =========================================================================
  describe('GET /organizations/:orgId/sso/metadata', () => {
    it('should return SP metadata XML', async () => {
      samlService.generateMetadata.mockResolvedValueOnce('<xml>metadata</xml>');

      const res = await request(app)
        .get('/organizations/org-1/sso/metadata')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.headers['content-type']).toMatch(/xml/);
      expect(res.text).toBe('<xml>metadata</xml>');
    });
  });

  // =========================================================================
  // POST /organizations/:orgId/sso/test-connection
  // =========================================================================
  describe('POST /organizations/:orgId/sso/test-connection', () => {
    it('should test connection successfully', async () => {
      // Mock global fetch
      global.fetch = jest.fn().mockResolvedValueOnce({ status: 200 });

      const res = await request(app)
        .post('/organizations/org-1/sso/test-connection')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://idp.example.com/metadata' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.reachable).toBe(true);

      delete global.fetch;
    });

    it('should return 400 for Zod validation failure', async () => {
      const res = await request(app)
        .post('/organizations/org-1/sso/test-connection')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // GET /organizations/:orgId/sso/domains
  // =========================================================================
  describe('GET /organizations/:orgId/sso/domains', () => {
    it('should return verified domains', async () => {
      domainVerification.getVerifiedDomains.mockResolvedValueOnce([
        { id: 'domain-1', domain: 'example.com', verified: true }
      ]);

      const res = await request(app)
        .get('/organizations/org-1/sso/domains')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.domains).toHaveLength(1);
    });
  });

  // =========================================================================
  // POST /organizations/:orgId/sso/domains
  // =========================================================================
  describe('POST /organizations/:orgId/sso/domains', () => {
    it('should start domain verification', async () => {
      domainVerification.createVerification.mockResolvedValueOnce({
        domainId: 'domain-1',
        txtRecord: 'flux-verify=abc123'
      });

      const res = await request(app)
        .post('/organizations/org-1/sso/domains')
        .set('Authorization', `Bearer ${token}`)
        .send({ domain: 'example.com' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 400 for empty domain (Zod)', async () => {
      const res = await request(app)
        .post('/organizations/org-1/sso/domains')
        .set('Authorization', `Bearer ${token}`)
        .send({ domain: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid domain format (Zod regex)', async () => {
      const res = await request(app)
        .post('/organizations/org-1/sso/domains')
        .set('Authorization', `Bearer ${token}`)
        .send({ domain: 'invalid!' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid domain format');
    });
  });

  // =========================================================================
  // DELETE /organizations/:orgId/sso/domains/:domainId
  // =========================================================================
  describe('DELETE /organizations/:orgId/sso/domains/:domainId', () => {
    it('should delete domain', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'domain-1' }] });

      const res = await request(app)
        .delete('/organizations/org-1/sso/domains/domain-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 when domain not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/organizations/org-1/sso/domains/domain-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Domain not found');
    });
  });

  // =========================================================================
  // GET /organizations/:orgId/sso/events
  // =========================================================================
  describe('GET /organizations/:orgId/sso/events', () => {
    it('should return paginated events', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      query.mockResolvedValueOnce({
        rows: [
          { id: 'evt-1', event_type: 'login_success', user_email: 'user@example.com', created_at: new Date() },
          { id: 'evt-2', event_type: 'login_failed', user_email: null, created_at: new Date() }
        ]
      });

      const res = await request(app)
        .get('/organizations/org-1/sso/events')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.events).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });
  });
});
