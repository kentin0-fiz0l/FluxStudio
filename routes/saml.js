/**
 * SAML 2.0 SSO Routes (Sprint 61)
 *
 * Endpoints:
 *   GET  /api/auth/saml/:orgSlug/login   — Initiate SSO (redirect to IdP)
 *   POST /api/auth/saml/acs              — Assertion Consumer Service callback
 *   GET  /api/auth/saml/metadata/:orgSlug — Serve SP metadata XML
 *   GET  /api/auth/saml/:orgSlug/logout  — SLO stub (501)
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query } = require('../database/config');
const samlService = require('../lib/auth/samlService');
const { config } = require('../config/environment');

// ---------------------------------------------------------------------------
// Helper: resolve orgSlug → organization row
// ---------------------------------------------------------------------------

async function resolveOrg(orgSlug) {
  const result = await query(
    `SELECT * FROM organizations WHERE slug = $1`,
    [orgSlug]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// GET /:orgSlug/login — Initiate SSO
// ---------------------------------------------------------------------------

router.get('/:orgSlug/login', async (req, res) => {
  try {
    const org = await resolveOrg(req.params.orgSlug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const relayState = req.query.returnTo || '/';
    const redirectUrl = await samlService.createLoginRequest(org.id, relayState);

    await samlService.logSSOEvent(org.id, null, 'login_initiated', {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('SAML login error:', err.message);
    return res.status(500).json({ error: 'Failed to initiate SSO login' });
  }
});

// ---------------------------------------------------------------------------
// POST /acs — Assertion Consumer Service
// ---------------------------------------------------------------------------

router.post('/acs', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const samlResponse = req.body.SAMLResponse;
    const relayState = req.body.RelayState || '/';

    if (!samlResponse) {
      return res.status(400).json({ error: 'Missing SAMLResponse' });
    }

    // Determine org from RelayState or SAMLResponse issuer
    // For now, we look up org from the SAMLResponse after partial decode
    // A production implementation would encode orgId in RelayState
    const orgSlug = req.query.org;
    let org;

    if (orgSlug) {
      org = await resolveOrg(orgSlug);
    }

    // Fallback: try to find org from verified domain of the SAML NameID
    // For MVP, require org query param
    if (!org) {
      return res.status(400).json({ error: 'Organization could not be determined. Pass ?org=slug' });
    }

    // Validate the SAML assertion
    const profile = await samlService.validateAssertion(org.id, samlResponse);

    // Provision or find the user
    const user = await samlService.provisionOrFindUser(org.id, profile);

    // Log success
    await samlService.logSSOEvent(org.id, user.id, 'login_success', {
      nameId: profile.nameId,
      sessionIndex: profile.sessionIndex,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Generate a JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, orgId: org.id, sso: true },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Redirect to frontend with token
    const frontendUrl = config.FRONTEND_URL || 'https://fluxstudio.art';
    return res.redirect(`${frontendUrl}/auth/sso-callback?token=${encodeURIComponent(token)}&returnTo=${encodeURIComponent(relayState)}`);
  } catch (err) {
    console.error('SAML ACS error:', err.message);

    // Try to log the failure
    try {
      const orgSlug = req.query.org;
      if (orgSlug) {
        const org = await resolveOrg(orgSlug);
        if (org) {
          await samlService.logSSOEvent(org.id, null, 'login_failed', {
            error: err.message,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });
        }
      }
    } catch (logErr) {
      console.error('Failed to log SSO failure:', logErr.message);
    }

    return res.status(401).json({ error: 'SAML assertion validation failed' });
  }
});

// ---------------------------------------------------------------------------
// GET /metadata/:orgSlug — SP Metadata XML
// ---------------------------------------------------------------------------

router.get('/metadata/:orgSlug', async (req, res) => {
  try {
    const org = await resolveOrg(req.params.orgSlug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const xml = await samlService.generateMetadata(org.id);
    res.type('application/xml');
    return res.send(xml);
  } catch (err) {
    console.error('SAML metadata error:', err.message);
    return res.status(500).json({ error: 'Failed to generate SP metadata' });
  }
});

// ---------------------------------------------------------------------------
// GET /:orgSlug/logout — SLO stub
// ---------------------------------------------------------------------------

router.get('/:orgSlug/logout', (_req, res) => {
  return res.status(501).json({
    error: 'Single Logout (SLO) is not yet implemented',
    message: 'SLO support is planned for a future sprint.',
  });
});

module.exports = router;
