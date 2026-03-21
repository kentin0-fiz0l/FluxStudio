/**
 * Organization SSO Settings Routes (Sprint 62)
 *
 * Endpoints:
 * - GET    /api/organizations/:orgId/sso            — Get SAML config
 * - PUT    /api/organizations/:orgId/sso            — Create/update SAML config
 * - DELETE /api/organizations/:orgId/sso            — Disable SSO
 * - GET    /api/organizations/:orgId/sso/metadata   — SP metadata (XML)
 * - POST   /api/organizations/:orgId/sso/test-connection — Test IdP connectivity
 * - GET    /api/organizations/:orgId/sso/domains    — List verified domains
 * - POST   /api/organizations/:orgId/sso/domains    — Start domain verification
 * - POST   /api/organizations/:orgId/sso/domains/:domainId/verify — Check DNS
 * - DELETE /api/organizations/:orgId/sso/domains/:domainId — Remove domain
 * - GET    /api/organizations/:orgId/sso/events     — Paginated SSO audit log
 */

const express = require('express');
const { createLogger } = require('../lib/logger');
const log = createLogger('OrgSSOSettings');
const router = express.Router({ mergeParams: true });
const { authenticateToken } = require('../lib/auth/middleware');
const { requirePermission } = require('../lib/auth/permissions');
const { query } = require('../database/config');
const samlService = require('../lib/auth/samlService');
const domainVerification = require('../lib/auth/domainVerification');
const { zodValidate } = require('../middleware/zodValidate');
const { asyncHandler } = require('../middleware/errorHandler');
const { updateSSOSettingsSchema, testSSOConnectionSchema, addSSODomainSchema } = require('../lib/schemas/org-sso-settings');

router.use(authenticateToken);

// ---------------------------------------------------------------------------
// GET / — Get SAML configuration
// ---------------------------------------------------------------------------

router.get('/', requirePermission('settings.manage'), asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  const result = await query(
    'SELECT * FROM saml_configurations WHERE organization_id = $1',
    [orgId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'No SSO configuration found', code: 'SSO_CONFIG_NOT_FOUND' });
  }

  const config = result.rows[0];

  res.json({
    success: true,
    config: {
      idpSsoUrl: config.idp_sso_url,
      idpCertificate: config.idp_certificate,
      entityId: config.sp_entity_id,
      attributeMapping: config.attribute_mapping || {},
      wantAssertionsSigned: config.want_assertions_signed,
      autoProvision: config.auto_provision,
      defaultRole: config.default_role,
      isActive: config.is_active,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
    },
  });
}));

// ---------------------------------------------------------------------------
// PUT / — Create or update SAML configuration
// ---------------------------------------------------------------------------

router.put('/', requirePermission('settings.manage'), zodValidate(updateSSOSettingsSchema), asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const {
    idpSsoUrl,
    entityId,
    idpCertificate,
    attributeMapping,
    wantAssertionsSigned,
    autoProvision,
    defaultRole,
  } = req.body;

  const result = await query(
    `INSERT INTO saml_configurations (
      organization_id, idp_sso_url, sp_entity_id, idp_certificate,
      attribute_mapping, want_assertions_signed, auto_provision, default_role,
      is_active, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
    ON CONFLICT (organization_id) DO UPDATE SET
      idp_sso_url = $2,
      sp_entity_id = $3,
      idp_certificate = COALESCE($4, saml_configurations.idp_certificate),
      attribute_mapping = COALESCE($5, saml_configurations.attribute_mapping),
      want_assertions_signed = COALESCE($6, saml_configurations.want_assertions_signed),
      auto_provision = COALESCE($7, saml_configurations.auto_provision),
      default_role = COALESCE($8, saml_configurations.default_role),
      is_active = true,
      updated_at = NOW()
    RETURNING *`,
    [
      orgId,
      idpSsoUrl,
      entityId,
      idpCertificate || null,
      attributeMapping ? JSON.stringify(attributeMapping) : null,
      wantAssertionsSigned != null ? wantAssertionsSigned : null,
      autoProvision != null ? autoProvision : null,
      defaultRole || null,
    ]
  );

  samlService.invalidateCache(orgId);

  const config = result.rows[0];
  res.json({
    success: true,
    config: {
      idpSsoUrl: config.idp_sso_url,
      idpCertificate: config.idp_certificate,
      entityId: config.sp_entity_id,
      attributeMapping: config.attribute_mapping || {},
      wantAssertionsSigned: config.want_assertions_signed,
      autoProvision: config.auto_provision,
      defaultRole: config.default_role,
      isActive: config.is_active,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
    },
  });
}));

