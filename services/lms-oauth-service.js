/**
 * LMS OAuth Service - FluxStudio
 *
 * Handles OAuth 2.0 flows and API interactions for:
 * - Google Classroom (using google-auth-library)
 * - Canvas LMS (institution-specific OAuth)
 *
 * Token storage follows the existing oauth_tokens table pattern
 * established in lib/oauth-manager.js.
 */

const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const crypto = require('crypto');
const { query } = require('../database/config');
const { createLogger } = require('../lib/logger');
const log = createLogger('LMS');

// ========================================
// Configuration
// ========================================

const GOOGLE_CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students',
];

const GOOGLE_CLASSROOM_REDIRECT_URI =
  process.env.GOOGLE_CLASSROOM_REDIRECT_URI ||
  'https://fluxstudio.art/auth/callback/google_classroom';

const CANVAS_REDIRECT_URI =
  process.env.CANVAS_LMS_REDIRECT_URI ||
  'https://fluxstudio.art/auth/callback/canvas_lms';

// ========================================
// Helpers
// ========================================

function getGoogleOAuth2Client() {
  return new OAuth2Client(
    process.env.GOOGLE_CLASSROOM_CLIENT_ID,
    process.env.GOOGLE_CLASSROOM_CLIENT_SECRET,
    GOOGLE_CLASSROOM_REDIRECT_URI,
  );
}

function generateStateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store an OAuth state token for CSRF protection.
 * Re-uses the existing oauth_state_tokens table.
 */
async function storeStateToken(userId, provider, stateToken, extra = {}) {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  await query(
    `INSERT INTO oauth_state_tokens
       (user_id, provider, state_token, code_challenge, code_verifier, redirect_uri, scope)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      provider,
      stateToken,
      codeChallenge,
      codeVerifier,
      extra.redirectUri || '',
      extra.scope || [],
    ],
  );

  return { stateToken, codeVerifier };
}

/**
 * Validate and consume a state token. Returns the stored row or throws.
 */
async function consumeStateToken(stateToken, provider) {
  const result = await query(
    `UPDATE oauth_state_tokens
     SET used = true
     WHERE state_token = $1 AND provider = $2 AND used = false AND expires_at > NOW()
     RETURNING *`,
    [stateToken, provider],
  );
  if (result.rows.length === 0) {
    throw new Error('Invalid or expired OAuth state token');
  }
  return result.rows[0];
}

/**
 * Upsert an OAuth token into the oauth_tokens table.
 */
async function upsertToken(userId, provider, tokenData) {
  const {
    accessToken,
    refreshToken,
    expiresAt,
    scope,
    providerBaseUrl,
  } = tokenData;

  const existing = await query(
    `SELECT id FROM oauth_tokens WHERE user_id = $1 AND provider = $2`,
    [userId, provider],
  );

  if (existing.rows.length > 0) {
    await query(
      `UPDATE oauth_tokens
       SET access_token = $1, refresh_token = $2, expires_at = $3,
           scope = $4, provider_base_url = $5, is_active = true, updated_at = NOW()
       WHERE user_id = $6 AND provider = $7`,
      [accessToken, refreshToken || null, expiresAt, scope || [], providerBaseUrl || null, userId, provider],
    );
  } else {
    await query(
      `INSERT INTO oauth_tokens
         (user_id, provider, access_token, refresh_token, expires_at, scope, provider_base_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, provider, accessToken, refreshToken || null, expiresAt, scope || [], providerBaseUrl || null],
    );
  }
}

/**
 * Get the active OAuth token row for a user + provider.
 */
async function getTokenRow(userId, provider) {
  const result = await query(
    `SELECT * FROM oauth_tokens WHERE user_id = $1 AND provider = $2 AND is_active = true`,
    [userId, provider],
  );
  return result.rows[0] || null;
}

/**
 * Remove (deactivate) an OAuth token.
 */
async function deactivateToken(userId, provider) {
  await query(
    `UPDATE oauth_tokens SET is_active = false, updated_at = NOW()
     WHERE user_id = $1 AND provider = $2`,
    [userId, provider],
  );
}

// ========================================
// Google Classroom
// ========================================

/**
 * Build the Google Classroom OAuth authorization URL.
 */
async function initiateGoogleClassroomOAuth(userId) {
  const client = getGoogleOAuth2Client();
  const stateToken = generateStateToken();

  await storeStateToken(userId, 'google_classroom', stateToken, {
    redirectUri: GOOGLE_CLASSROOM_REDIRECT_URI,
    scope: GOOGLE_CLASSROOM_SCOPES,
  });

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_CLASSROOM_SCOPES,
    state: stateToken,
  });

  log.info('Google Classroom OAuth URL generated', { userId });
  return authUrl;
}

