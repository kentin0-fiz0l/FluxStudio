/**
 * Domain Verification Service (Sprint 61)
 *
 * Manages verified domains for email-based SSO routing.
 * Organizations verify domain ownership via DNS TXT records
 * containing a FluxStudio-specific token.
 */

const crypto = require('crypto');
const dns = require('dns').promises;
const { query } = require('../../database/config');

const VERIFICATION_PREFIX = 'fluxstudio-verification';

/**
 * Create a domain verification record for an organization.
 * @param {string} orgId - Organization UUID
 * @param {string} domain - Domain to verify (e.g. "acme.com")
 * @param {string} createdBy - User UUID who initiated verification
 * @returns {Promise<Object>} The created verified_domains row
 */
async function createVerification(orgId, domain, createdBy) {
  const normalizedDomain = domain.toLowerCase().trim();
  const token = crypto.randomBytes(24).toString('hex');

  const result = await query(
    `INSERT INTO verified_domains (organization_id, domain, verification_token, verification_method, created_by)
     VALUES ($1, $2, $3, 'dns', $4)
     ON CONFLICT (domain) DO UPDATE
       SET verification_token = $3, is_verified = false, verified_at = NULL, updated_at = NOW()
     RETURNING *`,
    [orgId, normalizedDomain, token, createdBy]
  );

  return {
    ...result.rows[0],
    dnsRecord: {
      type: 'TXT',
      name: `_fluxstudio.${normalizedDomain}`,
      value: `${VERIFICATION_PREFIX}=${token}`,
    },
  };
}

/**
 * Check DNS for the verification TXT record and mark domain as verified.
 * @param {string} domainId - verified_domains UUID
 * @returns {Promise<{ verified: boolean, message: string }>}
 */
async function checkVerification(domainId) {
  const result = await query(
    `SELECT * FROM verified_domains WHERE id = $1`,
    [domainId]
  );

  if (result.rows.length === 0) {
    throw new Error('Domain verification record not found');
  }

  const record = result.rows[0];
  const expectedValue = `${VERIFICATION_PREFIX}=${record.verification_token}`;
  const lookupHost = `_fluxstudio.${record.domain}`;

  try {
    const records = await dns.resolveTxt(lookupHost);
    // dns.resolveTxt returns array of arrays (each TXT record can have multiple strings)
    const found = records.some((chunks) => chunks.join('').trim() === expectedValue);

    if (found) {
      await query(
        `UPDATE verified_domains SET is_verified = true, verified_at = NOW() WHERE id = $1`,
        [domainId]
      );
      return { verified: true, message: 'Domain verified successfully' };
    }

    return { verified: false, message: `TXT record not found at ${lookupHost}. Expected value: ${expectedValue}` };
  } catch (err) {
    if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
      return { verified: false, message: `No TXT records found at ${lookupHost}` };
    }
    throw err;
  }
}

/**
 * Get all verified domains for an organization.
 * @param {string} orgId
 * @returns {Promise<Array>}
 */
async function getVerifiedDomains(orgId) {
  const result = await query(
    `SELECT * FROM verified_domains WHERE organization_id = $1 ORDER BY created_at DESC`,
    [orgId]
  );
  return result.rows;
}

/**
 * Look up the organization that owns a verified domain matching an email address.
 * @param {string} email
 * @returns {Promise<Object|null>} Organization row or null
 */
async function lookupOrgByEmailDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;

  const result = await query(
    `SELECT o.* FROM organizations o
     JOIN verified_domains vd ON vd.organization_id = o.id
     WHERE vd.domain = $1 AND vd.is_verified = true AND vd.is_active = true
     LIMIT 1`,
    [domain]
  );

  return result.rows[0] || null;
}

module.exports = {
  createVerification,
  checkVerification,
  getVerifiedDomains,
  lookupOrgByEmailDomain,
};
