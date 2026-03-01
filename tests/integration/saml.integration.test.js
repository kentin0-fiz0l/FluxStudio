/**
 * SAML Route Integration Tests
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

jest.mock('../../lib/auth/samlService', () => ({
  createLoginRequest: jest.fn(),
  validateAssertion: jest.fn(),
  provisionOrFindUser: jest.fn(),
  logSSOEvent: jest.fn(),
  generateMetadata: jest.fn()
}));

jest.mock('../../config/environment', () => ({
  config: {
    JWT_SECRET: 'test-jwt-secret-key-for-integration-tests-32chars',
    FRONTEND_URL: 'http://localhost:5173'
  }
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

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth/saml', require('../../routes/saml'));
  return app;
}

describe('SAML Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // GET /auth/saml/:orgSlug/login
  // =========================================================================
  describe('GET /auth/saml/:orgSlug/login', () => {
    it('should redirect to IdP on success', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'org-1', slug: 'test-org', name: 'Test Org' }]
      });
      samlService.createLoginRequest.mockResolvedValueOnce('https://idp.example.com/sso?SAMLRequest=encoded');
      samlService.logSSOEvent.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .get('/auth/saml/test-org/login')
        .expect(302);

      expect(res.headers.location).toBe('https://idp.example.com/sso?SAMLRequest=encoded');
      expect(samlService.logSSOEvent).toHaveBeenCalledWith('org-1', null, 'login_initiated', expect.any(Object));
    });

    it('should return 404 when org not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/auth/saml/nonexistent/login')
        .expect(404);

      expect(res.body.error).toBe('Organization not found');
    });

    it('should return 500 on service error', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'org-1', slug: 'test-org', name: 'Test Org' }]
      });
      samlService.createLoginRequest.mockRejectedValueOnce(new Error('IdP error'));

      const res = await request(app)
        .get('/auth/saml/test-org/login')
        .expect(500);

      expect(res.body.error).toBe('Failed to initiate SSO login');
    });
  });

  // =========================================================================
  // POST /auth/saml/acs
  // =========================================================================
  describe('POST /auth/saml/acs', () => {
    it('should redirect to frontend with token on success', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'org-1', slug: 'test-org', name: 'Test Org' }]
      });
      samlService.validateAssertion.mockResolvedValueOnce({
        nameId: 'user@example.com',
        sessionIndex: 'idx-1'
      });
      samlService.provisionOrFindUser.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@example.com'
      });
      samlService.logSSOEvent.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .post('/auth/saml/acs?org=test-org')
        .type('form')
        .send('SAMLResponse=base64data&RelayState=/')
        .expect(302);

      expect(res.headers.location).toMatch(/^http:\/\/localhost:5173\/auth\/sso-callback\?token=/);
    });

    it('should return 400 for missing SAMLResponse (Zod)', async () => {
      const res = await request(app)
        .post('/auth/saml/acs?org=test-org')
        .type('form')
        .send('RelayState=/')
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 on SAML validation error', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'org-1', slug: 'test-org', name: 'Test Org' }]
      });
      samlService.validateAssertion.mockRejectedValueOnce(new Error('Invalid signature'));
      // The error handler tries to log the failure, so mock that query too
      query.mockResolvedValueOnce({
        rows: [{ id: 'org-1', slug: 'test-org', name: 'Test Org' }]
      });
      samlService.logSSOEvent.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .post('/auth/saml/acs?org=test-org')
        .type('form')
        .send('SAMLResponse=bad-data&RelayState=/')
        .expect(401);

      expect(res.body.error).toBe('SAML assertion validation failed');
    });

    it('should return 400 when org not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/auth/saml/acs?org=nonexistent')
        .type('form')
        .send('SAMLResponse=base64data&RelayState=/')
        .expect(400);

      expect(res.body.error).toMatch(/Organization could not be determined/);
    });
  });

  // =========================================================================
  // GET /auth/saml/metadata/:orgSlug
  // =========================================================================
  describe('GET /auth/saml/metadata/:orgSlug', () => {
    it('should return SP metadata XML', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'org-1', slug: 'test-org', name: 'Test Org' }]
      });
      samlService.generateMetadata.mockResolvedValueOnce('<EntityDescriptor>...</EntityDescriptor>');

      const res = await request(app)
        .get('/auth/saml/metadata/test-org')
        .expect(200);

      expect(res.headers['content-type']).toMatch(/xml/);
      expect(res.text).toBe('<EntityDescriptor>...</EntityDescriptor>');
    });

    it('should return 404 when org not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/auth/saml/metadata/nonexistent')
        .expect(404);

      expect(res.body.error).toBe('Organization not found');
    });
  });

  // =========================================================================
  // GET /auth/saml/:orgSlug/logout
  // =========================================================================
  describe('GET /auth/saml/:orgSlug/logout', () => {
    it('should return 501 not implemented', async () => {
      const res = await request(app)
        .get('/auth/saml/test-org/logout')
        .expect(501);

      expect(res.body.error).toMatch(/not yet implemented/);
    });
  });
});
