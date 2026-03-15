/**
 * SAML 2.0 SSO Routes (Sprint 61)
 *
 * Endpoints:
 *   GET  /api/auth/saml/:orgSlug/login   — Initiate SSO (redirect to IdP)
 *   POST /api/auth/saml/acs              — Assertion Consumer Service callback
 *   GET  /api/auth/saml/metadata/:orgSlug — Serve SP metadata XML
 *   GET  /api/auth/saml/:orgSlug/logout  — Clear session and return redirect
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query } = require('../database/config');
const samlService = require('../lib/auth/samlService');
const { config } = require('../config/environment');
const { zodValidate } = require('../middleware/zodValidate');
const { samlAcsSchema } = require('../lib/schemas');
const { createLogger } = require('../lib/logger');
const log = createLogger('SAML');

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
      return res.status(404).json({ success: false, error: 'Organization not found', code: 'SAML_ORG_NOT_FOUND' });
    }

    const relayState = req.query.returnTo || '/';
    const redirectUrl = await samlService.createLoginRequest(org.id, relayState);

    await samlService.logSSOEvent(org.id, null, 'login_initiated', {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.redirect(redirectUrl);
  } catch (err) {
    log.error('SAML login error', err);
    return res.status(500).json({ success: false, error: 'Failed to initiate SSO login', code: 'SAML_LOGIN_ERROR' });
  }
});

// ---------------------------------------------------------------------------
// POST /acs — Assertion Consumer Service
// ---------------------------------------------------------------------------

router.post('/acs', express.urlencoded({ extended: false }), zodValidate(samlAcsSchema), async (req, res) => {
  try {
    const samlResponse = req.body.SAMLResponse;
    const relayState = req.body.RelayState || '/';

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
      return res.status(400).json({ success: false, error: 'Organization could not be determined. Pass ?org=slug', code: 'SAML_ORG_REQUIRED' });
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
    log.error('SAML ACS error', err);

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
      log.error('Failed to log SSO failure', logErr);
    }

    return res.status(401).json({ success: false, error: 'SAML assertion validation failed', code: 'SAML_ASSERTION_FAILED' });
  }
});

// ---------------------------------------------------------------------------
// GET /metadata/:orgSlug — SP Metadata XML
// ---------------------------------------------------------------------------

router.get('/metadata/:orgSlug', async (req, res) => {
  try {
    const org = await resolveOrg(req.params.orgSlug);
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found', code: 'SAML_ORG_NOT_FOUND' });
    }

    const xml = await samlService.generateMetadata(org.id);
    res.type('application/xml');
    return res.send(xml);
  } catch (err) {
    log.error('SAML metadata error', err);
    return res.status(500).json({ success: false, error: 'Failed to generate SP metadata', code: 'SAML_METADATA_ERROR' });
  }
});

// ---------------------------------------------------------------------------
// GET /:orgSlug/logout — Clear session and redirect
// ---------------------------------------------------------------------------

router.get('/:orgSlug/logout', (req, res) => {
  // Clear session to log the user out locally
  if (req.session) {
    req.session.destroy(() => {});
  }

  const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?saml_logout=true`;
  return res.json({
    success: true,
    message: 'Session cleared',
    redirectUrl,
  });
});

module.exports = router;
