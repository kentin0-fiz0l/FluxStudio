/**
 * Tests for Organization SSO Settings Routes (Sprint 62)
 * @file tests/routes/org-sso-settings.routes.test.js
 */

const express = require('express');
const request = require('supertest');

// Mock dependencies before requiring the router
jest.mock('../../lib/auth/middleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'admin@test.com' };
    next();
  },
}));

jest.mock('../../lib/auth/permissions', () => ({
  requirePermission: () => (req, res, next) => next(),
  PERMISSIONS: {},
}));

jest.mock('../../database/config', () => ({
  query: jest.fn(),
}));

jest.mock('../../lib/auth/samlService', () => ({
  generateMetadata: jest.fn(),
  invalidateCache: jest.fn(),
}));

jest.mock('../../lib/auth/domainVerification', () => ({
  getVerifiedDomains: jest.fn(),
  createVerification: jest.fn(),
  checkVerification: jest.fn(),
}));

const { query } = require('../../database/config');
const samlService = require('../../lib/auth/samlService');
const domainVerification = require('../../lib/auth/domainVerification');
const orgSsoRoutes = require('../../routes/org-sso-settings');

// Set up Express app for testing
let app;
beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/organizations/:orgId/sso', orgSsoRoutes);
});

beforeEach(() => {
  jest.clearAllMocks();
});

const ORG_ID = 'org-123';

// ---------------------------------------------------------------------------
// GET /organizations/:orgId/sso
// ---------------------------------------------------------------------------