/**
 * Exchange the authorization code for tokens and store them.
 */
async function handleGoogleClassroomCallback(code, state, userId) {
  await consumeStateToken(state, 'google_classroom');

  const client = getGoogleOAuth2Client();
  const { tokens } = await client.getToken(code);

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  await upsertToken(userId, 'google_classroom', {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    scope: GOOGLE_CLASSROOM_SCOPES,
  });

  log.info('Google Classroom tokens stored', { userId });
  return { success: true };
}

/**
 * Get a valid access token for Google Classroom, refreshing if needed.
 */
async function getGoogleClassroomAccessToken(userId) {
  const row = await getTokenRow(userId, 'google_classroom');
  if (!row) throw new Error('Google Classroom not connected');

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    if (!row.refresh_token) {
      throw new Error('Google Classroom token expired and no refresh token available');
    }
    const client = getGoogleOAuth2Client();
    client.setCredentials({ refresh_token: row.refresh_token });
    const { credentials } = await client.refreshAccessToken();

    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    await upsertToken(userId, 'google_classroom', {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || row.refresh_token,
      expiresAt,
      scope: GOOGLE_CLASSROOM_SCOPES,
    });

    log.info('Google Classroom token refreshed', { userId });
    return credentials.access_token;
  }

  await query(`UPDATE oauth_tokens SET last_used_at = NOW() WHERE id = $1`, [row.id]);
  return row.access_token;
}

/**
 * List courses from Google Classroom.
 */
async function getGoogleClassroomCourses(userId) {
  const accessToken = await getGoogleClassroomAccessToken(userId);

  const response = await axios.get(
    'https://classroom.googleapis.com/v1/courses',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { teacherId: 'me', courseStates: 'ACTIVE' },
    },
  );

  const courses = (response.data.courses || []).map((c) => ({
    id: c.id,
    name: c.name,
    section: c.section || null,
    enrollmentCode: c.enrollmentCode || null,
  }));

  log.info('Google Classroom courses fetched', { userId, count: courses.length });
  return courses;
}

/**
 * Create an assignment in Google Classroom with a link to the formation.
 */
