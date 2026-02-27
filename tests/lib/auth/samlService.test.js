/**
 * Tests for SAML Service (Sprint 62)
 */

// Mock dependencies BEFORE requiring the module
jest.mock('../../../database/config', () => ({
  query: jest.fn(),
}));

jest.mock('@node-saml/node-saml', () => ({
  SAML: jest.fn().mockImplementation(() => ({
    generateServiceProviderMetadata: jest.fn().mockReturnValue('<xml>sp-metadata</xml>'),
    getAuthorizeUrlAsync: jest.fn().mockResolvedValue('https://idp.example.com/sso?SAMLRequest=xyz'),
    validatePostResponseAsync: jest.fn().mockResolvedValue({
      profile: {
        nameID: 'user@example.com',
        sessionIndex: 'session-123',
        firstName: 'John',
        lastName: 'Doe',
      },
    }),
  })),
}));

const { query } = require('../../../database/config');
const samlService = require('../../../lib/auth/samlService');

// Helper: create a mock SAML config row
const mockConfig = {
  organization_id: 'org-123',
  sp_acs_url: 'https://app.fluxstudio.art/auth/saml/callback',
  sp_entity_id: 'https://app.fluxstudio.art',
  idp_sso_url: 'https://idp.example.com/sso',
  idp_slo_url: null,
  idp_certificate: 'MIIC...',
  want_assertions_signed: true,
  signature_algorithm: 'sha256',
  attribute_mapping: { email: 'emailAttr', firstName: 'firstNameAttr', lastName: 'lastNameAttr' },
  auto_provision: true,
  default_role: 'member',
  is_active: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  // Clear the internal config cache between tests
  samlService._configCache.clear();
});

