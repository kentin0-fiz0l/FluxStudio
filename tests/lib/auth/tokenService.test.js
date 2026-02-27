/**
 * Tests for Token Service (Sprint 62)
 *
 * Unit tests for JWT access token and database-backed refresh token management.
 * Covers generation, verification, rotation, revocation, and session management.
 */

// Set JWT_SECRET before any imports - tokenService validates on module load
process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';

// Mock dependencies BEFORE requiring tokenService
jest.mock('../../../lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('../../../lib/auth/securityLogger', () => ({
  logTokenGenerated: jest.fn().mockResolvedValue(undefined),
  logTokenRefreshed: jest.fn().mockResolvedValue(undefined),
  logTokenRevoked: jest.fn().mockResolvedValue(undefined),
  logDeviceMismatch: jest.fn().mockResolvedValue(undefined),
  logEvent: jest.fn().mockResolvedValue(undefined),
  EVENT_TYPES: {
    TOKEN_VERIFICATION_FAILED: 'token_verification_failed',
    MASS_TOKEN_REVOCATION: 'mass_token_revocation',
  },
  SEVERITY: {
    WARNING: 'warning',
    INFO: 'info',
  },
}));

const { query } = require('../../../lib/db');
const securityLogger = require('../../../lib/auth/securityLogger');
const tokenService = require('../../../lib/auth/tokenService');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Test fixtures
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  userType: 'client',
};

const mockDeviceInfo = {
  deviceName: 'Chrome on MacOS',
  deviceFingerprint: 'fp-abc-123',
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0 Test',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMocks() {
  jest.clearAllMocks();
}

// ---------------------------------------------------------------------------
// generateAccessToken
// ---------------------------------------------------------------------------

describe('generateAccessToken', () => {
  beforeEach(resetMocks);

  it('returns a valid JWT string', () => {
    const token = tokenService.generateAccessToken(mockUser);
    expect(typeof token).toBe('string');
    // JWT has three dot-separated parts
    expect(token.split('.')).toHaveLength(3);
  });

  it('contains correct claims', () => {
    const token = tokenService.generateAccessToken(mockUser);
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    expect(decoded.id).toBe(mockUser.id);
    expect(decoded.email).toBe(mockUser.email);
    expect(decoded.userType).toBe(mockUser.userType);
    expect(decoded.type).toBe('access');
  });

  it('expires in 15 minutes', () => {
    const token = tokenService.generateAccessToken(mockUser);
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    // exp - iat should be ~900 seconds (15 min)
    const diff = decoded.exp - decoded.iat;
    expect(diff).toBe(900);
  });

  it('throws when user object is missing', () => {
    expect(() => tokenService.generateAccessToken(null)).toThrow('User object with id is required');
  });

  it('throws when user.id is missing', () => {
    expect(() => tokenService.generateAccessToken({ email: 'a@b.com' })).toThrow('User object with id is required');
  });
});

// ---------------------------------------------------------------------------
// verifyAccessToken
// ---------------------------------------------------------------------------

