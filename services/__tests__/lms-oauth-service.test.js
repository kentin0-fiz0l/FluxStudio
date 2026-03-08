/**
 * LMS OAuth Service Unit Tests
 * @file services/__tests__/lms-oauth-service.test.js
 *
 * Tests all exported functions from lms-oauth-service.js with mocked dependencies.
 * Covers Google Classroom OAuth, Canvas LMS OAuth, token lifecycle, error handling,
 * and connection status.
 */

// ─── Persistent mock functions ───
const mockQuery = jest.fn();
const mockRandomBytes = jest.fn();
const mockCreateHash = jest.fn();
const mockGenerateAuthUrl = jest.fn();
const mockGetToken = jest.fn();
const mockSetCredentials = jest.fn();
const mockRefreshAccessToken = jest.fn();
const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();

// ─── Mock database/config ───
jest.mock('../../database/config', () => ({
  query: mockQuery,
}));

// ─── Mock google-auth-library ───
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: mockGenerateAuthUrl,
    getToken: mockGetToken,
    setCredentials: mockSetCredentials,
    refreshAccessToken: mockRefreshAccessToken,
  })),
}));

// ─── Mock axios ───
jest.mock('axios', () => ({
  get: mockAxiosGet,
  post: mockAxiosPost,
}));

// ─── Mock crypto ───
jest.mock('crypto', () => {
  const actualCrypto = jest.requireActual('crypto');
  return {
    ...actualCrypto,
    randomBytes: mockRandomBytes,
    createHash: mockCreateHash,
  };
});

