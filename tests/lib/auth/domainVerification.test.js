/**
 * Tests for Domain Verification Service (Sprint 62)
 */

jest.mock('../../../database/config', () => ({
  query: jest.fn(),
}));

jest.mock('dns', () => ({
  promises: {
    resolveTxt: jest.fn(),
  },
}));

const { query } = require('../../../database/config');
const dns = require('dns');
const {
  createVerification,
  checkVerification,
  getVerifiedDomains,
  lookupOrgByEmailDomain,
} = require('../../../lib/auth/domainVerification');

describe('domainVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── createVerification ──────────────────────────────────────────

  describe('createVerification', () => {
    const orgId = 'org-uuid-1';
    const createdBy = 'user-uuid-1';
    const mockRow = {
      id: 'vd-uuid-1',
      organization_id: orgId,
      domain: 'acme.com',
      verification_token: 'generated-token',
      verification_method: 'dns',
      is_verified: false,
      created_by: createdBy,
    };

    beforeEach(() => {
      query.mockResolvedValue({ rows: [mockRow] });
    });

    it('inserts a record with normalized (lowercased, trimmed) domain', async () => {
      await createVerification(orgId, '  ACME.COM  ', createdBy);

      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('INSERT INTO verified_domains');
      expect(params[0]).toBe(orgId);
      expect(params[1]).toBe('acme.com');
      expect(params[3]).toBe(createdBy);
    });

    it('returns DNS record info with correct format', async () => {
      const result = await createVerification(orgId, 'acme.com', createdBy);

      expect(result.dnsRecord).toBeDefined();
      expect(result.dnsRecord.type).toBe('TXT');
      expect(result.dnsRecord.name).toBe('_fluxstudio.acme.com');
      expect(result.dnsRecord.value).toMatch(/^fluxstudio-verification=[a-f0-9]{48}$/);
    });

    it('generates a unique verification token via crypto.randomBytes', async () => {
      await createVerification(orgId, 'acme.com', createdBy);

      const [, params] = query.mock.calls[0];
      const token = params[2]; // third param is the token
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(48); // 24 bytes -> 48 hex chars
    });
  });

  // ─── checkVerification ───────────────────────────────────────────

  describe('checkVerification', () => {
    const domainId = 'vd-uuid-1';
    const token = 'abc123';
    const mockRecord = {
      id: domainId,
      domain: 'acme.com',
      verification_token: token,
    };

    it('throws when domain record is not found', async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(checkVerification(domainId)).rejects.toThrow(
        'Domain verification record not found'
      );
    });

    it('returns verified: true when DNS TXT record matches expected value', async () => {
      query.mockResolvedValue({ rows: [mockRecord] });
      dns.promises.resolveTxt.mockResolvedValue([
        [`fluxstudio-verification=${token}`],
      ]);

      const result = await checkVerification(domainId);

      expect(result).toEqual({
        verified: true,
        message: 'Domain verified successfully',
      });
    });

    it('returns verified: false when DNS TXT record does not match', async () => {
      query.mockResolvedValue({ rows: [mockRecord] });
      dns.promises.resolveTxt.mockResolvedValue([
        ['some-other-txt-record'],
      ]);

      const result = await checkVerification(domainId);

      expect(result.verified).toBe(false);
      expect(result.message).toContain('TXT record not found');
      expect(result.message).toContain('_fluxstudio.acme.com');
    });

    it('updates database to mark domain as verified on match', async () => {
      query
        .mockResolvedValueOnce({ rows: [mockRecord] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }); // UPDATE
      dns.promises.resolveTxt.mockResolvedValue([
        [`fluxstudio-verification=${token}`],
      ]);

      await checkVerification(domainId);

      expect(query).toHaveBeenCalledTimes(2);
      const [updateSql, updateParams] = query.mock.calls[1];
      expect(updateSql).toContain('UPDATE verified_domains');
      expect(updateSql).toContain('is_verified = true');
      expect(updateParams).toEqual([domainId]);
    });

    it('handles ENODATA error gracefully (returns verified: false)', async () => {
      query.mockResolvedValue({ rows: [mockRecord] });
      const err = new Error('queryTxt ENODATA');
      err.code = 'ENODATA';
      dns.promises.resolveTxt.mockRejectedValue(err);

      const result = await checkVerification(domainId);

      expect(result).toEqual({
        verified: false,
        message: 'No TXT records found at _fluxstudio.acme.com',
      });
    });

    it('handles ENOTFOUND error gracefully (returns verified: false)', async () => {
      query.mockResolvedValue({ rows: [mockRecord] });
      const err = new Error('queryTxt ENOTFOUND');
      err.code = 'ENOTFOUND';
      dns.promises.resolveTxt.mockRejectedValue(err);

      const result = await checkVerification(domainId);

      expect(result).toEqual({
        verified: false,
        message: 'No TXT records found at _fluxstudio.acme.com',
      });
    });

    it('rethrows unexpected DNS errors', async () => {
      query.mockResolvedValue({ rows: [mockRecord] });
      const err = new Error('unexpected failure');
      err.code = 'ESERVFAIL';
      dns.promises.resolveTxt.mockRejectedValue(err);

      await expect(checkVerification(domainId)).rejects.toThrow('unexpected failure');
    });

    it('handles multi-chunk TXT records (dns.resolveTxt returns array of arrays)', async () => {
      query.mockResolvedValue({ rows: [mockRecord] });
      // DNS may split long TXT records into multiple chunks within a single record
      dns.promises.resolveTxt.mockResolvedValue([
        ['fluxstudio-verific', `ation=${token}`], // split across two chunks
      ]);

      const result = await checkVerification(domainId);

      expect(result).toEqual({
        verified: true,
        message: 'Domain verified successfully',
      });
    });
  });

  // ─── getVerifiedDomains ──────────────────────────────────────────

  describe('getVerifiedDomains', () => {
    const orgId = 'org-uuid-1';

    it('returns all domains for organization ordered by created_at DESC', async () => {
      const mockDomains = [
        { id: 'vd-2', domain: 'new.com', created_at: '2025-02-01' },
        { id: 'vd-1', domain: 'old.com', created_at: '2025-01-01' },
      ];
      query.mockResolvedValue({ rows: mockDomains });

      const result = await getVerifiedDomains(orgId);

      expect(result).toEqual(mockDomains);
      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('ORDER BY created_at DESC');
      expect(params).toEqual([orgId]);
    });

    it('returns empty array when none exist', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await getVerifiedDomains(orgId);

      expect(result).toEqual([]);
    });
  });

  // ─── lookupOrgByEmailDomain ──────────────────────────────────────

  describe('lookupOrgByEmailDomain', () => {
    it('extracts domain from email and queries for verified domain', async () => {
      query.mockResolvedValue({ rows: [] });

      await lookupOrgByEmailDomain('user@acme.com');

      expect(query).toHaveBeenCalledTimes(1);
      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('verified_domains');
      expect(sql).toContain('is_verified = true');
      expect(sql).toContain('is_active = true');
      expect(params).toEqual(['acme.com']);
    });

    it('returns organization when verified domain matches', async () => {
      const mockOrg = { id: 'org-uuid-1', name: 'Acme Corp' };
      query.mockResolvedValue({ rows: [mockOrg] });

      const result = await lookupOrgByEmailDomain('user@acme.com');

      expect(result).toEqual(mockOrg);
    });

    it('returns null when no verified domain matches', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await lookupOrgByEmailDomain('user@unknown.com');

      expect(result).toBeNull();
    });

    it('returns null for invalid email (no @)', async () => {
      const result = await lookupOrgByEmailDomain('not-an-email');

      expect(result).toBeNull();
      expect(query).not.toHaveBeenCalled();
    });
  });
});