describe('verifyAccessToken', () => {
  beforeEach(resetMocks);

  it('returns decoded payload for a valid token', () => {
    const token = tokenService.generateAccessToken(mockUser);
    const result = tokenService.verifyAccessToken(token);

    expect(result).not.toBeNull();
    expect(result.id).toBe(mockUser.id);
    expect(result.email).toBe(mockUser.email);
    expect(result.type).toBe('access');
  });

  it('returns null for an expired token', () => {
    const token = jwt.sign(
      { id: mockUser.id, email: mockUser.email, userType: mockUser.userType, type: 'access' },
      JWT_SECRET,
      { expiresIn: '0s', algorithm: 'HS256' }
    );

    const result = tokenService.verifyAccessToken(token);
    expect(result).toBeNull();
  });

  it('returns null for an invalid/malformed token', () => {
    const result = tokenService.verifyAccessToken('not-a-real-token');
    expect(result).toBeNull();
  });

  it('returns null for a token with wrong type', () => {
    const token = jwt.sign(
      { id: mockUser.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '15m', algorithm: 'HS256' }
    );

    const result = tokenService.verifyAccessToken(token);
    expect(result).toBeNull();
  });

  it('returns null for a token signed with a different secret', () => {
    const token = jwt.sign(
      { id: mockUser.id, type: 'access' },
      'a-completely-different-secret-key-longer-than-32',
      { expiresIn: '15m', algorithm: 'HS256' }
    );

    const result = tokenService.verifyAccessToken(token);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// generateRefreshToken
// ---------------------------------------------------------------------------

describe('generateRefreshToken', () => {
  beforeEach(resetMocks);

  it('stores the token in the database and returns a hex string', async () => {
    // No existing sessions
    query.mockResolvedValueOnce({ rows: [] });
    // INSERT returning id
    query.mockResolvedValueOnce({ rows: [{ id: 'tok-1' }] });

    const token = await tokenService.generateRefreshToken(mockUser, mockDeviceInfo);

    expect(typeof token).toBe('string');
    // 64 random bytes => 128 hex characters
    expect(token).toHaveLength(128);
    expect(token).toMatch(/^[0-9a-f]+$/);

    // Verify INSERT was called
    const insertCall = query.mock.calls.find(c => c[0].includes('INSERT INTO refresh_tokens'));
    expect(insertCall).toBeDefined();
    expect(insertCall[1][0]).toBe(mockUser.id);
    expect(insertCall[1][1]).toBe(token);
  });

  it('enforces MAX_SESSIONS_PER_USER by revoking oldest sessions', async () => {
    // Simulate 5 existing sessions (at limit)
    const existingSessions = Array.from({ length: 5 }, (_, i) => ({
      id: `session-${i}`,
      created_at: new Date(Date.now() - (5 - i) * 60000),
    }));
    query.mockResolvedValueOnce({ rows: existingSessions });

    // Revoke call for the oldest session
    query.mockResolvedValueOnce({ rowCount: 1 });

    // INSERT returning id
    query.mockResolvedValueOnce({ rows: [{ id: 'tok-new' }] });

    const token = await tokenService.generateRefreshToken(mockUser, mockDeviceInfo);

    expect(typeof token).toBe('string');

    // Should have revoked at least one session
    const revokeCalls = query.mock.calls.filter(c => c[0].includes('UPDATE refresh_tokens SET revoked_at'));
    expect(revokeCalls.length).toBeGreaterThanOrEqual(1);
    expect(revokeCalls[0][1]).toContain('session-0'); // oldest session
  });

  it('throws when user.id is missing', async () => {
    await expect(tokenService.generateRefreshToken(null)).rejects.toThrow('User object with id is required');
    await expect(tokenService.generateRefreshToken({ email: 'a@b.com' })).rejects.toThrow('User object with id is required');
  });

  it('throws a wrapped error when DB insert fails', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // no existing sessions
    query.mockRejectedValueOnce(new Error('connection refused'));

    await expect(tokenService.generateRefreshToken(mockUser, mockDeviceInfo)).rejects.toThrow('Failed to generate refresh token');
  });

  it('logs the token generation event', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ id: 'tok-1' }] });

    await tokenService.generateRefreshToken(mockUser, mockDeviceInfo);

    expect(securityLogger.logTokenGenerated).toHaveBeenCalledWith(
      mockUser.id,
      'tok-1',
      expect.objectContaining({ ip: mockDeviceInfo.ipAddress }),
      expect.objectContaining({ deviceFingerprint: mockDeviceInfo.deviceFingerprint })
    );
  });
});

// ---------------------------------------------------------------------------
// verifyRefreshToken
// ---------------------------------------------------------------------------