// ─── Mock logger ───
jest.mock('../../lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// ─── Require service after mocks are established ───
const lmsOAuthService = require('../lms-oauth-service');

// ─── Test constants ───
const TEST_USER_ID = 'user-abc-123';
const TEST_STATE_TOKEN = 'a'.repeat(64); // 32 bytes hex = 64 chars
const TEST_CODE_VERIFIER = 'test-code-verifier-base64url';
const TEST_CODE_CHALLENGE = 'test-code-challenge-sha256';
const TEST_AUTH_CODE = 'auth-code-from-provider';

// ─── Helper: configure crypto mocks for state token generation ───
function setupCryptoMocks() {
  // randomBytes for generateStateToken (32-byte hex)
  mockRandomBytes.mockImplementation((size) => {
    if (size === 32) {
      return {
        toString: jest.fn((encoding) => {
          if (encoding === 'hex') return TEST_STATE_TOKEN;
          if (encoding === 'base64url') return TEST_CODE_VERIFIER;
          return 'fallback';
        }),
      };
    }
    return { toString: jest.fn(() => 'unknown') };
  });

  const mockDigest = jest.fn(() => TEST_CODE_CHALLENGE);
  const mockUpdate = jest.fn(() => ({ digest: mockDigest }));
  mockCreateHash.mockReturnValue({ update: mockUpdate });
}

// ─── Environment setup ───
const originalEnv = { ...process.env };

describe('LMS OAuth Service', () => {
  beforeAll(() => {
    process.env.GOOGLE_CLASSROOM_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_CLASSROOM_CLIENT_SECRET = 'google-client-secret';
    process.env.GOOGLE_CLASSROOM_REDIRECT_URI = 'https://fluxstudio.art/auth/callback/google_classroom';
    process.env.CANVAS_LMS_DEVELOPER_KEY_ID = 'canvas-dev-key-id';
    process.env.CANVAS_LMS_DEVELOPER_KEY_SECRET = 'canvas-dev-key-secret';
    process.env.CANVAS_LMS_REDIRECT_URI = 'https://fluxstudio.art/auth/callback/canvas_lms';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setupCryptoMocks();
  });

  // ============================================================================
  // Google Classroom OAuth
  // ============================================================================

  describe('Google Classroom OAuth', () => {
    // ─── initiateGoogleClassroomOAuth ───
    describe('initiateGoogleClassroomOAuth', () => {
      it('should generate an authorization URL with correct parameters', async () => {
        const expectedAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?state=abc';
        mockQuery.mockResolvedValue({ rows: [] });
        mockGenerateAuthUrl.mockReturnValue(expectedAuthUrl);

        const authUrl = await lmsOAuthService.initiateGoogleClassroomOAuth(TEST_USER_ID);

        expect(authUrl).toBe(expectedAuthUrl);
        expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
          access_type: 'offline',
          prompt: 'consent',
          scope: [
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.coursework.students',
          ],
          state: TEST_STATE_TOKEN,
        });
      });

      it('should store the state token in the database', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        mockGenerateAuthUrl.mockReturnValue('https://example.com/auth');

        await lmsOAuthService.initiateGoogleClassroomOAuth(TEST_USER_ID);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO oauth_state_tokens'),
          expect.arrayContaining([
            TEST_USER_ID,
            'google_classroom',
            TEST_STATE_TOKEN,
          ]),
        );
      });

      it('should generate a 32-byte random state token', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        mockGenerateAuthUrl.mockReturnValue('https://example.com/auth');

        await lmsOAuthService.initiateGoogleClassroomOAuth(TEST_USER_ID);

        // randomBytes called twice: once for stateToken (32 hex), once for codeVerifier (32 base64url)
        expect(mockRandomBytes).toHaveBeenCalledWith(32);
      });

      it('should store code_challenge and code_verifier with the state token', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        mockGenerateAuthUrl.mockReturnValue('https://example.com/auth');

        await lmsOAuthService.initiateGoogleClassroomOAuth(TEST_USER_ID);

        // The INSERT query should include codeChallenge and codeVerifier
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('code_challenge'),
          expect.arrayContaining([TEST_CODE_CHALLENGE, TEST_CODE_VERIFIER]),
        );
      });
    });

    // ─── handleGoogleClassroomCallback ───
    describe('handleGoogleClassroomCallback', () => {
      const mockTokens = {
        access_token: 'google-access-token-123',
        refresh_token: 'google-refresh-token-456',
        expiry_date: Date.now() + 3600 * 1000,
      };

      it('should consume the state token and exchange the code for tokens', async () => {
        // consumeStateToken UPDATE query
        mockQuery.mockResolvedValueOnce({
          rows: [{ user_id: TEST_USER_ID, provider: 'google_classroom' }],
        });
        // upsertToken SELECT existing
        mockQuery.mockResolvedValueOnce({ rows: [] });
        // upsertToken INSERT
        mockQuery.mockResolvedValueOnce({ rows: [] });

        mockGetToken.mockResolvedValue({ tokens: mockTokens });

        const result = await lmsOAuthService.handleGoogleClassroomCallback(
          TEST_AUTH_CODE,
          TEST_STATE_TOKEN,
          TEST_USER_ID,
        );

        expect(result).toEqual({ success: true });
        expect(mockGetToken).toHaveBeenCalledWith(TEST_AUTH_CODE);
      });

      it('should store tokens with correct expiry', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ user_id: TEST_USER_ID, provider: 'google_classroom' }],
        });
        mockQuery.mockResolvedValueOnce({ rows: [] }); // no existing token
        mockQuery.mockResolvedValueOnce({ rows: [] }); // INSERT

        mockGetToken.mockResolvedValue({ tokens: mockTokens });

        await lmsOAuthService.handleGoogleClassroomCallback(
          TEST_AUTH_CODE,
          TEST_STATE_TOKEN,
          TEST_USER_ID,
        );

        // The INSERT for oauth_tokens should be called
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO oauth_tokens'),
          expect.arrayContaining([
            TEST_USER_ID,
            'google_classroom',
            'google-access-token-123',
            'google-refresh-token-456',
          ]),
        );
      });

      it('should default expiry to 1 hour if expiry_date is not provided', async () => {
        const tokensNoExpiry = {
          access_token: 'access-no-expiry',
          refresh_token: 'refresh-no-expiry',
          expiry_date: null,
        };

        mockQuery.mockResolvedValueOnce({
          rows: [{ user_id: TEST_USER_ID }],
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        mockGetToken.mockResolvedValue({ tokens: tokensNoExpiry });

        const before = Date.now();
        await lmsOAuthService.handleGoogleClassroomCallback(
          TEST_AUTH_CODE,
          TEST_STATE_TOKEN,
          TEST_USER_ID,
        );
        const after = Date.now();

        // Verify the expiry date passed to the INSERT query
        const insertCall = mockQuery.mock.calls.find(
          (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO oauth_tokens'),
        );
        expect(insertCall).toBeDefined();
        const expiresAt = insertCall[1][4]; // 5th param: expiresAt
        const expiresAtMs = new Date(expiresAt).getTime();
        // Should be approximately now + 3600*1000
        expect(expiresAtMs).toBeGreaterThanOrEqual(before + 3600 * 1000 - 100);
        expect(expiresAtMs).toBeLessThanOrEqual(after + 3600 * 1000 + 100);
      });

      it('should reject reuse of consumed state tokens', async () => {
        // consumeStateToken returns empty rows (already used or expired)
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await expect(
          lmsOAuthService.handleGoogleClassroomCallback(
            TEST_AUTH_CODE,
            'used-state-token',
            TEST_USER_ID,
          ),
        ).rejects.toThrow('Invalid or expired OAuth state token');
      });

      it('should reject expired state tokens', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await expect(
          lmsOAuthService.handleGoogleClassroomCallback(
            TEST_AUTH_CODE,
            'expired-state-token',
            TEST_USER_ID,
          ),
        ).rejects.toThrow('Invalid or expired OAuth state token');
      });
    });

    // ─── getGoogleClassroomCourses ───
    describe('getGoogleClassroomCourses', () => {
      it('should fetch courses from Google Classroom API', async () => {
        // getTokenRow
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'token-1',
            access_token: 'valid-access-token',
            refresh_token: 'refresh-token',
            expires_at: new Date(Date.now() + 3600 * 1000),
            is_active: true,
          }],
        });
        // last_used_at update
        mockQuery.mockResolvedValueOnce({ rows: [] });

        mockAxiosGet.mockResolvedValue({
          data: {
            courses: [
              { id: 'course-1', name: 'Art 101', section: 'A', enrollmentCode: 'XYZ' },
              { id: 'course-2', name: 'Design 201', section: null, enrollmentCode: null },
            ],
          },
        });

        const courses = await lmsOAuthService.getGoogleClassroomCourses(TEST_USER_ID);

        expect(courses).toHaveLength(2);
        expect(courses[0]).toEqual({
          id: 'course-1',
          name: 'Art 101',
          section: 'A',
          enrollmentCode: 'XYZ',
        });
        expect(courses[1]).toEqual({
          id: 'course-2',
          name: 'Design 201',
          section: null,
          enrollmentCode: null,
        });

        expect(mockAxiosGet).toHaveBeenCalledWith(
          'https://classroom.googleapis.com/v1/courses',
          expect.objectContaining({
            headers: { Authorization: 'Bearer valid-access-token' },
            params: { teacherId: 'me', courseStates: 'ACTIVE' },
          }),
        );
      });

      it('should return empty array when no courses exist', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'token-1',
            access_token: 'valid-token',
            expires_at: new Date(Date.now() + 3600 * 1000),
            is_active: true,
          }],
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        mockAxiosGet.mockResolvedValue({ data: { courses: null } });

        const courses = await lmsOAuthService.getGoogleClassroomCourses(TEST_USER_ID);

        expect(courses).toEqual([]);
      });

      it('should throw when Google Classroom is not connected', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await expect(
          lmsOAuthService.getGoogleClassroomCourses(TEST_USER_ID),
        ).rejects.toThrow('Google Classroom not connected');
      });

      it('should propagate API errors', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'token-1',
            access_token: 'valid-token',
            expires_at: new Date(Date.now() + 3600 * 1000),
          }],
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const apiError = new Error('API request failed');
        apiError.response = { status: 403, data: { error: { message: 'Forbidden' } } };
        mockAxiosGet.mockRejectedValue(apiError);

        await expect(
          lmsOAuthService.getGoogleClassroomCourses(TEST_USER_ID),
        ).rejects.toThrow('API request failed');
      });
    });

    // ─── createGoogleClassroomAssignment ───
    describe('createGoogleClassroomAssignment', () => {
      const courseId = 'course-123';
      const title = 'FluxStudio Design Project';
      const embedUrl = 'https://fluxstudio.art/embed/formation/form-abc';

      beforeEach(() => {
        // getTokenRow
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'token-1',
            access_token: 'valid-access-token',
            expires_at: new Date(Date.now() + 3600 * 1000),
          }],
        });
        // last_used_at update
        mockQuery.mockResolvedValueOnce({ rows: [] });
      });

      it('should create an assignment with correct payload', async () => {
        mockAxiosPost.mockResolvedValue({
          data: {
            id: 'assignment-789',
            alternateLink: 'https://classroom.google.com/c/course-123/a/assignment-789',
          },
        });

        const result = await lmsOAuthService.createGoogleClassroomAssignment(
          TEST_USER_ID,
          courseId,
          title,
          embedUrl,
        );

        expect(result.assignmentId).toBe('assignment-789');
        expect(result.url).toBe('https://classroom.google.com/c/course-123/a/assignment-789');

        expect(mockAxiosPost).toHaveBeenCalledWith(
          `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`,
          {
            title,
            workType: 'ASSIGNMENT',
            state: 'PUBLISHED',
            materials: [
              {
                link: {
                  url: embedUrl,
                  title,
                },
              },
            ],
          },
          { headers: { Authorization: 'Bearer valid-access-token' } },
        );
      });

      it('should construct fallback URL when alternateLink is missing', async () => {
        mockAxiosPost.mockResolvedValue({
          data: {
            id: 'assignment-999',
            alternateLink: null,
          },
        });

        const result = await lmsOAuthService.createGoogleClassroomAssignment(
          TEST_USER_ID,
          courseId,
          title,
          embedUrl,
        );

        expect(result.url).toBe(
          `https://classroom.google.com/c/${courseId}/a/assignment-999`,
        );
      });

      it('should propagate API errors on assignment creation failure', async () => {
        mockAxiosPost.mockRejectedValue(new Error('Assignment creation failed'));

        await expect(
          lmsOAuthService.createGoogleClassroomAssignment(
            TEST_USER_ID,
            courseId,
            title,
            embedUrl,
          ),
        ).rejects.toThrow('Assignment creation failed');
      });
    });
  });

  // ============================================================================
  // Canvas LMS OAuth
  // ============================================================================

  describe('Canvas LMS OAuth', () => {
    const CANVAS_INSTITUTION_URL = 'https://myschool.instructure.com';

    // ─── initiateCanvasOAuth ───
    describe('initiateCanvasOAuth', () => {
      it('should generate an authorization URL with institution base URL', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const authUrl = await lmsOAuthService.initiateCanvasOAuth(
          TEST_USER_ID,
          CANVAS_INSTITUTION_URL,
        );

        expect(authUrl).toContain(`${CANVAS_INSTITUTION_URL}/login/oauth2/auth`);
        expect(authUrl).toContain('client_id=canvas-dev-key-id');
        expect(authUrl).toContain('response_type=code');
        expect(authUrl).toContain(encodeURIComponent('https://fluxstudio.art/auth/callback/canvas_lms'));
      });

      it('should encode institution URL into composite state as base64url', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const authUrl = await lmsOAuthService.initiateCanvasOAuth(
          TEST_USER_ID,
          CANVAS_INSTITUTION_URL,
        );

        // The state should be: stateToken:base64url(institutionUrl)
        const urlObj = new URL(authUrl);
        const stateParam = urlObj.searchParams.get('state');
        expect(stateParam).toBeTruthy();

        const colonIdx = stateParam.indexOf(':');
        expect(colonIdx).toBeGreaterThan(0);

        const encodedUrl = stateParam.substring(colonIdx + 1);
        const decodedUrl = Buffer.from(encodedUrl, 'base64url').toString();
        expect(decodedUrl).toBe(CANVAS_INSTITUTION_URL);
      });

      it('should strip trailing slashes from institution URL', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const authUrl = await lmsOAuthService.initiateCanvasOAuth(
          TEST_USER_ID,
          'https://myschool.instructure.com///',
        );

        // Should not contain trailing slashes in the base URL
        expect(authUrl).toContain('https://myschool.instructure.com/login/oauth2/auth');
      });

      it('should throw when institution URL is missing', async () => {
        await expect(
          lmsOAuthService.initiateCanvasOAuth(TEST_USER_ID, null),
        ).rejects.toThrow('Canvas institution URL is required');

        await expect(
          lmsOAuthService.initiateCanvasOAuth(TEST_USER_ID, ''),
        ).rejects.toThrow('Canvas institution URL is required');
      });

      it('should store state token with canvas_lms provider', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await lmsOAuthService.initiateCanvasOAuth(TEST_USER_ID, CANVAS_INSTITUTION_URL);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO oauth_state_tokens'),
          expect.arrayContaining([TEST_USER_ID, 'canvas_lms', TEST_STATE_TOKEN]),
        );
      });
    });

    // ─── handleCanvasCallback ───
    describe('handleCanvasCallback', () => {
      const canvasTokenResponse = {
        access_token: 'canvas-access-token-abc',
        refresh_token: 'canvas-refresh-token-def',
        expires_in: 3600,
      };

      function makeCompositeState(stateToken, institutionUrl) {
        return `${stateToken}:${Buffer.from(institutionUrl).toString('base64url')}`;
      }

      it('should decode composite state and exchange code for tokens', async () => {
        const compositeState = makeCompositeState(TEST_STATE_TOKEN, CANVAS_INSTITUTION_URL);

        // consumeStateToken
        mockQuery.mockResolvedValueOnce({
          rows: [{ user_id: TEST_USER_ID, provider: 'canvas_lms' }],
        });
        // upsertToken SELECT
        mockQuery.mockResolvedValueOnce({ rows: [] });
        // upsertToken INSERT
        mockQuery.mockResolvedValueOnce({ rows: [] });

        mockAxiosPost.mockResolvedValue({ data: canvasTokenResponse });

        const result = await lmsOAuthService.handleCanvasCallback(
          TEST_AUTH_CODE,
          compositeState,
          TEST_USER_ID,
        );

        expect(result).toEqual({ success: true });
        expect(mockAxiosPost).toHaveBeenCalledWith(
          `${CANVAS_INSTITUTION_URL}/login/oauth2/token`,
          {
            grant_type: 'authorization_code',
            client_id: 'canvas-dev-key-id',
            client_secret: 'canvas-dev-key-secret',
            redirect_uri: 'https://fluxstudio.art/auth/callback/canvas_lms',
            code: TEST_AUTH_CODE,
          },
        );
      });

      it('should store tokens with the institution base URL (providerBaseUrl)', async () => {
        const compositeState = makeCompositeState(TEST_STATE_TOKEN, CANVAS_INSTITUTION_URL);

        mockQuery.mockResolvedValueOnce({
          rows: [{ user_id: TEST_USER_ID }],
        });
        mockQuery.mockResolvedValueOnce({ rows: [] }); // no existing token
        mockQuery.mockResolvedValueOnce({ rows: [] }); // INSERT

        mockAxiosPost.mockResolvedValue({ data: canvasTokenResponse });

        await lmsOAuthService.handleCanvasCallback(
          TEST_AUTH_CODE,
          compositeState,
          TEST_USER_ID,
        );

        // Verify INSERT includes providerBaseUrl
        const insertCall = mockQuery.mock.calls.find(
          (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO oauth_tokens'),
        );
        expect(insertCall).toBeDefined();
        expect(insertCall[1]).toContain(CANVAS_INSTITUTION_URL);
      });

      it('should throw on invalid composite state (no colon separator)', async () => {
        await expect(
          lmsOAuthService.handleCanvasCallback(
            TEST_AUTH_CODE,
            'invalid-state-no-colon',
            TEST_USER_ID,
          ),
        ).rejects.toThrow('Invalid Canvas OAuth state');
      });

      it('should reject consumed or expired state tokens', async () => {
        const compositeState = makeCompositeState('used-token', CANVAS_INSTITUTION_URL);
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await expect(
          lmsOAuthService.handleCanvasCallback(
            TEST_AUTH_CODE,
            compositeState,
            TEST_USER_ID,
          ),
        ).rejects.toThrow('Invalid or expired OAuth state token');
      });

      it('should default expiry to 1 hour when expires_in is not provided', async () => {
        const compositeState = makeCompositeState(TEST_STATE_TOKEN, CANVAS_INSTITUTION_URL);

        mockQuery.mockResolvedValueOnce({
          rows: [{ user_id: TEST_USER_ID }],
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        mockAxiosPost.mockResolvedValue({
          data: {
            access_token: 'token',
            refresh_token: null,
            expires_in: null,
          },
        });

        const before = Date.now();
        await lmsOAuthService.handleCanvasCallback(
          TEST_AUTH_CODE,
          compositeState,
          TEST_USER_ID,
        );
        const after = Date.now();

        const insertCall = mockQuery.mock.calls.find(
          (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO oauth_tokens'),
        );
        expect(insertCall).toBeDefined();
        const expiresAt = insertCall[1][4]; // expiresAt param
        const expiresAtMs = new Date(expiresAt).getTime();
        expect(expiresAtMs).toBeGreaterThanOrEqual(before + 3600 * 1000 - 100);
        expect(expiresAtMs).toBeLessThanOrEqual(after + 3600 * 1000 + 100);
      });
    });

    // ─── getCanvasCourses ───
    describe('getCanvasCourses', () => {
      it('should fetch courses from Canvas API', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'token-1',
            access_token: 'canvas-token',
            refresh_token: 'canvas-refresh',
            expires_at: new Date(Date.now() + 3600 * 1000),
            provider_base_url: CANVAS_INSTITUTION_URL,
          }],
        });
        mockQuery.mockResolvedValueOnce({ rows: [] }); // last_used_at update

        mockAxiosGet.mockResolvedValue({
          data: [
            { id: 101, name: 'Intro to Design', course_code: 'DES101' },
            { id: 202, name: 'Advanced Art', course_code: null },
          ],
        });

        const courses = await lmsOAuthService.getCanvasCourses(TEST_USER_ID);

        expect(courses).toHaveLength(2);
        expect(courses[0]).toEqual({
          id: '101',
          name: 'Intro to Design',
          section: 'DES101',
        });
        expect(courses[1]).toEqual({
          id: '202',
          name: 'Advanced Art',
          section: null,
        });

        expect(mockAxiosGet).toHaveBeenCalledWith(
          `${CANVAS_INSTITUTION_URL}/api/v1/courses`,
          expect.objectContaining({
            headers: { Authorization: 'Bearer canvas-token' },
            params: { enrollment_type: 'teacher', per_page: 50 },
          }),
        );
      });

      it('should convert course IDs to strings', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'token-1',
            access_token: 'canvas-token',
            expires_at: new Date(Date.now() + 3600 * 1000),
            provider_base_url: CANVAS_INSTITUTION_URL,
          }],
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        mockAxiosGet.mockResolvedValue({
          data: [{ id: 12345, name: 'Course', course_code: 'C1' }],
        });

        const courses = await lmsOAuthService.getCanvasCourses(TEST_USER_ID);

        expect(typeof courses[0].id).toBe('string');
        expect(courses[0].id).toBe('12345');
      });

      it('should throw when Canvas LMS is not connected', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await expect(
          lmsOAuthService.getCanvasCourses(TEST_USER_ID),
        ).rejects.toThrow('Canvas LMS not connected');
      });

      it('should return empty array when API returns null data', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'token-1',
            access_token: 'canvas-token',
            expires_at: new Date(Date.now() + 3600 * 1000),
            provider_base_url: CANVAS_INSTITUTION_URL,
          }],
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        mockAxiosGet.mockResolvedValue({ data: null });

        const courses = await lmsOAuthService.getCanvasCourses(TEST_USER_ID);

        expect(courses).toEqual([]);
      });
    });

    // ─── createCanvasAssignment ───
    describe('createCanvasAssignment', () => {
      const courseId = 'canvas-course-456';
      const title = 'FluxStudio Formation';
      const embedUrl = 'https://fluxstudio.art/embed/formation/form-xyz';

      beforeEach(() => {
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'token-1',
            access_token: 'canvas-access-token',
            expires_at: new Date(Date.now() + 3600 * 1000),
            provider_base_url: CANVAS_INSTITUTION_URL,
          }],
        });
        mockQuery.mockResolvedValueOnce({ rows: [] }); // last_used_at
      });

      it('should create an assignment with external tool submission type', async () => {
        mockAxiosPost.mockResolvedValue({
          data: {
            id: 789,
            html_url: `${CANVAS_INSTITUTION_URL}/courses/${courseId}/assignments/789`,
          },
        });

        const result = await lmsOAuthService.createCanvasAssignment(
          TEST_USER_ID,
          courseId,
          title,
          embedUrl,
        );

        expect(result.assignmentId).toBe('789');
        expect(result.url).toBe(`${CANVAS_INSTITUTION_URL}/courses/${courseId}/assignments/789`);

        expect(mockAxiosPost).toHaveBeenCalledWith(
          `${CANVAS_INSTITUTION_URL}/api/v1/courses/${courseId}/assignments`,
          {
            assignment: {
              name: title,
              submission_types: ['external_tool'],
              external_tool_tag_attributes: {
                url: embedUrl,
                new_tab: true,
              },
              published: true,
            },
          },
          { headers: { Authorization: 'Bearer canvas-access-token' } },
        );
      });

      it('should construct fallback URL when html_url is missing', async () => {
        mockAxiosPost.mockResolvedValue({
          data: {
            id: 999,
            html_url: null,
          },
        });

        const result = await lmsOAuthService.createCanvasAssignment(
          TEST_USER_ID,
          courseId,
          title,
          embedUrl,
        );

        expect(result.url).toBe(
          `${CANVAS_INSTITUTION_URL}/courses/${courseId}/assignments/999`,
        );
      });

      it('should convert assignment ID to string', async () => {
        mockAxiosPost.mockResolvedValue({
          data: { id: 42, html_url: 'https://example.com' },
        });

        const result = await lmsOAuthService.createCanvasAssignment(
          TEST_USER_ID,
          courseId,
          title,
          embedUrl,
        );

        expect(typeof result.assignmentId).toBe('string');
        expect(result.assignmentId).toBe('42');
      });
    });
  });

  // ============================================================================
  // Token Lifecycle
  // ============================================================================

  describe('Token Lifecycle', () => {
    // ─── upsertToken: INSERT vs UPDATE ───
    describe('upsertToken (insert vs update)', () => {
      it('should INSERT a new token when no existing token exists', async () => {
        // Trigger upsertToken through handleGoogleClassroomCallback
        // consumeStateToken
        mockQuery.mockResolvedValueOnce({
          rows: [{ user_id: TEST_USER_ID }],
        });
        // upsertToken SELECT - no existing row
        mockQuery.mockResolvedValueOnce({ rows: [] });
        // upsertToken INSERT
        mockQuery.mockResolvedValueOnce({ rows: [] });

        mockGetToken.mockResolvedValue({
          tokens: {
            access_token: 'new-token',
            refresh_token: 'new-refresh',
            expiry_date: Date.now() + 3600000,
          },
        });

        await lmsOAuthService.handleGoogleClassroomCallback(
          TEST_AUTH_CODE,
          TEST_STATE_TOKEN,
          TEST_USER_ID,
        );

        // Verify INSERT was called, not UPDATE
        const insertCalls = mockQuery.mock.calls.filter(
          (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO oauth_tokens'),
        );
        const updateTokenCalls = mockQuery.mock.calls.filter(
          (call) => typeof call[0] === 'string' &&
            call[0].includes('UPDATE oauth_tokens') &&
            call[0].includes('access_token'),
        );

        expect(insertCalls).toHaveLength(1);
        expect(updateTokenCalls).toHaveLength(0);
      });

      it('should UPDATE an existing token when one already exists', async () => {
        // consumeStateToken
        mockQuery.mockResolvedValueOnce({
          rows: [{ user_id: TEST_USER_ID }],
        });
        // upsertToken SELECT - existing row found
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-token-id' }] });
        // upsertToken UPDATE
        mockQuery.mockResolvedValueOnce({ rows: [] });

        mockGetToken.mockResolvedValue({
          tokens: {
            access_token: 'updated-token',
            refresh_token: 'updated-refresh',
            expiry_date: Date.now() + 3600000,
          },
        });

        await lmsOAuthService.handleGoogleClassroomCallback(
          TEST_AUTH_CODE,
          TEST_STATE_TOKEN,
          TEST_USER_ID,
        );

        // Verify UPDATE was called, not INSERT
        const updateCalls = mockQuery.mock.calls.filter(
          (call) => typeof call[0] === 'string' &&
            call[0].includes('UPDATE oauth_tokens') &&
            call[0].includes('access_token = $1'),
        );
        const insertCalls = mockQuery.mock.calls.filter(
          (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO oauth_tokens'),
        );

        expect(updateCalls).toHaveLength(1);
        expect(insertCalls).toHaveLength(0);
      });
    });

    // ─── Token refresh ───
    describe('Token refresh when expired', () => {
      it('should refresh Google Classroom token when expired and refresh_token available', async () => {
        const expiredDate = new Date(Date.now() - 60000); // expired 1 min ago
        const newCredentials = {
          access_token: 'refreshed-access-token',
          refresh_token: 'new-refresh-token',
          expiry_date: Date.now() + 3600000,
        };

        // getTokenRow - expired token
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'token-1',
            access_token: 'expired-access-token',
            refresh_token: 'valid-refresh-token',
            expires_at: expiredDate,
            is_active: true,
          }],
        });
        // upsertToken SELECT
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 'token-1' }] });
        // upsertToken UPDATE
        mockQuery.mockResolvedValueOnce({ rows: [] });

        mockRefreshAccessToken.mockResolvedValue({ credentials: newCredentials });

        mockAxiosGet.mockResolvedValue({ data: { courses: [] } });

        const courses = await lmsOAuthService.getGoogleClassroomCourses(TEST_USER_ID);

        expect(mockSetCredentials).toHaveBeenCalledWith({
          refresh_token: 'valid-refresh-token',
        });
        expect(mockRefreshAccessToken).toHaveBeenCalled();
        expect(mockAxiosGet).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: { Authorization: 'Bearer refreshed-access-token' },
          }),
        );
      });

      it('should refresh Canvas token when expired and refresh_token available', async () => {
        const expiredDate = new Date(Date.now() - 60000);
        const baseUrl = 'https://canvas.school.edu';

        // getTokenRow - expired Canvas token
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'token-1',
            access_token: 'expired-canvas-token',
            refresh_token: 'canvas-refresh-token',
            expires_at: expiredDate,
            provider_base_url: baseUrl,
            is_active: true,
          }],
        });
        // upsertToken SELECT
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 'token-1' }] });
        // upsertToken UPDATE
        mockQuery.mockResolvedValueOnce({ rows: [] });

        // Token refresh response
        mockAxiosPost.mockResolvedValueOnce({
          data: {
            access_token: 'new-canvas-access',
            refresh_token: 'new-canvas-refresh',
            expires_in: 3600,
          },
        });

        // Courses fetch
        mockAxiosGet.mockResolvedValue({ data: [] });

        await lmsOAuthService.getCanvasCourses(TEST_USER_ID);

        expect(mockAxiosPost).toHaveBeenCalledWith(
          `${baseUrl}/login/oauth2/token`,
          {
            grant_type: 'refresh_token',
            client_id: 'canvas-dev-key-id',
            client_secret: 'canvas-dev-key-secret',
            refresh_token: 'canvas-refresh-token',
          },
        );
      });

      it('should not refresh token when it is still valid', async () => {
        const validDate = new Date(Date.now() + 3600 * 1000);

        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'token-1',
            access_token: 'still-valid-token',
            refresh_token: 'refresh-token',
            expires_at: validDate,
            is_active: true,
          }],
        });
        // last_used_at update
        mockQuery.mockResolvedValueOnce({ rows: [] });

        mockAxiosGet.mockResolvedValue({ data: { courses: [] } });

        await lmsOAuthService.getGoogleClassroomCourses(TEST_USER_ID);

        expect(mockRefreshAccessToken).not.toHaveBeenCalled();
        expect(mockAxiosGet).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: { Authorization: 'Bearer still-valid-token' },
          }),
        );
      });

      it('should update last_used_at when using a valid (non-expired) token', async () => {
        const validDate = new Date(Date.now() + 3600 * 1000);

        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'token-42',
            access_token: 'valid-token',
            expires_at: validDate,
          }],
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });

        mockAxiosGet.mockResolvedValue({ data: { courses: [] } });

        await lmsOAuthService.getGoogleClassroomCourses(TEST_USER_ID);

        // Verify last_used_at UPDATE
        const lastUsedCall = mockQuery.mock.calls.find(
          (call) => typeof call[0] === 'string' && call[0].includes('last_used_at'),
        );
        expect(lastUsedCall).toBeDefined();
        expect(lastUsedCall[1]).toEqual(['token-42']);
      });
    });

    // ─── deactivateToken ───
    describe('deactivateToken', () => {
      it('should set is_active to false for the given user and provider', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await lmsOAuthService.deactivateToken(TEST_USER_ID, 'google_classroom');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE oauth_tokens SET is_active = false'),
          [TEST_USER_ID, 'google_classroom'],
        );
      });

      it('should work for canvas_lms provider', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await lmsOAuthService.deactivateToken(TEST_USER_ID, 'canvas_lms');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('is_active = false'),
          [TEST_USER_ID, 'canvas_lms'],
        );
      });

      it('should not throw even if no rows match', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        await expect(
          lmsOAuthService.deactivateToken(TEST_USER_ID, 'nonexistent_provider'),
        ).resolves.not.toThrow();
      });
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should throw when Google Classroom token is expired with no refresh token', async () => {
      const expiredDate = new Date(Date.now() - 60000);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'token-1',
          access_token: 'expired-token',
          refresh_token: null,
          expires_at: expiredDate,
          is_active: true,
        }],
      });

      await expect(
        lmsOAuthService.getGoogleClassroomCourses(TEST_USER_ID),
      ).rejects.toThrow('Google Classroom token expired and no refresh token available');
    });

    it('should throw when Canvas token is expired with no refresh token', async () => {
      const expiredDate = new Date(Date.now() - 60000);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'token-1',
          access_token: 'expired-canvas-token',
          refresh_token: null,
          expires_at: expiredDate,
          provider_base_url: 'https://canvas.school.edu',
          is_active: true,
        }],
      });

      await expect(
        lmsOAuthService.getCanvasCourses(TEST_USER_ID),
      ).rejects.toThrow('Canvas LMS token expired and no refresh token available');
    });

    it('should propagate database errors from consumeStateToken', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection lost'));

      await expect(
        lmsOAuthService.handleGoogleClassroomCallback(
          TEST_AUTH_CODE,
          TEST_STATE_TOKEN,
          TEST_USER_ID,
        ),
      ).rejects.toThrow('Database connection lost');
    });

    it('should propagate errors from Google getToken exchange', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ user_id: TEST_USER_ID }],
      });

      mockGetToken.mockRejectedValue(new Error('Invalid authorization code'));

      await expect(
        lmsOAuthService.handleGoogleClassroomCallback(
          'bad-code',
          TEST_STATE_TOKEN,
          TEST_USER_ID,
        ),
      ).rejects.toThrow('Invalid authorization code');
    });

    it('should propagate errors from Canvas token exchange', async () => {
      const compositeState = `${TEST_STATE_TOKEN}:${Buffer.from('https://canvas.school.edu').toString('base64url')}`;

      mockQuery.mockResolvedValueOnce({
        rows: [{ user_id: TEST_USER_ID }],
      });

      mockAxiosPost.mockRejectedValue(new Error('Canvas token exchange failed'));

      await expect(
        lmsOAuthService.handleCanvasCallback(
          TEST_AUTH_CODE,
          compositeState,
          TEST_USER_ID,
        ),
      ).rejects.toThrow('Canvas token exchange failed');
    });

    it('should propagate Google Classroom API errors during token refresh', async () => {
      const expiredDate = new Date(Date.now() - 60000);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'token-1',
          access_token: 'expired',
          refresh_token: 'valid-refresh',
          expires_at: expiredDate,
          is_active: true,
        }],
      });

      mockRefreshAccessToken.mockRejectedValue(
        new Error('Token has been revoked'),
      );

      await expect(
        lmsOAuthService.getGoogleClassroomCourses(TEST_USER_ID),
      ).rejects.toThrow('Token has been revoked');
    });

    it('should propagate Canvas API errors during token refresh', async () => {
      const expiredDate = new Date(Date.now() - 60000);
      const baseUrl = 'https://canvas.school.edu';

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'token-1',
          access_token: 'expired',
          refresh_token: 'valid-refresh',
          expires_at: expiredDate,
          provider_base_url: baseUrl,
          is_active: true,
        }],
      });

      mockAxiosPost.mockRejectedValue(new Error('Refresh token expired'));

      await expect(
        lmsOAuthService.getCanvasCourses(TEST_USER_ID),
      ).rejects.toThrow('Refresh token expired');
    });
  });

  // ============================================================================
  // getLMSConnectionStatus
  // ============================================================================

  describe('getLMSConnectionStatus', () => {
    it('should return connected providers with expiry info', async () => {
      const futureDate = new Date(Date.now() + 3600 * 1000);
      const pastDate = new Date(Date.now() - 60000);

      mockQuery.mockResolvedValue({
        rows: [
          {
            provider: 'google_classroom',
            provider_base_url: null,
            expires_at: futureDate,
          },
          {
            provider: 'canvas_lms',
            provider_base_url: 'https://canvas.school.edu',
            expires_at: pastDate,
          },
        ],
      });

      const status = await lmsOAuthService.getLMSConnectionStatus(TEST_USER_ID);

      expect(status.google_classroom).toEqual({
        connected: true,
        baseUrl: null,
        isExpired: false,
      });

      expect(status.canvas_lms).toEqual({
        connected: true,
        baseUrl: 'https://canvas.school.edu',
        isExpired: true,
      });
    });

    it('should return empty object when no LMS providers are connected', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const status = await lmsOAuthService.getLMSConnectionStatus(TEST_USER_ID);

      expect(status).toEqual({});
    });

    it('should query only google_classroom and canvas_lms providers', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await lmsOAuthService.getLMSConnectionStatus(TEST_USER_ID);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("'google_classroom', 'canvas_lms'"),
        [TEST_USER_ID],
      );
    });

    it('should only return active tokens', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await lmsOAuthService.getLMSConnectionStatus(TEST_USER_ID);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
        [TEST_USER_ID],
      );
    });

    it('should handle null expires_at gracefully (isExpired = false)', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            provider: 'google_classroom',
            provider_base_url: null,
            expires_at: null,
          },
        ],
      });

      const status = await lmsOAuthService.getLMSConnectionStatus(TEST_USER_ID);

      expect(status.google_classroom.isExpired).toBe(false);
    });

    it('should return only google_classroom when only Google is connected', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            provider: 'google_classroom',
            provider_base_url: null,
            expires_at: new Date(Date.now() + 3600000),
          },
        ],
      });

      const status = await lmsOAuthService.getLMSConnectionStatus(TEST_USER_ID);

      expect(status.google_classroom).toBeDefined();
      expect(status.canvas_lms).toBeUndefined();
    });

    it('should return only canvas_lms when only Canvas is connected', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            provider: 'canvas_lms',
            provider_base_url: 'https://school.instructure.com',
            expires_at: new Date(Date.now() + 3600000),
          },
        ],
      });

      const status = await lmsOAuthService.getLMSConnectionStatus(TEST_USER_ID);

      expect(status.canvas_lms).toBeDefined();
      expect(status.google_classroom).toBeUndefined();
    });
  });
});