// ---------------------------------------------------------------------------
// DELETE / — Disable SSO
// ---------------------------------------------------------------------------

router.delete('/', requirePermission('settings.manage'), asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  const result = await query(
    'UPDATE saml_configurations SET is_active = false, updated_at = NOW() WHERE organization_id = $1 RETURNING id',
    [orgId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'No SSO configuration found', code: 'SSO_CONFIG_NOT_FOUND' });
  }

  samlService.invalidateCache(orgId);

  res.json({ success: true });
}));

// ---------------------------------------------------------------------------
// GET /metadata — SP Metadata (XML)
// ---------------------------------------------------------------------------

router.get('/metadata', requirePermission('settings.manage'), asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const xml = await samlService.generateMetadata(orgId);
  res.set('Content-Type', 'application/xml');
  res.send(xml);
}));

// ---------------------------------------------------------------------------
// POST /test-connection — Test IdP connectivity
// ---------------------------------------------------------------------------

router.post('/test-connection', requirePermission('settings.manage'), zodValidate(testSSOConnectionSchema), asyncHandler(async (req, res) => {
  const { url } = req.body;

  let reachable = false;
  let statusCode = null;

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    reachable = true;
    statusCode = response.status;
  } catch {
    reachable = false;
  }

  res.json({ success: true, reachable, statusCode });
}));

// ---------------------------------------------------------------------------
// GET /domains — List verified domains
// ---------------------------------------------------------------------------

router.get('/domains', requirePermission('settings.manage'), asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const domains = await domainVerification.getVerifiedDomains(orgId);
  res.json({ success: true, domains });
}));

// ---------------------------------------------------------------------------
// POST /domains — Start domain verification
// ---------------------------------------------------------------------------

router.post('/domains', requirePermission('settings.manage'), zodValidate(addSSODomainSchema), asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { domain } = req.body;

  const result = await domainVerification.createVerification(orgId, domain, req.user.id);
  res.json({ success: true, ...result });
}));

// ---------------------------------------------------------------------------
// POST /domains/:domainId/verify — Check DNS verification
// ---------------------------------------------------------------------------

router.post('/domains/:domainId/verify', requirePermission('settings.manage'), asyncHandler(async (req, res) => {
  const result = await domainVerification.checkVerification(req.params.domainId);
  res.json({ success: true, ...result });
}));

// ---------------------------------------------------------------------------
// DELETE /domains/:domainId — Remove domain
// ---------------------------------------------------------------------------

router.delete('/domains/:domainId', requirePermission('settings.manage'), asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { domainId } = req.params;

  const result = await query(
    'DELETE FROM verified_domains WHERE id = $1 AND organization_id = $2 RETURNING id',
    [domainId, orgId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Domain not found', code: 'SSO_DOMAIN_NOT_FOUND' });
  }

  res.json({ success: true });
}));

// ---------------------------------------------------------------------------
// GET /events — Paginated SSO audit log
// ---------------------------------------------------------------------------

router.get('/events', requirePermission('settings.manage'), asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  const eventType = req.query.eventType;

  const params = [orgId];
  let whereClause = 'WHERE e.organization_id = $1';

  if (eventType) {
    whereClause += ' AND e.event_type = $2';
    params.push(eventType);
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM sso_login_events e ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0].count);

  const eventsResult = await query(
    `SELECT e.*, u.email AS user_email
     FROM sso_login_events e
     LEFT JOIN users u ON u.id = e.user_id
     ${whereClause}
     ORDER BY e.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    events: eventsResult.rows,
    pagination: { page, limit, total },
  });
}));

module.exports = router;
