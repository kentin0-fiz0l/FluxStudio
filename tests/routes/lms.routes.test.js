/**
 * LMS Routes Unit Tests
 * Tests LMS Integration API endpoints (Google Classroom, Canvas LMS)
 * @file tests/routes/lms.routes.test.js
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Test configuration
const JWT_SECRET = 'test-jwt-secret-key-for-tests';

// ─── Mock auth middleware (lib/data-helpers authenticateToken) ───
jest.mock('../../lib/data-helpers', () => ({
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Access token is required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
  },
}));

// ─── Mock lms-oauth-service ───
const mockGetLMSConnectionStatus = jest.fn();
const mockGetGoogleClassroomCourses = jest.fn();
const mockGetCanvasCourses = jest.fn();
const mockInitiateGoogleClassroomOAuth = jest.fn();
const mockInitiateCanvasOAuth = jest.fn();
const mockHandleGoogleClassroomCallback = jest.fn();
const mockHandleCanvasCallback = jest.fn();
const mockCreateGoogleClassroomAssignment = jest.fn();
const mockCreateCanvasAssignment = jest.fn();
const mockDeactivateToken = jest.fn();

jest.mock('../../services/lms-oauth-service', () => ({
  getLMSConnectionStatus: (...args) => mockGetLMSConnectionStatus(...args),
  getGoogleClassroomCourses: (...args) => mockGetGoogleClassroomCourses(...args),
  getCanvasCourses: (...args) => mockGetCanvasCourses(...args),
  initiateGoogleClassroomOAuth: (...args) => mockInitiateGoogleClassroomOAuth(...args),
  initiateCanvasOAuth: (...args) => mockInitiateCanvasOAuth(...args),
  handleGoogleClassroomCallback: (...args) => mockHandleGoogleClassroomCallback(...args),
  handleCanvasCallback: (...args) => mockHandleCanvasCallback(...args),
  createGoogleClassroomAssignment: (...args) => mockCreateGoogleClassroomAssignment(...args),
  createCanvasAssignment: (...args) => mockCreateCanvasAssignment(...args),
  deactivateToken: (...args) => mockDeactivateToken(...args),
}));

// ─── Mock logger ───
jest.mock('../../lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// ─── Mock database/config for callback route direct query usage ───
const mockQuery = jest.fn();
jest.mock('../../database/config', () => ({
  query: (...args) => mockQuery(...args),
}));

// Setup express app with LMS routes
function createTestApp() {
  const app = express();
  app.use(express.json());

  jest.isolateModules(() => {
    const lmsRouter = require('../../routes/lms');
    app.use('/api/lms', lmsRouter);
  });

  return app;
}

// Helper to generate a valid JWT token
function generateToken(payload = {}) {
  return jwt.sign(
    { id: 'user-1', email: 'test@example.com', type: 'access', ...payload },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('LMS Routes', () => {
  let app;
  let validToken;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.APP_URL = 'https://fluxstudio.art';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    validToken = generateToken();
    app = createTestApp();
  });

  // ─────────────────────────────────────────────
  // GET /api/lms/providers
  // ─────────────────────────────────────────────
  describe('GET /api/lms/providers', () => {
    it('should return both providers with connection status', async () => {
      mockGetLMSConnectionStatus.mockResolvedValue({
        google_classroom: { connected: true },
        canvas_lms: { connected: false, baseUrl: null },
      });

      const response = await request(app)
        .get('/api/lms/providers')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.providers).toHaveLength(2);
      expect(response.body.providers[0]).toMatchObject({
        id: 'google_classroom',
        name: 'Google Classroom',
        icon: 'google-classroom',
        connected: true,
      });
      expect(response.body.providers[1]).toMatchObject({
        id: 'canvas_lms',
        name: 'Canvas LMS',
        icon: 'canvas',
        connected: false,
        baseUrl: null,
      });
    });

    it('should return providers with no connections', async () => {
      mockGetLMSConnectionStatus.mockResolvedValue({});

      const response = await request(app)
        .get('/api/lms/providers')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.providers).toHaveLength(2);
      expect(response.body.providers[0].connected).toBe(false);
      expect(response.body.providers[1].connected).toBe(false);
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/lms/providers');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/lms/providers')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should handle DB migration error (42P01 - table does not exist)', async () => {
      const error = new Error('relation "oauth_tokens" does not exist');
      error.code = '42P01';
      mockGetLMSConnectionStatus.mockRejectedValue(error);

      const response = await request(app)
        .get('/api/lms/providers')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.providers).toHaveLength(2);
      expect(response.body.providers[0]).toMatchObject({
        id: 'google_classroom',
        name: 'Google Classroom',
        icon: 'google-classroom',
        connected: false,
      });
      expect(response.body.providers[1]).toMatchObject({
        id: 'canvas_lms',
        name: 'Canvas LMS',
        icon: 'canvas',
        connected: false,
      });
    });

    it('should handle "does not exist" message without error code', async () => {
      const error = new Error('relation "oauth_tokens" does not exist');
      mockGetLMSConnectionStatus.mockRejectedValue(error);

      const response = await request(app)
        .get('/api/lms/providers')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.providers).toHaveLength(2);
      expect(response.body.providers[0].connected).toBe(false);
      expect(response.body.providers[1].connected).toBe(false);
    });

    it('should return 500 for generic errors', async () => {
      mockGetLMSConnectionStatus.mockRejectedValue(new Error('Connection refused'));

      const response = await request(app)
        .get('/api/lms/providers')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to list providers');
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/lms/:provider/courses
  // ─────────────────────────────────────────────
  describe('GET /api/lms/:provider/courses', () => {
    it('should return courses for google_classroom', async () => {
      const mockCourses = [
        { id: 'course-1', name: 'Intro to Design', section: 'Section A' },
        { id: 'course-2', name: 'Advanced Typography', section: 'Section B' },
      ];
      mockGetGoogleClassroomCourses.mockResolvedValue(mockCourses);

      const response = await request(app)
        .get('/api/lms/google_classroom/courses')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.courses).toEqual(mockCourses);
      expect(mockGetGoogleClassroomCourses).toHaveBeenCalledWith('user-1');
    });

    it('should return courses for canvas_lms', async () => {
      const mockCourses = [
        { id: 'canvas-101', name: 'Art History 101' },
      ];
      mockGetCanvasCourses.mockResolvedValue(mockCourses);

      const response = await request(app)
        .get('/api/lms/canvas_lms/courses')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.courses).toEqual(mockCourses);
      expect(mockGetCanvasCourses).toHaveBeenCalledWith('user-1');
    });

    it('should return 400 for invalid provider', async () => {
      const response = await request(app)
        .get('/api/lms/invalid_provider/courses')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid LMS provider');
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/lms/google_classroom/courses');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/lms/google_classroom/courses')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should return 401 when provider is not connected', async () => {
      mockGetGoogleClassroomCourses.mockRejectedValue(
        new Error('Google Classroom is not connected')
      );

      const response = await request(app)
        .get('/api/lms/google_classroom/courses')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not connected');
    });

    it('should return 500 for generic service errors', async () => {
      mockGetCanvasCourses.mockRejectedValue(new Error('API timeout'));

      const response = await request(app)
        .get('/api/lms/canvas_lms/courses')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('API timeout');
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/lms/:provider/callback
  // ─────────────────────────────────────────────
  describe('GET /api/lms/:provider/callback', () => {
    it('should redirect on success for google_classroom', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ user_id: 'user-1' }],
      });
      mockHandleGoogleClassroomCallback.mockResolvedValue();

      const response = await request(app)
        .get('/api/lms/google_classroom/callback')
        .query({ code: 'auth-code-123', state: 'state-token-abc' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        'https://fluxstudio.art/auth/callback/google_classroom?success=true'
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT user_id FROM oauth_state_tokens'),
        ['state-token-abc', 'google_classroom']
      );
      expect(mockHandleGoogleClassroomCallback).toHaveBeenCalledWith(
        'auth-code-123', 'state-token-abc', 'user-1'
      );
    });

    it('should redirect on success for canvas_lms', async () => {
      const compositeState = 'state-token-xyz:aHR0cHM6Ly9jYW52YXMuZXhhbXBsZS5jb20=';
      mockQuery.mockResolvedValue({
        rows: [{ user_id: 'user-2' }],
      });
      mockHandleCanvasCallback.mockResolvedValue();

      const response = await request(app)
        .get('/api/lms/canvas_lms/callback')
        .query({ code: 'canvas-code-456', state: compositeState });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        'https://fluxstudio.art/auth/callback/canvas_lms?success=true'
      );
      // Canvas extracts the stateToken before the colon for DB lookup
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT user_id FROM oauth_state_tokens'),
        ['state-token-xyz', 'canvas_lms']
      );
      expect(mockHandleCanvasCallback).toHaveBeenCalledWith(
        'canvas-code-456', compositeState, 'user-2'
      );
    });

    it('should return 400 for invalid provider', async () => {
      const response = await request(app)
        .get('/api/lms/invalid_provider/callback')
        .query({ code: 'code', state: 'state' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid LMS provider');
    });

    it('should redirect with error when code is missing', async () => {
      const response = await request(app)
        .get('/api/lms/google_classroom/callback')
        .query({ state: 'state-token-only' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        'https://fluxstudio.art/auth/callback/google_classroom?error=missing_params'
      );
    });

    it('should redirect with error when state is missing', async () => {
      const response = await request(app)
        .get('/api/lms/canvas_lms/callback')
        .query({ code: 'code-only' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        'https://fluxstudio.art/auth/callback/canvas_lms?error=missing_params'
      );
    });

    it('should redirect with error when both code and state are missing', async () => {
      const response = await request(app)
        .get('/api/lms/google_classroom/callback');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        'https://fluxstudio.art/auth/callback/google_classroom?error=missing_params'
      );
    });

    it('should redirect with error for invalid state token (no matching rows)', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/lms/google_classroom/callback')
        .query({ code: 'auth-code', state: 'invalid-state' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain(
        'error=Invalid%20or%20expired%20OAuth%20state'
      );
    });

    it('should redirect with error for canvas invalid state token', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/lms/canvas_lms/callback')
        .query({ code: 'canvas-code', state: 'bad-state:base64data' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain(
        'error=Invalid%20or%20expired%20OAuth%20state'
      );
    });

    it('should redirect with error when callback handler throws', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ user_id: 'user-1' }],
      });
      mockHandleGoogleClassroomCallback.mockRejectedValue(
        new Error('Token exchange failed')
      );

      const response = await request(app)
        .get('/api/lms/google_classroom/callback')
        .query({ code: 'auth-code', state: 'valid-state' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain(
        'error=Token%20exchange%20failed'
      );
    });

    it('should not require authentication', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ user_id: 'user-1' }],
      });
      mockHandleGoogleClassroomCallback.mockResolvedValue();

      // No Authorization header - should still work
      const response = await request(app)
        .get('/api/lms/google_classroom/callback')
        .query({ code: 'code', state: 'state' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('success=true');
    });
  });

  // ─────────────────────────────────────────────
  // POST /api/lms/:provider/connect
  // ─────────────────────────────────────────────
  describe('POST /api/lms/:provider/connect', () => {
    it('should return auth URL for google_classroom', async () => {
      const expectedUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=...';
      mockInitiateGoogleClassroomOAuth.mockResolvedValue(expectedUrl);

      const response = await request(app)
        .post('/api/lms/google_classroom/connect')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.authUrl).toBe(expectedUrl);
      expect(mockInitiateGoogleClassroomOAuth).toHaveBeenCalledWith('user-1');
    });

    it('should return auth URL for canvas_lms with institutionUrl', async () => {
      const expectedUrl = 'https://canvas.example.com/login/oauth2/auth?client_id=...';
      mockInitiateCanvasOAuth.mockResolvedValue(expectedUrl);

      const response = await request(app)
        .post('/api/lms/canvas_lms/connect')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ institutionUrl: 'https://canvas.example.com' });

      expect(response.status).toBe(200);
      expect(response.body.authUrl).toBe(expectedUrl);
      expect(mockInitiateCanvasOAuth).toHaveBeenCalledWith('user-1', 'https://canvas.example.com');
    });

    it('should return 400 for invalid provider', async () => {
      const response = await request(app)
        .post('/api/lms/invalid_provider/connect')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid LMS provider');
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/api/lms/google_classroom/connect')
        .send({});

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .post('/api/lms/canvas_lms/connect')
        .set('Authorization', 'Bearer invalid-token')
        .send({ institutionUrl: 'https://canvas.example.com' });

      expect(response.status).toBe(401);
    });

    it('should return 400 when canvas_lms is missing institutionUrl', async () => {
      const response = await request(app)
        .post('/api/lms/canvas_lms/connect')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('institutionUrl is required');
    });

    it('should return 500 when OAuth initiation fails', async () => {
      mockInitiateGoogleClassroomOAuth.mockRejectedValue(
        new Error('Missing client credentials')
      );

      const response = await request(app)
        .post('/api/lms/google_classroom/connect')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing client credentials');
    });
  });

  // ─────────────────────────────────────────────
  // POST /api/lms/:provider/share
  // ─────────────────────────────────────────────
  describe('POST /api/lms/:provider/share', () => {
    const validSharePayload = {
      courseId: 'course-123',
      title: 'Design Assignment 1',
      formationId: 'formation-456',
    };

    it('should create assignment for google_classroom', async () => {
      mockCreateGoogleClassroomAssignment.mockResolvedValue({
        url: 'https://classroom.google.com/c/course-123/a/assgn-1',
        assignmentId: 'assgn-1',
      });

      const response = await request(app)
        .post('/api/lms/google_classroom/share')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validSharePayload);

      expect(response.status).toBe(200);
      expect(response.body.url).toBe('https://classroom.google.com/c/course-123/a/assgn-1');
      expect(response.body.assignmentId).toBe('assgn-1');
      expect(mockCreateGoogleClassroomAssignment).toHaveBeenCalledWith(
        'user-1',
        'course-123',
        'Design Assignment 1',
        'https://fluxstudio.art/embed/formation/formation-456'
      );
    });

    it('should create assignment for canvas_lms', async () => {
      mockCreateCanvasAssignment.mockResolvedValue({
        url: 'https://canvas.example.com/courses/101/assignments/50',
        assignmentId: '50',
      });

      const response = await request(app)
        .post('/api/lms/canvas_lms/share')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validSharePayload);

      expect(response.status).toBe(200);
      expect(response.body.url).toBe('https://canvas.example.com/courses/101/assignments/50');
      expect(response.body.assignmentId).toBe('50');
      expect(mockCreateCanvasAssignment).toHaveBeenCalledWith(
        'user-1',
        'course-123',
        'Design Assignment 1',
        'https://fluxstudio.art/embed/formation/formation-456'
      );
    });

    it('should use custom embedUrl when provided', async () => {
      mockCreateGoogleClassroomAssignment.mockResolvedValue({
        url: 'https://classroom.google.com/assignment',
        assignmentId: 'assgn-2',
      });

      const response = await request(app)
        .post('/api/lms/google_classroom/share')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          ...validSharePayload,
          embedUrl: 'https://custom.embed.url/formation/456',
        });

      expect(response.status).toBe(200);
      expect(mockCreateGoogleClassroomAssignment).toHaveBeenCalledWith(
        'user-1',
        'course-123',
        'Design Assignment 1',
        'https://custom.embed.url/formation/456'
      );
    });

    it('should return 400 when courseId is missing', async () => {
      const response = await request(app)
        .post('/api/lms/google_classroom/share')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: 'Assignment', formationId: 'f-1' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('courseId, title, and formationId are required');
    });

    it('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/api/lms/google_classroom/share')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ courseId: 'c-1', formationId: 'f-1' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('courseId, title, and formationId are required');
    });

    it('should return 400 when formationId is missing', async () => {
      const response = await request(app)
        .post('/api/lms/google_classroom/share')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ courseId: 'c-1', title: 'Assignment' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('courseId, title, and formationId are required');
    });

    it('should return 400 for invalid provider', async () => {
      const response = await request(app)
        .post('/api/lms/invalid_provider/share')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validSharePayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid LMS provider');
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/api/lms/google_classroom/share')
        .send(validSharePayload);

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .post('/api/lms/canvas_lms/share')
        .set('Authorization', 'Bearer invalid-token')
        .send(validSharePayload);

      expect(response.status).toBe(401);
    });

    it('should return 401 when provider is not connected', async () => {
      mockCreateGoogleClassroomAssignment.mockRejectedValue(
        new Error('Google Classroom is not connected')
      );

      const response = await request(app)
        .post('/api/lms/google_classroom/share')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validSharePayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not connected');
    });

    it('should return 500 for generic share errors', async () => {
      mockCreateCanvasAssignment.mockRejectedValue(
        new Error('Canvas API rate limit exceeded')
      );

      const response = await request(app)
        .post('/api/lms/canvas_lms/share')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validSharePayload);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Canvas API rate limit exceeded');
    });
  });

  // ─────────────────────────────────────────────
  // DELETE /api/lms/:provider/disconnect
  // ─────────────────────────────────────────────
  describe('DELETE /api/lms/:provider/disconnect', () => {
    it('should deactivate token for google_classroom', async () => {
      mockDeactivateToken.mockResolvedValue();

      const response = await request(app)
        .delete('/api/lms/google_classroom/disconnect')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('google_classroom disconnected');
      expect(mockDeactivateToken).toHaveBeenCalledWith('user-1', 'google_classroom');
    });

    it('should deactivate token for canvas_lms', async () => {
      mockDeactivateToken.mockResolvedValue();

      const response = await request(app)
        .delete('/api/lms/canvas_lms/disconnect')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('canvas_lms disconnected');
      expect(mockDeactivateToken).toHaveBeenCalledWith('user-1', 'canvas_lms');
    });

    it('should return 400 for invalid provider', async () => {
      const response = await request(app)
        .delete('/api/lms/invalid_provider/disconnect')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid LMS provider');
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .delete('/api/lms/google_classroom/disconnect');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .delete('/api/lms/canvas_lms/disconnect')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should return 500 when deactivation fails', async () => {
      mockDeactivateToken.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/lms/google_classroom/disconnect')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });
  });
});
