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
const { updateSSOSettingsSchema, testSSOConnectionSchema, addSSODomainSchema } = require('../lib/schemas/org-sso-settings');

router.use(authenticateToken);

// ---------------------------------------------------------------------------
// GET / — Get SAML configuration
// ---------------------------------------------------------------------------

router.get('/', requirePermission('settings.manage'), async (req, res) => {
  try {
    const { orgId } = req.params;

    const result = await query(
      'SELECT * FROM saml_configurations WHERE organization_id = $1',
      [orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No SSO configuration found' });
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
  } catch (error) {
    log.error('Get config failed', error);
    res.status(500).json({ error: 'Failed to get SSO configuration' });
  }
});

// ---------------------------------------------------------------------------
// PUT / — Create or update SAML configuration
// ---------------------------------------------------------------------------

router.put('/', requirePermission('settings.manage'), zodValidate(updateSSOSettingsSchema), async (req, res) => {
  try {
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

    if (!idpSsoUrl || !entityId) {
      return res.status(400).json({ error: 'idpSsoUrl and entityId are required' });
    }

    // Validate idpSsoUrl is a valid URL
    try {
      new URL(idpSsoUrl);
    } catch {
      return res.status(400).json({ error: 'idpSsoUrl must be a valid URL' });
    }

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
  } catch (error) {
    log.error('Upsert config failed', error);
    res.status(500).json({ error: 'Failed to save SSO configuration' });
  }
});

// ---------------------------------------------------------------------------
// DELETE / — Disable SSO
// ---------------------------------------------------------------------------

router.delete('/', requirePermission('settings.manage'), async (req, res) => {
  try {
    const { orgId } = req.params;

    const result = await query(
      'UPDATE saml_configurations SET is_active = false, updated_at = NOW() WHERE organization_id = $1 RETURNING id',
      [orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No SSO configuration found' });
    }

    samlService.invalidateCache(orgId);

    res.json({ success: true });
  } catch (error) {
    log.error('Disable failed', error);
    res.status(500).json({ error: 'Failed to disable SSO' });
  }
});

// ---------------------------------------------------------------------------
// GET /metadata — SP Metadata (XML)
// ---------------------------------------------------------------------------

router.get('/metadata', requirePermission('settings.manage'), async (req, res) => {
  try {
    const { orgId } = req.params;
    const xml = await samlService.generateMetadata(orgId);
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    log.error('Metadata generation failed', error);
    res.status(404).json({ error: 'SSO configuration not found or inactive' });
  }
});

// ---------------------------------------------------------------------------
// POST /test-connection — Test IdP connectivity
// ---------------------------------------------------------------------------

router.post('/test-connection', requirePermission('settings.manage'), zodValidate(testSSOConnectionSchema), async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'url must be a valid URL' });
    }

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
  } catch (error) {
    log.error('Test connection failed', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

// ---------------------------------------------------------------------------
// GET /domains — List verified domains
// ---------------------------------------------------------------------------

router.get('/domains', requirePermission('settings.manage'), async (req, res) => {
  try {
    const { orgId } = req.params;
    const domains = await domainVerification.getVerifiedDomains(orgId);
    res.json({ success: true, domains });
  } catch (error) {
    log.error('List domains failed', error);
    res.status(500).json({ error: 'Failed to list domains' });
  }
});

// ---------------------------------------------------------------------------
// POST /domains — Start domain verification
// ---------------------------------------------------------------------------

router.post('/domains', requirePermission('settings.manage'), zodValidate(addSSODomainSchema), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'domain is required' });
    }

    // Validate domain format
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    const result = await domainVerification.createVerification(orgId, domain, req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    log.error('Create domain verification failed', error);
    res.status(500).json({ error: 'Failed to start domain verification' });
  }
});

// ---------------------------------------------------------------------------
// POST /domains/:domainId/verify — Check DNS verification
// ---------------------------------------------------------------------------

router.post('/domains/:domainId/verify', requirePermission('settings.manage'), async (req, res) => {
  try {
    const result = await domainVerification.checkVerification(req.params.domainId);
    res.json({ success: true, ...result });
  } catch (error) {
    log.error('DNS check failed', error);
    res.status(500).json({ error: 'Failed to check domain verification' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /domains/:domainId — Remove domain
// ---------------------------------------------------------------------------

router.delete('/domains/:domainId', requirePermission('settings.manage'), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { domainId } = req.params;

    const result = await query(
      'DELETE FROM verified_domains WHERE id = $1 AND organization_id = $2 RETURNING id',
      [domainId, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    res.json({ success: true });
  } catch (error) {
    log.error('Delete domain failed', error);
    res.status(500).json({ error: 'Failed to delete domain' });
  }
});

// ---------------------------------------------------------------------------
// GET /events — Paginated SSO audit log
// ---------------------------------------------------------------------------

router.get('/events', requirePermission('settings.manage'), async (req, res) => {
  try {
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
  } catch (error) {
    log.error('List events failed', error);
    res.status(500).json({ error: 'Failed to list SSO events' });
  }
});

module.exports = router;