describe('verifyRefreshToken', () => {
  beforeEach(resetMocks);

  const validTokenData = {
    id: 'tok-1',
    user_id: 'user-123',
    token: 'valid-token-hex',
    revoked_at: null,
    expires_at: new Date(Date.now() + 86400000).toISOString(), // +1 day
    device_fingerprint: '"fp-abc-123"',
    last_used_at: new Date().toISOString(),
  };

  it('returns token data for a valid, non-expired, non-revoked token', async () => {
    query.mockResolvedValueOnce({ rows: [validTokenData] }); // SELECT
    query.mockResolvedValueOnce({ rowCount: 1 }); // UPDATE last_used_at

    const result = await tokenService.verifyRefreshToken('valid-token-hex');

    expect(result).not.toBeNull();
    expect(result.id).toBe('tok-1');
    expect(result.user_id).toBe('user-123');

    // Should update last_used_at
    const updateCall = query.mock.calls.find(c => c[0].includes('UPDATE refresh_tokens SET last_used_at'));
    expect(updateCall).toBeDefined();
  });

  it('returns null when token is not found in DB', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const result = await tokenService.verifyRefreshToken('nonexistent-token');

    expect(result).toBeNull();
    expect(securityLogger.logEvent).toHaveBeenCalledWith(
      'token_verification_failed',
      'warning',
      expect.objectContaining({ reason: expect.stringContaining('not found') })
    );
  });

  it('returns null when token is revoked', async () => {
    const revokedToken = { ...validTokenData, revoked_at: new Date().toISOString() };
    query.mockResolvedValueOnce({ rows: [revokedToken] });

    const result = await tokenService.verifyRefreshToken('revoked-token');

    expect(result).toBeNull();
    expect(securityLogger.logEvent).toHaveBeenCalledWith(
      'token_verification_failed',
      'warning',
      expect.objectContaining({ reason: expect.stringContaining('revoked') })
    );
  });

  it('returns null when token is expired', async () => {
    const expiredToken = { ...validTokenData, expires_at: new Date(Date.now() - 1000).toISOString() };
    query.mockResolvedValueOnce({ rows: [expiredToken] });

    const result = await tokenService.verifyRefreshToken('expired-token');

    expect(result).toBeNull();
    expect(securityLogger.logEvent).toHaveBeenCalledWith(
      'token_verification_failed',
      'warning',
      expect.objectContaining({ reason: expect.stringContaining('expired') })
    );
  });

  it('returns null when device fingerprint does not match', async () => {
    const tokenWithFp = { ...validTokenData, device_fingerprint: '"fp-different"' };
    query.mockResolvedValueOnce({ rows: [tokenWithFp] });

    const result = await tokenService.verifyRefreshToken('token', {
      deviceFingerprint: 'fp-abc-123',
    });

    expect(result).toBeNull();
    expect(securityLogger.logDeviceMismatch).toHaveBeenCalled();
  });

  it('updates last_used_at on successful verification', async () => {
    query.mockResolvedValueOnce({ rows: [validTokenData] });
    query.mockResolvedValueOnce({ rowCount: 1 });

    await tokenService.verifyRefreshToken('valid-token-hex');

    const updateCall = query.mock.calls[1];
    expect(updateCall[0]).toContain('UPDATE refresh_tokens SET last_used_at');
    expect(updateCall[1]).toContain(validTokenData.id);
  });

  it('returns null on unexpected database error', async () => {
    query.mockRejectedValueOnce(new Error('db error'));

    const result = await tokenService.verifyRefreshToken('some-token');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// refreshAccessToken
// ---------------------------------------------------------------------------

describe('refreshAccessToken', () => {
  beforeEach(resetMocks);

  const recentLastUsed = new Date(Date.now() - 1000).toISOString(); // 1 second ago (active)
  const staleLastUsed = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago (inactive)

  const makeTokenData = (lastUsed) => ({
    id: 'tok-1',
    user_id: 'user-123',
    token: 'refresh-token-hex',
    revoked_at: null,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    device_fingerprint: null,
    last_used_at: lastUsed,
  });

  function setupActiveRefresh() {
    const tokenData = makeTokenData(recentLastUsed);
    // verifyRefreshToken: SELECT + UPDATE last_used_at
    query.mockResolvedValueOnce({ rows: [tokenData] });
    query.mockResolvedValueOnce({ rowCount: 1 });
    // refreshAccessToken: SELECT user
    query.mockResolvedValueOnce({ rows: [{ id: 'user-123', email: 'test@example.com', userType: 'client' }] });
    // UPDATE expires_at (extend)
    query.mockResolvedValueOnce({ rowCount: 1 });
    return tokenData;
  }

  function setupInactiveRefresh() {
    const tokenData = makeTokenData(staleLastUsed);
    // verifyRefreshToken: SELECT + UPDATE last_used_at
    query.mockResolvedValueOnce({ rows: [tokenData] });
    query.mockResolvedValueOnce({ rowCount: 1 });
    // refreshAccessToken: SELECT user
    query.mockResolvedValueOnce({ rows: [{ id: 'user-123', email: 'test@example.com', userType: 'client' }] });
    // revokeRefreshToken: SELECT token info + UPDATE revoked_at
    query.mockResolvedValueOnce({ rows: [{ id: 'tok-1', user_id: 'user-123' }] });
    query.mockResolvedValueOnce({ rowCount: 1 });
    // generateRefreshToken: SELECT existing sessions + INSERT + (no extra revokes)
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ id: 'tok-2' }] });
    // SELECT new token id
    query.mockResolvedValueOnce({ rows: [{ id: 'tok-2' }] });
    return tokenData;
  }

  it('returns new access token + same refresh token when user is active', async () => {
    setupActiveRefresh();

    const result = await tokenService.refreshAccessToken('refresh-token-hex', {});

    expect(result).not.toBeNull();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBe('refresh-token-hex'); // same token reused
    expect(result.activityExtended).toBe(true);
    expect(result.expiresIn).toBe(900);

    // Verify access token is valid
    const decoded = jwt.verify(result.accessToken, JWT_SECRET, { algorithms: ['HS256'] });
    expect(decoded.id).toBe('user-123');
    expect(decoded.type).toBe('access');
  });

  it('returns new access token + NEW refresh token when user is inactive (rotation)', async () => {
    setupInactiveRefresh();

    const result = await tokenService.refreshAccessToken('refresh-token-hex', {});

    expect(result).not.toBeNull();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).not.toBe('refresh-token-hex'); // rotated
    expect(result.activityExtended).toBe(false);

    // Verify old token was revoked
    const revokeCalls = query.mock.calls.filter(c =>
      typeof c[0] === 'string' && c[0].includes('UPDATE refresh_tokens SET revoked_at')
    );
    expect(revokeCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('returns null when refresh token verification fails', async () => {
    // verifyRefreshToken returns null (token not found)
    query.mockResolvedValueOnce({ rows: [] });

    const result = await tokenService.refreshAccessToken('bad-token', {});
    expect(result).toBeNull();
  });

  it('returns null when user no longer exists', async () => {
    const tokenData = makeTokenData(recentLastUsed);
    // verifyRefreshToken: SELECT + UPDATE
    query.mockResolvedValueOnce({ rows: [tokenData] });
    query.mockResolvedValueOnce({ rowCount: 1 });
    // SELECT user - no rows
    query.mockResolvedValueOnce({ rows: [] });
    // revokeRefreshToken: SELECT + UPDATE
    query.mockResolvedValueOnce({ rows: [{ id: 'tok-1', user_id: 'user-123' }] });
    query.mockResolvedValueOnce({ rowCount: 1 });

    const result = await tokenService.refreshAccessToken('refresh-token-hex', {});
    expect(result).toBeNull();
  });

  it('logs the refresh event', async () => {
    setupActiveRefresh();

    await tokenService.refreshAccessToken('refresh-token-hex', mockDeviceInfo);

    expect(securityLogger.logTokenRefreshed).toHaveBeenCalledWith(
      'user-123',
      'tok-1',
      expect.anything(),
      expect.objectContaining({ ip: mockDeviceInfo.ipAddress }),
      expect.objectContaining({ activityExtended: true })
    );
  });
});

// ---------------------------------------------------------------------------
// revokeRefreshToken
// ---------------------------------------------------------------------------

describe('revokeRefreshToken', () => {
  beforeEach(resetMocks);

  it('updates revoked_at in the database and returns true', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'tok-1', user_id: 'user-123' }] }); // SELECT
    query.mockResolvedValueOnce({ rowCount: 1 }); // UPDATE

    const result = await tokenService.revokeRefreshToken('some-token');

    expect(result).toBe(true);
    const updateCall = query.mock.calls.find(c => c[0].includes('UPDATE refresh_tokens SET revoked_at'));
    expect(updateCall).toBeDefined();
    expect(updateCall[1]).toContain('some-token');
  });

  it('logs the revocation event', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'tok-1', user_id: 'user-123' }] });
    query.mockResolvedValueOnce({ rowCount: 1 });

    await tokenService.revokeRefreshToken('some-token', 'manual_revocation');

    expect(securityLogger.logTokenRevoked).toHaveBeenCalledWith(
      'user-123',
      'tok-1',
      'manual_revocation',
      expect.objectContaining({ timestamp: expect.any(String) })
    );
  });

  it('returns false on database error', async () => {
    query.mockRejectedValueOnce(new Error('db error'));

    const result = await tokenService.revokeRefreshToken('some-token');
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// revokeAllUserTokens
// ---------------------------------------------------------------------------

describe('revokeAllUserTokens', () => {
  beforeEach(resetMocks);

  it('revokes all tokens for a user and returns count', async () => {
    query.mockResolvedValueOnce({ rowCount: 3 });

    const count = await tokenService.revokeAllUserTokens('user-123');

    expect(count).toBe(3);
    const updateCall = query.mock.calls[0];
    expect(updateCall[0]).toContain('UPDATE refresh_tokens SET revoked_at');
    expect(updateCall[0]).toContain('revoked_at IS NULL');
    expect(updateCall[1]).toContain('user-123');
  });

  it('logs mass revocation event', async () => {
    query.mockResolvedValueOnce({ rowCount: 2 });

    await tokenService.revokeAllUserTokens('user-123', 'logout_all');

    expect(securityLogger.logEvent).toHaveBeenCalledWith(
      'mass_token_revocation',
      'info',
      expect.objectContaining({
        userId: 'user-123',
        tokensRevoked: 2,
        reason: 'logout_all',
      })
    );
  });

  it('returns 0 on database error', async () => {
    query.mockRejectedValueOnce(new Error('db error'));

    const count = await tokenService.revokeAllUserTokens('user-123');
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getUserActiveSessions
// ---------------------------------------------------------------------------

describe('getUserActiveSessions', () => {
  beforeEach(resetMocks);

  it('returns active (non-expired, non-revoked) sessions', async () => {
    const sessions = [
      { id: 's1', device_name: 'Chrome', last_used_at: new Date().toISOString() },
      { id: 's2', device_name: 'Firefox', last_used_at: new Date().toISOString() },
    ];
    query.mockResolvedValueOnce({ rows: sessions });

    const result = await tokenService.getUserActiveSessions('user-123');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('s1');

    const selectCall = query.mock.calls[0];
    expect(selectCall[0]).toContain('expires_at > NOW()');
    expect(selectCall[0]).toContain('revoked_at IS NULL');
    expect(selectCall[1]).toContain('user-123');
  });

  it('returns empty array on error', async () => {
    query.mockRejectedValueOnce(new Error('db error'));

    const result = await tokenService.getUserActiveSessions('user-123');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// cleanupExpiredTokens
// ---------------------------------------------------------------------------

describe('cleanupExpiredTokens', () => {
  beforeEach(resetMocks);

  it('deletes expired tokens older than 7 days and returns count', async () => {
    query.mockResolvedValueOnce({ rowCount: 5 });

    const count = await tokenService.cleanupExpiredTokens();

    expect(count).toBe(5);
    const deleteCall = query.mock.calls[0];
    expect(deleteCall[0]).toContain('DELETE FROM refresh_tokens');
    expect(deleteCall[0]).toContain("INTERVAL '7 days'");
  });

  it('returns 0 on database error', async () => {
    query.mockRejectedValueOnce(new Error('db error'));

    const count = await tokenService.cleanupExpiredTokens();
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// generateTokenPair
// ---------------------------------------------------------------------------

describe('generateTokenPair', () => {
  beforeEach(resetMocks);

  it('returns accessToken, refreshToken, expiresIn, and tokenType', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // existing sessions
    query.mockResolvedValueOnce({ rows: [{ id: 'tok-1' }] }); // INSERT

    const result = await tokenService.generateTokenPair(mockUser, mockDeviceInfo);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.expiresIn).toBe(900);
    expect(result.tokenType).toBe('Bearer');

    // Access token should be a valid JWT
    const decoded = jwt.verify(result.accessToken, JWT_SECRET, { algorithms: ['HS256'] });
    expect(decoded.id).toBe(mockUser.id);
    expect(decoded.type).toBe('access');
  });
});

// ---------------------------------------------------------------------------
// Exported constants
// ---------------------------------------------------------------------------

describe('exported constants', () => {
  it('exports expected configuration values', () => {
    expect(tokenService.ACCESS_TOKEN_EXPIRY).toBe('15m');
    expect(tokenService.REFRESH_TOKEN_EXPIRY).toBe(7 * 24 * 60 * 60 * 1000);
    expect(tokenService.ACTIVITY_EXTENSION_THRESHOLD).toBe(5 * 60 * 1000);
    expect(tokenService.MAX_SESSIONS_PER_USER).toBe(5);
  });
});