async function createGoogleClassroomAssignment(userId, courseId, title, embedUrl) {
  const accessToken = await getGoogleClassroomAccessToken(userId);

  const response = await axios.post(
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
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  const assignmentId = response.data.id;
  const url = response.data.alternateLink ||
    `https://classroom.google.com/c/${courseId}/a/${assignmentId}`;

  log.info('Google Classroom assignment created', { userId, courseId, assignmentId });
  return { assignmentId, url };
}

// ========================================
// Canvas LMS
// ========================================

/**
 * Build the Canvas OAuth authorization URL.
 * Canvas requires institution-specific base URLs.
 */
async function initiateCanvasOAuth(userId, institutionUrl) {
  if (!institutionUrl) {
    throw new Error('Canvas institution URL is required');
  }
  // Normalize URL: strip trailing slash
  const baseUrl = institutionUrl.replace(/\/+$/, '');
  const stateToken = generateStateToken();

  await storeStateToken(userId, 'canvas_lms', stateToken, {
    redirectUri: CANVAS_REDIRECT_URI,
    scope: [],
  });

  // Encode institution URL into the state so we can recover it in the callback
  const compositeState = `${stateToken}:${Buffer.from(baseUrl).toString('base64url')}`;

  const params = new URLSearchParams({
    client_id: process.env.CANVAS_LMS_DEVELOPER_KEY_ID,
    response_type: 'code',
    redirect_uri: CANVAS_REDIRECT_URI,
    state: compositeState,
  });

  const authUrl = `${baseUrl}/login/oauth2/auth?${params.toString()}`;
  log.info('Canvas OAuth URL generated', { userId, baseUrl });
  return authUrl;
}

/**
 * Exchange the Canvas authorization code for tokens and store them.
 */
async function handleCanvasCallback(code, compositeState, userId) {
  // Parse composite state: stateToken:base64url(institutionUrl)
  const colonIdx = compositeState.indexOf(':');
  if (colonIdx === -1) throw new Error('Invalid Canvas OAuth state');

  const stateToken = compositeState.substring(0, colonIdx);
  const institutionUrl = Buffer.from(compositeState.substring(colonIdx + 1), 'base64url').toString();

  await consumeStateToken(stateToken, 'canvas_lms');

  const response = await axios.post(`${institutionUrl}/login/oauth2/token`, {
    grant_type: 'authorization_code',
    client_id: process.env.CANVAS_LMS_DEVELOPER_KEY_ID,
    client_secret: process.env.CANVAS_LMS_DEVELOPER_KEY_SECRET,
    redirect_uri: CANVAS_REDIRECT_URI,
    code,
  });

  const { access_token, refresh_token, expires_in } = response.data;
  const expiresAt = expires_in
    ? new Date(Date.now() + expires_in * 1000)
    : new Date(Date.now() + 3600 * 1000);

  await upsertToken(userId, 'canvas_lms', {
    accessToken: access_token,
    refreshToken: refresh_token || null,
    expiresAt,
    providerBaseUrl: institutionUrl,
  });

  log.info('Canvas LMS tokens stored', { userId, institutionUrl });
  return { success: true };
}

/**
 * Get a valid access token for Canvas, refreshing if needed.
 */
async function getCanvasAccessToken(userId) {
  const row = await getTokenRow(userId, 'canvas_lms');
  if (!row) throw new Error('Canvas LMS not connected');

  const baseUrl = row.provider_base_url;

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    if (!row.refresh_token) {
      throw new Error('Canvas LMS token expired and no refresh token available');
    }
    const response = await axios.post(`${baseUrl}/login/oauth2/token`, {
      grant_type: 'refresh_token',
      client_id: process.env.CANVAS_LMS_DEVELOPER_KEY_ID,
      client_secret: process.env.CANVAS_LMS_DEVELOPER_KEY_SECRET,
      refresh_token: row.refresh_token,
    });

    const { access_token, expires_in } = response.data;
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : new Date(Date.now() + 3600 * 1000);

    await upsertToken(userId, 'canvas_lms', {
      accessToken: access_token,
      refreshToken: response.data.refresh_token || row.refresh_token,
      expiresAt,
      providerBaseUrl: baseUrl,
    });

    log.info('Canvas LMS token refreshed', { userId });
    return { accessToken: access_token, baseUrl };
  }

  await query(`UPDATE oauth_tokens SET last_used_at = NOW() WHERE id = $1`, [row.id]);
  return { accessToken: row.access_token, baseUrl };
}

/**
 * List courses from Canvas LMS (teacher enrollments only).
 */
async function getCanvasCourses(userId) {
  const { accessToken, baseUrl } = await getCanvasAccessToken(userId);

  const response = await axios.get(`${baseUrl}/api/v1/courses`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { enrollment_type: 'teacher', per_page: 50 },
  });

  const courses = (response.data || []).map((c) => ({
    id: String(c.id),
    name: c.name,
    section: c.course_code || null,
  }));

  log.info('Canvas courses fetched', { userId, count: courses.length });
  return courses;
}

/**
 * Create an assignment in Canvas LMS with a link to the formation.
 */
async function createCanvasAssignment(userId, courseId, title, embedUrl) {
  const { accessToken, baseUrl } = await getCanvasAccessToken(userId);

  const response = await axios.post(
    `${baseUrl}/api/v1/courses/${courseId}/assignments`,
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
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  const assignmentId = String(response.data.id);
  const url = response.data.html_url ||
    `${baseUrl}/courses/${courseId}/assignments/${assignmentId}`;

  log.info('Canvas assignment created', { userId, courseId, assignmentId });
  return { assignmentId, url };
}

// ========================================
// Connection Status
// ========================================

/**
 * Check which LMS providers a user has connected.
 */
async function getLMSConnectionStatus(userId) {
  const result = await query(
    `SELECT provider, provider_base_url, expires_at
     FROM oauth_tokens
     WHERE user_id = $1 AND provider IN ('google_classroom', 'canvas_lms') AND is_active = true`,
    [userId],
  );

  const status = {};
  for (const row of result.rows) {
    status[row.provider] = {
      connected: true,
      baseUrl: row.provider_base_url || null,
      isExpired: row.expires_at ? new Date(row.expires_at) < new Date() : false,
    };
  }
  return status;
}

module.exports = {
  // Google Classroom
  initiateGoogleClassroomOAuth,
  handleGoogleClassroomCallback,
  getGoogleClassroomCourses,
  createGoogleClassroomAssignment,
  // Canvas LMS
  initiateCanvasOAuth,
  handleCanvasCallback,
  getCanvasCourses,
  createCanvasAssignment,
  // Shared
  getLMSConnectionStatus,
  deactivateToken,
};