describe('GET /organizations/:orgId/sso', () => {
  it('returns 404 when no config exists', async () => {
    query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get(`/organizations/${ORG_ID}/sso`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No SSO configuration found');
  });

  it('returns config mapped to camelCase when found', async () => {
    query.mockResolvedValue({
      rows: [{
        idp_sso_url: 'https://idp.example.com/sso',
        idp_certificate: 'CERT_DATA',
        sp_entity_id: 'https://app.example.com',
        attribute_mapping: { email: 'emailAddress' },
        want_assertions_signed: true,
        auto_provision: false,
        default_role: 'member',
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      }],
    });

    const res = await request(app)
      .get(`/organizations/${ORG_ID}/sso`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.config).toEqual({
      idpSsoUrl: 'https://idp.example.com/sso',
      idpCertificate: 'CERT_DATA',
      entityId: 'https://app.example.com',
      attributeMapping: { email: 'emailAddress' },
      wantAssertionsSigned: true,
      autoProvision: false,
      defaultRole: 'member',
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-02T00:00:00Z',
    });
  });
});

// ---------------------------------------------------------------------------
// PUT /organizations/:orgId/sso
// ---------------------------------------------------------------------------

describe('PUT /organizations/:orgId/sso', () => {
  const validBody = {
    idpSsoUrl: 'https://idp.example.com/sso',
    entityId: 'https://app.example.com',
    idpCertificate: 'CERT_DATA',
  };

  it('creates/updates config with valid data and returns 200', async () => {
    query.mockResolvedValue({
      rows: [{
        idp_sso_url: validBody.idpSsoUrl,
        idp_certificate: validBody.idpCertificate,
        sp_entity_id: validBody.entityId,
        attribute_mapping: {},
        want_assertions_signed: false,
        auto_provision: false,
        default_role: null,
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }],
    });

    const res = await request(app)
      .put(`/organizations/${ORG_ID}/sso`)
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.config.idpSsoUrl).toBe(validBody.idpSsoUrl);
    expect(res.body.config.entityId).toBe(validBody.entityId);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('invalidates SAML cache after update', async () => {
    query.mockResolvedValue({
      rows: [{
        idp_sso_url: validBody.idpSsoUrl,
        idp_certificate: validBody.idpCertificate,
        sp_entity_id: validBody.entityId,
        attribute_mapping: {},
        want_assertions_signed: false,
        auto_provision: false,
        default_role: null,
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }],
    });

    await request(app)
      .put(`/organizations/${ORG_ID}/sso`)
      .send(validBody);

    expect(samlService.invalidateCache).toHaveBeenCalledWith(ORG_ID);
  });

  it('returns 400 when idpSsoUrl is missing', async () => {
    const res = await request(app)
      .put(`/organizations/${ORG_ID}/sso`)
      .send({ entityId: 'https://app.example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('idpSsoUrl and entityId are required');
  });

  it('returns 400 when entityId is missing', async () => {
    const res = await request(app)
      .put(`/organizations/${ORG_ID}/sso`)
      .send({ idpSsoUrl: 'https://idp.example.com/sso' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('idpSsoUrl and entityId are required');
  });

  it('returns 400 when idpSsoUrl is not a valid URL', async () => {
    const res = await request(app)
      .put(`/organizations/${ORG_ID}/sso`)
      .send({ idpSsoUrl: 'not-a-url', entityId: 'https://app.example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('idpSsoUrl must be a valid URL');
  });
});

// ---------------------------------------------------------------------------
// DELETE /organizations/:orgId/sso
// ---------------------------------------------------------------------------

describe('DELETE /organizations/:orgId/sso', () => {
  it('disables SSO by setting is_active=false and returns 200', async () => {
    query.mockResolvedValue({ rows: [{ id: 'config-1' }] });

    const res = await request(app)
      .delete(`/organizations/${ORG_ID}/sso`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('is_active = false'),
      [ORG_ID]
    );
  });

  it('invalidates cache after disabling', async () => {
    query.mockResolvedValue({ rows: [{ id: 'config-1' }] });

    await request(app)
      .delete(`/organizations/${ORG_ID}/sso`);

    expect(samlService.invalidateCache).toHaveBeenCalledWith(ORG_ID);
  });

  it('returns 404 when no config exists', async () => {
    query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .delete(`/organizations/${ORG_ID}/sso`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No SSO configuration found');
  });
});

// ---------------------------------------------------------------------------
// GET /organizations/:orgId/sso/metadata
// ---------------------------------------------------------------------------

describe('GET /organizations/:orgId/sso/metadata', () => {
  it('returns XML metadata with correct content-type', async () => {
    const xmlData = '<EntityDescriptor>...</EntityDescriptor>';
    samlService.generateMetadata.mockResolvedValue(xmlData);

    const res = await request(app)
      .get(`/organizations/${ORG_ID}/sso/metadata`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/xml/);
    expect(res.text).toBe(xmlData);
    expect(samlService.generateMetadata).toHaveBeenCalledWith(ORG_ID);
  });

  it('returns 404 when config not found (samlService throws)', async () => {
    samlService.generateMetadata.mockRejectedValue(new Error('Config not found'));

    const res = await request(app)
      .get(`/organizations/${ORG_ID}/sso/metadata`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('SSO configuration not found or inactive');
  });
});

// ---------------------------------------------------------------------------
// POST /organizations/:orgId/sso/test-connection
// ---------------------------------------------------------------------------

describe('POST /organizations/:orgId/sso/test-connection', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns reachable=true for valid reachable URL', async () => {
    global.fetch.mockResolvedValue({ status: 200 });

    const res = await request(app)
      .post(`/organizations/${ORG_ID}/sso/test-connection`)
      .send({ url: 'https://idp.example.com/metadata' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reachable).toBe(true);
    expect(res.body.statusCode).toBe(200);
  });

  it('returns reachable=false for unreachable URL', async () => {
    global.fetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await request(app)
      .post(`/organizations/${ORG_ID}/sso/test-connection`)
      .send({ url: 'https://unreachable.example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reachable).toBe(false);
    expect(res.body.statusCode).toBeNull();
  });

  it('returns 400 when url is missing', async () => {
    const res = await request(app)
      .post(`/organizations/${ORG_ID}/sso/test-connection`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('url is required');
  });

  it('returns 400 when url is not a valid URL', async () => {
    const res = await request(app)
      .post(`/organizations/${ORG_ID}/sso/test-connection`)
      .send({ url: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('url must be a valid URL');
  });
});

// ---------------------------------------------------------------------------
// GET /organizations/:orgId/sso/domains
// ---------------------------------------------------------------------------

describe('GET /organizations/:orgId/sso/domains', () => {
  it('returns list of domains', async () => {
    const domains = [
      { id: 'd1', domain: 'example.com', verified: true },
      { id: 'd2', domain: 'test.com', verified: false },
    ];
    domainVerification.getVerifiedDomains.mockResolvedValue(domains);

    const res = await request(app)
      .get(`/organizations/${ORG_ID}/sso/domains`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.domains).toEqual(domains);
    expect(domainVerification.getVerifiedDomains).toHaveBeenCalledWith(ORG_ID);
  });
});

// ---------------------------------------------------------------------------
// POST /organizations/:orgId/sso/domains
// ---------------------------------------------------------------------------

describe('POST /organizations/:orgId/sso/domains', () => {
  it('creates domain verification with valid domain', async () => {
    const verificationResult = {
      domainId: 'd1',
      txtRecord: '_fluxstudio-verify=abc123',
    };
    domainVerification.createVerification.mockResolvedValue(verificationResult);

    const res = await request(app)
      .post(`/organizations/${ORG_ID}/sso/domains`)
      .send({ domain: 'example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.domainId).toBe('d1');
    expect(domainVerification.createVerification).toHaveBeenCalledWith(
      ORG_ID,
      'example.com',
      'test-user-id'
    );
  });

  it('returns 400 when domain is missing', async () => {
    const res = await request(app)
      .post(`/organizations/${ORG_ID}/sso/domains`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('domain is required');
  });

  it('returns 400 for invalid domain format', async () => {
    const res = await request(app)
      .post(`/organizations/${ORG_ID}/sso/domains`)
      .send({ domain: '-invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid domain format');
  });
});

// ---------------------------------------------------------------------------
// POST /organizations/:orgId/sso/domains/:domainId/verify
// ---------------------------------------------------------------------------

describe('POST /organizations/:orgId/sso/domains/:domainId/verify', () => {
  it('returns verification result', async () => {
    const checkResult = { verified: true, method: 'dns_txt' };
    domainVerification.checkVerification.mockResolvedValue(checkResult);

    const res = await request(app)
      .post(`/organizations/${ORG_ID}/sso/domains/d1/verify`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.verified).toBe(true);
    expect(res.body.method).toBe('dns_txt');
    expect(domainVerification.checkVerification).toHaveBeenCalledWith('d1');
  });
});

// ---------------------------------------------------------------------------
// DELETE /organizations/:orgId/sso/domains/:domainId
// ---------------------------------------------------------------------------

describe('DELETE /organizations/:orgId/sso/domains/:domainId', () => {
  it('returns 200 when domain deleted', async () => {
    query.mockResolvedValue({ rows: [{ id: 'd1' }] });

    const res = await request(app)
      .delete(`/organizations/${ORG_ID}/sso/domains/d1`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM verified_domains'),
      ['d1', ORG_ID]
    );
  });

  it('returns 404 when domain not found', async () => {
    query.mockResolvedValue({ rows: [] });

    const res = await request(app)
      .delete(`/organizations/${ORG_ID}/sso/domains/nonexistent`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Domain not found');
  });
});

// ---------------------------------------------------------------------------
// GET /organizations/:orgId/sso/events
// ---------------------------------------------------------------------------

describe('GET /organizations/:orgId/sso/events', () => {
  const mockEvents = [
    { id: 'e1', event_type: 'login', user_email: 'user@test.com', created_at: '2025-01-01T00:00:00Z' },
    { id: 'e2', event_type: 'logout', user_email: 'user2@test.com', created_at: '2025-01-02T00:00:00Z' },
  ];

  it('returns paginated events', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: mockEvents });

    const res = await request(app)
      .get(`/organizations/${ORG_ID}/sso/events`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.events).toEqual(mockEvents);
    expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 2 });
  });

  it('supports page and limit query params', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ count: '50' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`/organizations/${ORG_ID}/sso/events?page=3&limit=10`);

    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({ page: 3, limit: 10, total: 50 });
    // Check offset: (3-1)*10 = 20
    const eventsQuery = query.mock.calls[1];
    expect(eventsQuery[1]).toContain(10);  // limit
    expect(eventsQuery[1]).toContain(20);  // offset
  });

  it('supports eventType filter', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`/organizations/${ORG_ID}/sso/events?eventType=login`);

    expect(res.status).toBe(200);
    // Count query should include eventType filter
    const countQuery = query.mock.calls[0];
    expect(countQuery[0]).toContain('event_type = $2');
    expect(countQuery[1]).toContain('login');
  });

  it('caps limit at 100', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ count: '200' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`/organizations/${ORG_ID}/sso/events?limit=999`);

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(100);
  });
});
