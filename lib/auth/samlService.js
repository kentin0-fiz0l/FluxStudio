/**
 * SAML 2.0 Service — Enterprise SSO (Sprint 61)
 *
 * Singleton service that manages SAML configurations, generates SP metadata,
 * creates login requests, validates IdP assertions, and handles JIT provisioning.
 *
 * Pattern: follows lib/oauth-manager.js singleton approach.
 */

const { SAML } = require('@node-saml/node-saml');
const { query } = require('../../database/config');
const crypto = require('crypto');

class SAMLService {
  constructor() {
    // In-memory cache: orgId → config row
    this._configCache = new Map();
    this._cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  // ---------------------------------------------------------------------------
  // Config helpers
  // ---------------------------------------------------------------------------

  /**
   * Load SAML configuration for an organization (with cache).
   * @param {string} orgId - Organization UUID
   * @returns {Promise<Object>} saml_configurations row
   */
  async getSAMLConfig(orgId) {
    const cached = this._configCache.get(orgId);
    if (cached && Date.now() - cached._fetchedAt < this._cacheTTL) {
      return cached;
    }

    const result = await query(
      `SELECT * FROM saml_configurations WHERE organization_id = $1 AND is_active = true`,
      [orgId]
    );

    if (result.rows.length === 0) {
      throw new Error(`No active SAML configuration for organization ${orgId}`);
    }

    const config = result.rows[0];
    config._fetchedAt = Date.now();
    this._configCache.set(orgId, config);
    return config;
  }

  /**
   * Invalidate the cached config for an organization.
   */
  invalidateCache(orgId) {
    this._configCache.delete(orgId);
  }

  // ---------------------------------------------------------------------------
  // SAML instance factory
  // ---------------------------------------------------------------------------

  /**
   * Create a @node-saml SAML instance from a DB config row.
   * @param {Object} config - saml_configurations row
   * @returns {SAML}
   */
  createSAMLInstance(config) {
    return new SAML({
      callbackUrl: config.sp_acs_url,
      issuer: config.sp_entity_id,
      entryPoint: config.idp_sso_url,
      logoutUrl: config.idp_slo_url || undefined,
      cert: config.idp_certificate || '',
      wantAssertionsSigned: config.want_assertions_signed,
      signatureAlgorithm: `rsa-${config.signature_algorithm || 'sha256'}`,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      validateInResponseTo: 'never', // Stateless for now; can tighten later
    });
  }

  // ---------------------------------------------------------------------------
  // SP Metadata
  // ---------------------------------------------------------------------------

  /**
   * Generate SP metadata XML for an organization.
   * @param {string} orgId
   * @returns {Promise<string>} XML string
   */
  async generateMetadata(orgId) {
    const config = await this.getSAMLConfig(orgId);
    const saml = this.createSAMLInstance(config);
    return saml.generateServiceProviderMetadata(null, null);
  }

  // ---------------------------------------------------------------------------
  // Login (AuthnRequest)
  // ---------------------------------------------------------------------------

  /**
   * Create a SAML AuthnRequest and return the IdP redirect URL.
   * @param {string} orgId
   * @param {string} [relayState] - Optional relay state (e.g. return URL)
   * @returns {Promise<string>} Full IdP redirect URL
   */
  async createLoginRequest(orgId, relayState) {
    const config = await this.getSAMLConfig(orgId);

    if (!config.idp_sso_url) {
      throw new Error('IdP SSO URL not configured for this organization');
    }

    const saml = this.createSAMLInstance(config);
    const url = await saml.getAuthorizeUrlAsync(relayState || '', {}, {});
    return url;
  }

  // ---------------------------------------------------------------------------
  // Assertion validation
  // ---------------------------------------------------------------------------

  /**
   * Validate an IdP SAML response and extract user profile.
   * @param {string} orgId
   * @param {string} samlResponse - Base64-encoded SAMLResponse POST body
   * @returns {Promise<Object>} { profile, logoutRequest }
   */
  async validateAssertion(orgId, samlResponse) {
    const config = await this.getSAMLConfig(orgId);
    const saml = this.createSAMLInstance(config);

    const { profile } = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse });

    // Map SAML attributes to a normalized user profile
    const mapping = config.attribute_mapping || {};
    const mapped = {
      nameId: profile.nameID,
      sessionIndex: profile.sessionIndex,
      email: profile[mapping.email] || profile.nameID,
      firstName: profile[mapping.firstName] || profile.firstName || '',
      lastName: profile[mapping.lastName] || profile.lastName || '',
    };

    return mapped;
  }

  // ---------------------------------------------------------------------------
  // JIT Provisioning
  // ---------------------------------------------------------------------------

  /**
   * Find existing user by email or provision a new one.
   * @param {string} orgId
   * @param {Object} profile - Normalized SAML profile (email, firstName, lastName)
   * @returns {Promise<Object>} user row
   */
  async provisionOrFindUser(orgId, profile) {
    const config = await this.getSAMLConfig(orgId);

    // Look up user by email
    const existing = await query(
      `SELECT * FROM users WHERE email = $1`,
      [profile.email]
    );

    let user;

    if (existing.rows.length > 0) {
      user = existing.rows[0];
    } else if (config.auto_provision) {
      // Create a new user via JIT provisioning
      const id = crypto.randomUUID();
      const result = await query(
        `INSERT INTO users (id, email, first_name, last_name, is_verified, created_at)
         VALUES ($1, $2, $3, $4, true, NOW())
         RETURNING *`,
        [id, profile.email, profile.firstName, profile.lastName]
      );
      user = result.rows[0];
    } else {
      throw new Error('User not found and auto-provisioning is disabled');
    }

    // Ensure org membership exists
    const membership = await query(
      `SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2`,
      [orgId, user.id]
    );

    if (membership.rows.length === 0) {
      await query(
        `INSERT INTO organization_members (organization_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, NOW())`,
        [orgId, user.id, config.default_role || 'member']
      );
    }

    return user;
  }

  // ---------------------------------------------------------------------------
  // Audit logging
  // ---------------------------------------------------------------------------

  /**
   * Log an SSO event to the sso_login_events table.
   * @param {string} orgId
   * @param {string|null} userId
   * @param {string} eventType - e.g. 'login_success', 'login_failed', 'logout'
   * @param {Object} details - Additional context
   */
  async logSSOEvent(orgId, userId, eventType, details = {}) {
    await query(
      `INSERT INTO sso_login_events
        (organization_id, user_id, event_type, saml_name_id, saml_session_index, ip_address, user_agent, error_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        orgId,
        userId || null,
        eventType,
        details.nameId || null,
        details.sessionIndex || null,
        details.ipAddress || null,
        details.userAgent || null,
        details.error || null,
      ]
    );
  }
}

// Singleton
const samlService = new SAMLService();

module.exports = samlService;