// ---------------------------------------------------------------------------
// getSAMLConfig
// ---------------------------------------------------------------------------
describe('getSAMLConfig', () => {
  it('returns cached config when within TTL', async () => {
    // Seed the cache manually
    const cached = { ...mockConfig, _fetchedAt: Date.now() };
    samlService._configCache.set('org-123', cached);

    const result = await samlService.getSAMLConfig('org-123');

    expect(result).toBe(cached);
    expect(query).not.toHaveBeenCalled();
  });

  it('queries database on cache miss', async () => {
    query.mockResolvedValueOnce({ rows: [{ ...mockConfig }] });

    const result = await samlService.getSAMLConfig('org-123');

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM saml_configurations'),
      ['org-123']
    );
    expect(result.organization_id).toBe('org-123');
  });

  it('throws error when no active config found', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await expect(samlService.getSAMLConfig('org-missing')).rejects.toThrow(
      'No active SAML configuration for organization org-missing'
    );
  });

  it('caches result after DB query', async () => {
    query.mockResolvedValueOnce({ rows: [{ ...mockConfig }] });

    await samlService.getSAMLConfig('org-123');

    const cached = samlService._configCache.get('org-123');
    expect(cached).toBeDefined();
    expect(cached._fetchedAt).toEqual(expect.any(Number));
  });

  it('re-fetches when cache entry exceeds TTL', async () => {
    // Seed cache with an expired entry
    const expired = { ...mockConfig, _fetchedAt: Date.now() - 10 * 60 * 1000 };
    samlService._configCache.set('org-123', expired);

    query.mockResolvedValueOnce({ rows: [{ ...mockConfig }] });

    await samlService.getSAMLConfig('org-123');

    expect(query).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// invalidateCache
// ---------------------------------------------------------------------------
describe('invalidateCache', () => {
  it('removes entry from cache', () => {
    samlService._configCache.set('org-123', { ...mockConfig, _fetchedAt: Date.now() });

    samlService.invalidateCache('org-123');

    expect(samlService._configCache.has('org-123')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createSAMLInstance
// ---------------------------------------------------------------------------
describe('createSAMLInstance', () => {
  it('creates SAML instance with correct options from config', () => {
    const { SAML } = require('@node-saml/node-saml');

    samlService.createSAMLInstance(mockConfig);

    expect(SAML).toHaveBeenCalledWith({
      callbackUrl: mockConfig.sp_acs_url,
      issuer: mockConfig.sp_entity_id,
      entryPoint: mockConfig.idp_sso_url,
      logoutUrl: undefined,
      cert: mockConfig.idp_certificate,
      wantAssertionsSigned: true,
      signatureAlgorithm: 'rsa-sha256',
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      validateInResponseTo: 'never',
    });
  });

  it('passes logoutUrl when idp_slo_url is set', () => {
    const { SAML } = require('@node-saml/node-saml');
    const configWithSLO = { ...mockConfig, idp_slo_url: 'https://idp.example.com/slo' };

    samlService.createSAMLInstance(configWithSLO);

    expect(SAML).toHaveBeenCalledWith(
      expect.objectContaining({ logoutUrl: 'https://idp.example.com/slo' })
    );
  });
});

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------
describe('generateMetadata', () => {
  it('returns XML metadata string', async () => {
    query.mockResolvedValueOnce({ rows: [{ ...mockConfig }] });

    const metadata = await samlService.generateMetadata('org-123');

    expect(metadata).toBe('<xml>sp-metadata</xml>');
  });

  it('calls getSAMLConfig then createSAMLInstance', async () => {
    query.mockResolvedValueOnce({ rows: [{ ...mockConfig }] });

    const spy = jest.spyOn(samlService, 'createSAMLInstance');

    await samlService.generateMetadata('org-123');

    expect(query).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// createLoginRequest
// ---------------------------------------------------------------------------
describe('createLoginRequest', () => {
  it('returns IdP redirect URL', async () => {
    query.mockResolvedValueOnce({ rows: [{ ...mockConfig }] });

    const url = await samlService.createLoginRequest('org-123');

    expect(url).toBe('https://idp.example.com/sso?SAMLRequest=xyz');
  });

  it('throws when idp_sso_url is not configured', async () => {
    const noSSOConfig = { ...mockConfig, idp_sso_url: null };
    query.mockResolvedValueOnce({ rows: [noSSOConfig] });

    await expect(samlService.createLoginRequest('org-123')).rejects.toThrow(
      'IdP SSO URL not configured for this organization'
    );
  });
});

// ---------------------------------------------------------------------------
// validateAssertion
// ---------------------------------------------------------------------------
describe('validateAssertion', () => {
  it('extracts and maps user profile from SAML response', async () => {
    query.mockResolvedValueOnce({ rows: [{ ...mockConfig }] });

    const mapped = await samlService.validateAssertion('org-123', 'base64SAMLResponse');

    expect(mapped).toEqual({
      nameId: 'user@example.com',
      sessionIndex: 'session-123',
      email: 'user@example.com',       // falls back to nameID since mock profile lacks emailAttr
      firstName: 'John',               // profile.firstName fallback
      lastName: 'Doe',                 // profile.lastName fallback
    });
  });

  it('uses attribute_mapping from config when attributes are present', async () => {
    const { SAML } = require('@node-saml/node-saml');
    // Override the mock for this test to include mapped attributes
    SAML.mockImplementationOnce(() => ({
      generateServiceProviderMetadata: jest.fn(),
      getAuthorizeUrlAsync: jest.fn(),
      validatePostResponseAsync: jest.fn().mockResolvedValue({
        profile: {
          nameID: 'user@example.com',
          sessionIndex: 'session-456',
          emailAttr: 'mapped@example.com',
          firstNameAttr: 'Jane',
          lastNameAttr: 'Smith',
        },
      }),
    }));

    query.mockResolvedValueOnce({ rows: [{ ...mockConfig }] });

    const mapped = await samlService.validateAssertion('org-123', 'base64SAMLResponse');

    expect(mapped.email).toBe('mapped@example.com');
    expect(mapped.firstName).toBe('Jane');
    expect(mapped.lastName).toBe('Smith');
  });

  it('falls back to nameID for email when mapping attribute is absent', async () => {
    const configNoMapping = { ...mockConfig, attribute_mapping: {} };
    query.mockResolvedValueOnce({ rows: [configNoMapping] });

    const mapped = await samlService.validateAssertion('org-123', 'base64SAMLResponse');

    expect(mapped.email).toBe('user@example.com');
  });
});

// ---------------------------------------------------------------------------
// provisionOrFindUser
// ---------------------------------------------------------------------------
describe('provisionOrFindUser', () => {
  const profile = { email: 'user@example.com', firstName: 'John', lastName: 'Doe' };

  it('returns existing user when found by email', async () => {
    const existingUser = { id: 'user-1', email: 'user@example.com' };
    query
      .mockResolvedValueOnce({ rows: [{ ...mockConfig }] })           // getSAMLConfig
      .mockResolvedValueOnce({ rows: [existingUser] })                 // SELECT users
      .mockResolvedValueOnce({ rows: [{ id: 'mem-1' }] });            // SELECT organization_members

    const user = await samlService.provisionOrFindUser('org-123', profile);

    expect(user).toEqual(existingUser);
  });

  it('creates new user when auto_provision is true and user not found', async () => {
    const newUser = { id: 'new-uuid', email: 'user@example.com', first_name: 'John', last_name: 'Doe' };
    query
      .mockResolvedValueOnce({ rows: [{ ...mockConfig }] })           // getSAMLConfig
      .mockResolvedValueOnce({ rows: [] })                             // SELECT users (empty)
      .mockResolvedValueOnce({ rows: [newUser] })                      // INSERT users RETURNING *
      .mockResolvedValueOnce({ rows: [] })                             // SELECT organization_members (empty)
      .mockResolvedValueOnce({ rows: [] });                            // INSERT organization_members

    const user = await samlService.provisionOrFindUser('org-123', profile);

    expect(user).toEqual(newUser);
    // Verify INSERT users was called
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      expect.arrayContaining([profile.email, profile.firstName, profile.lastName])
    );
  });

  it('throws when auto_provision is false and user not found', async () => {
    const noAutoConfig = { ...mockConfig, auto_provision: false };
    query
      .mockResolvedValueOnce({ rows: [noAutoConfig] })                // getSAMLConfig
      .mockResolvedValueOnce({ rows: [] });                            // SELECT users (empty)

    await expect(samlService.provisionOrFindUser('org-123', profile)).rejects.toThrow(
      'User not found and auto-provisioning is disabled'
    );
  });

  it('creates org membership if not exists', async () => {
    const existingUser = { id: 'user-1', email: 'user@example.com' };
    query
      .mockResolvedValueOnce({ rows: [{ ...mockConfig }] })           // getSAMLConfig
      .mockResolvedValueOnce({ rows: [existingUser] })                 // SELECT users
      .mockResolvedValueOnce({ rows: [] })                             // SELECT organization_members (empty)
      .mockResolvedValueOnce({ rows: [] });                            // INSERT organization_members

    await samlService.provisionOrFindUser('org-123', profile);

    // The 4th query call should be the INSERT into organization_members
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO organization_members'),
      ['org-123', 'user-1', 'member']
    );
  });

  it('does not create org membership if already exists', async () => {
    const existingUser = { id: 'user-1', email: 'user@example.com' };
    query
      .mockResolvedValueOnce({ rows: [{ ...mockConfig }] })           // getSAMLConfig
      .mockResolvedValueOnce({ rows: [existingUser] })                 // SELECT users
      .mockResolvedValueOnce({ rows: [{ id: 'mem-1' }] });            // SELECT organization_members (exists)

    await samlService.provisionOrFindUser('org-123', profile);

    // Should only have 3 query calls, no INSERT for membership
    expect(query).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// logSSOEvent
// ---------------------------------------------------------------------------
describe('logSSOEvent', () => {
  it('inserts event into sso_login_events table with correct params', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await samlService.logSSOEvent('org-123', 'user-1', 'login_success', {
      nameId: 'user@example.com',
      sessionIndex: 'session-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sso_login_events'),
      [
        'org-123',
        'user-1',
        'login_success',
        'user@example.com',
        'session-123',
        '192.168.1.1',
        'Mozilla/5.0',
        null,
      ]
    );
  });

  it('passes null for missing detail fields', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await samlService.logSSOEvent('org-123', null, 'login_failed', {
      error: 'Invalid signature',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sso_login_events'),
      [
        'org-123',
        null,
        'login_failed',
        null,           // nameId
        null,           // sessionIndex
        null,           // ipAddress
        null,           // userAgent
        'Invalid signature',
      ]
    );
  });

  it('defaults details to empty object when not provided', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await samlService.logSSOEvent('org-123', 'user-1', 'logout');

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sso_login_events'),
      ['org-123', 'user-1', 'logout', null, null, null, null, null]
    );
  });
});
