/**
 * Authentication Routes
 * Extracted from server-auth.js for unified backend consolidation
 *
 * Routes:
 * - POST /api/auth/signup
 * - POST /api/auth/login
 * - GET  /api/auth/me
 * - POST /api/auth/logout
 * - POST /api/auth/google
 * - POST /api/auth/apple
 * - GET  /api/csrf-token
 * - POST /api/auth/verify-email (Phase 1 - User Adoption)
 * - POST /api/auth/resend-verification (Phase 1 - User Adoption)
 * - POST /api/auth/forgot-password (Phase 1 - User Adoption)
 * - POST /api/auth/reset-password (Phase 1 - User Adoption)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

// Import configuration
const { createLogger } = require('../lib/logger');
const log = createLogger('Auth');
const { config } = require('../config/environment');
const { authRateLimit, validateInput } = require('../middleware/security');
const { getCsrfToken } = require('../middleware/csrf');
const { ipRateLimiters } = require('../lib/security/ipRateLimit');
const { zodValidate } = require('../middleware/zodValidate');
const { asyncHandler } = require('../middleware/errorHandler');
const { signupSchema, loginSchema } = require('../lib/schemas/auth');

// Import helpers
const { generateAuthResponse } = require('../lib/auth/authHelpers');
const securityLogger = require('../lib/auth/securityLogger');
const { captureAuthError } = require('../lib/monitoring/sentry');
const { ingestEvent } = require('../lib/analytics/funnelTracker');
const anomalyDetector = require('../lib/security/anomalyDetector');
const { createCircuitBreaker } = require('../lib/circuitBreaker');

const oauthBreaker = createCircuitBreaker({
  name: 'oauth-provider',
  failureThreshold: 5,
  recoveryTimeout: 30000,
});

// Import email service for verification and password reset
const { emailService } = require('../lib/email/emailService');

// Import database query function for email verification (when USE_DATABASE=true)
let dbQuery = null;
try {
  const { query } = require('../database/config');
  dbQuery = query;
} catch (e) {
  log.info('Database query not available for email verification');
}

// Database/file hybrid support (imported from parent scope)
let authHelper = null;
const USE_DATABASE = process.env.USE_DATABASE === 'true';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const JWT_SECRET = config.JWT_SECRET;

// Cryptographically secure UUID v4 generator
function uuidv4() {
  return crypto.randomUUID();
}

// Simple auth response without database (fallback when USE_DATABASE=false)
function simpleAuthResponse(user) {
  console.warn('[DEPRECATION] simpleAuthResponse: USE_DATABASE=false auth path is deprecated');
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      userType: user.userType,
      type: 'access'  // Required by tokenService.verifyAccessToken()
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const { password, googleId, ...userWithoutPassword } = user;
  return {
    token,
    accessToken: token, // For compatibility
    user: userWithoutPassword
  };
}

// Initialize auth helper (called by server-unified.js)
router.setAuthHelper = (helper) => {
  authHelper = helper;
};

// Lazy authentication middleware wrapper (evaluates authHelper at runtime)
const requireAuth = (req, res, next) => {
  if (!authHelper || !authHelper.authenticateToken) {
    return res.status(500).json({ success: false, error: 'Auth system not initialized', code: 'AUTH_NOT_INITIALIZED' });
  }
  return authHelper.authenticateToken(req, res, next);
};

// CSRF token endpoint - must be called before making state-changing requests
router.get('/csrf-token', getCsrfToken);

// Signup endpoint
router.post('/signup',
  ipRateLimiters.signup(),
  authRateLimit,
  validateInput.email,
  validateInput.password,
  validateInput.sanitizeInput,
  zodValidate(signupSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, userType = 'client' } = req.body;

      // Phase 5: Track signup_started at the top before validation
      ingestEvent(null, 'signup_started', {
        userType,
        hasReferral: !!req.body.referralCode,
      }, { ipAddress: req.ip, userAgent: req.get('user-agent') }).catch(() => {});

      // Check if IP is blocked (Sprint 13 Day 2 - Anomaly Detection)
      const isBlocked = await anomalyDetector.isIpBlocked(req.ip);
      if (isBlocked) {
        return res.status(429).json({
          success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      // Check for suspicious user agent (Sprint 13 Day 2 - Bot Detection)
      const isSuspicious = anomalyDetector.checkSuspiciousUserAgent(req.get('user-agent'));
      if (isSuspicious) {
        await securityLogger.logEvent(
          'suspicious_user_agent_detected',
          securityLogger.SEVERITY.WARNING,
          {
            email,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            endpoint: '/api/auth/signup'
          }
        );
      }

      // Check for rapid signup requests (possible bot)
      const isRapidRequest = await anomalyDetector.checkRequestRate(req.ip, '/api/auth/signup');
      if (isRapidRequest) {
        await anomalyDetector.blockIpAddress(req.ip, 1800, 'rapid_signup_requests');
        return res.status(429).json({
          success: false, error: 'Too many signup attempts. Please try again later.', code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      // Open registration check (Phase 4) — skip beta gate when open registration is enabled
      const openRegistration = req.isFeatureEnabled
        ? await req.isFeatureEnabled('open_registration')
        : true; // Default to open when feature flags unavailable

      // Beta invite code gate (Sprint 56) — only enforce when open registration is disabled
      const betaGateEnabled = !openRegistration && req.isFeatureEnabled
        ? await req.isFeatureEnabled('beta_invite_required')
        : false;
      if (betaGateEnabled) {
        const { inviteCode } = req.body;
        if (!inviteCode) {
          return res.status(403).json({ success: false, error: 'An invite code is required to sign up during the beta period.', code: 'AUTH_INVITE_REQUIRED' });
        }
        const codeResult = dbQuery
          ? await dbQuery(
              `SELECT id, code, max_uses, uses_count, expires_at
               FROM beta_invite_codes
               WHERE UPPER(code) = UPPER($1)`,
              [inviteCode]
            )
          : { rows: [] };
        const invite = codeResult.rows[0];
        if (!invite) {
          return res.status(403).json({ success: false, error: 'Invalid invite code.', code: 'AUTH_INVALID_INVITE' });
        }
        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
          return res.status(403).json({ success: false, error: 'This invite code has expired.', code: 'AUTH_INVITE_EXPIRED' });
        }
        if (invite.uses_count >= invite.max_uses) {
          return res.status(403).json({ success: false, error: 'This invite code has reached its maximum uses.', code: 'AUTH_INVITE_EXHAUSTED' });
        }
        // Store invite id for post-signup increment
        req._betaInviteId = invite.id;
      }

      // Validation
      if (!email || !password || !name) {
        return res.status(400).json({ success: false, error: 'All fields are required', code: 'AUTH_MISSING_FIELDS' });
      }

      // Validate userType
      const validUserTypes = ['client', 'designer'];
      if (!validUserTypes.includes(userType)) {
        return res.status(400).json({ success: false, error: 'Invalid user type', code: 'AUTH_INVALID_USER_TYPE' });
      }

      if (password.length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters', code: 'AUTH_WEAK_PASSWORD' });
      }

      // Check if user exists
      const existingUser = await authHelper.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email already registered', code: 'AUTH_EMAIL_EXISTS' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate email verification token
      const verificationToken = emailService.generateToken();
      const verificationExpires = emailService.generateExpiry(24); // 24 hours

      // Create user using the proper createUser function (fixes database persistence bug)
      let newUser;
      if (authHelper.createUser) {
        // Database mode: use createUser which properly persists to PostgreSQL
        newUser = await authHelper.createUser({
          email,
          name,
          userType,
          password: hashedPassword,
          emailVerified: false,
          verificationToken,
          verificationExpires: verificationExpires.toISOString()
        });
      } else {
        // File mode fallback: use the old pattern
        const users = await authHelper.getUsers();
        newUser = {
          id: uuidv4(),
          email,
          name,
          userType,
          password: hashedPassword,
          emailVerified: false,
          verificationToken,
          verificationExpires: verificationExpires.toISOString(),
          createdAt: new Date().toISOString()
        };
        users.push(newUser);
        await authHelper.saveUsers(users);
      }

      // Update verification columns if needed (for edge cases)
      if (USE_DATABASE && dbQuery && newUser.id) {
        try {
          await dbQuery(`
            UPDATE users
            SET email_verified = false, verification_token = $1, verification_expires = $2
            WHERE id = $3
          `, [verificationToken, verificationExpires, newUser.id]);
        } catch (dbError) {
          log.warn('Could not update verification columns in database', dbError.message);
        }
      }

      // Send verification email (non-blocking - don't fail signup if email fails)
      emailService.sendVerificationEmail(email, verificationToken, name)
        .then(sent => {
          if (sent) {
            log.info('Verification email sent to:', email);
          } else {
            log.warn('Failed to send verification email to:', email);
          }
        })
        .catch(err => {
          log.error('Error sending verification email', err);
        });

      // Generate token pair with device tracking (Week 2 Security Sprint)
      const authResponse = await generateAuthResponse(newUser, req);

      // Log successful signup
      await securityLogger.logSignupSuccess(newUser.id, email, req, {
        userType,
        name
      });

      // Sprint 44: Track signup funnel event
      ingestEvent(newUser.id, 'signup_completed', {
        userType,
        referralCode: req.body.referralCode || null,
      }, { ipAddress: req.ip, userAgent: req.get('user-agent') }).catch(() => {});

      // Sprint 44: Track referral if code provided
      if (req.body.referralCode) {
        (async () => {
          try {
            const refResult = await query(
              `SELECT id, user_id FROM referral_codes WHERE code = $1 AND is_active = TRUE`,
              [req.body.referralCode.toUpperCase()]
            );
            if (refResult.rows.length > 0) {
              const { id: codeId, user_id: referrerId } = refResult.rows[0];
              await query(
                `INSERT INTO referral_signups (referral_code_id, referrer_user_id, referred_user_id)
                 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                [codeId, referrerId, newUser.id]
              );
            }
          } catch (_) { /* best-effort */ }
        })();
      }

      // Sprint 56: Increment beta invite code usage
      if (req._betaInviteId && dbQuery) {
        dbQuery(
          `UPDATE beta_invite_codes SET uses_count = uses_count + 1 WHERE id = $1`,
          [req._betaInviteId]
        ).catch(() => {});
      }

      // Return auth response with access + refresh tokens
      // Include emailVerified status so frontend knows to show verification reminder
      res.json({
        success: true,
        ...authResponse,
        emailVerified: false,
        message: 'Account created! Please check your email to verify your account.'
      });
  }));

// Login endpoint
router.post('/login',
  ipRateLimiters.login(),
  authRateLimit,
  validateInput.email,
  validateInput.sanitizeInput,
  zodValidate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

      // Check if IP is blocked (Sprint 13 Day 2 - Anomaly Detection)
      const isBlocked = await anomalyDetector.isIpBlocked(req.ip);
      if (isBlocked) {
        return res.status(429).json({
          success: false, error: 'Too many failed attempts. Please try again later.', code: 'RATE_LIMIT_EXCEEDED'
        });
      }

      // Check for suspicious user agent (Sprint 13 Day 2 - Bot Detection)
      const isSuspicious = anomalyDetector.checkSuspiciousUserAgent(req.get('user-agent'));
      if (isSuspicious) {
        await securityLogger.logEvent(
          'suspicious_user_agent_detected',
          securityLogger.SEVERITY.WARNING,
          {
            email,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            endpoint: '/api/auth/login'
          }
        );
      }

      // Find user
      const user = await authHelper.getUserByEmail(email);

      if (!user) {
        // Check for brute force before logging failure
        const isBruteForce = await anomalyDetector.checkFailedLoginRate(email, req.ip);
        if (isBruteForce) {
          // Block IP temporarily
          await anomalyDetector.blockIpAddress(req.ip, 3600, 'brute_force_login');
          return res.status(429).json({
            success: false, error: 'Too many failed attempts. Your IP has been temporarily blocked.', code: 'AUTH_IP_BLOCKED'
          });
        }

        // Log failed login - user not found
        await securityLogger.logLoginFailure(email, 'User not found', req);
        return res.status(401).json({ success: false, error: 'Invalid email or password', code: 'AUTH_INVALID_CREDENTIALS' });
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        // Check for brute force before logging failure
        const isBruteForce = await anomalyDetector.checkFailedLoginRate(email, req.ip);
        if (isBruteForce) {
          // Block IP temporarily
          await anomalyDetector.blockIpAddress(req.ip, 3600, 'brute_force_login');
          return res.status(429).json({
            success: false, error: 'Too many failed attempts. Your IP has been temporarily blocked.', code: 'AUTH_IP_BLOCKED'
          });
        }

        // Log failed login - invalid password
        await securityLogger.logLoginFailure(email, 'Invalid password', req, {
          userId: user.id
        });
        return res.status(401).json({ success: false, error: 'Invalid email or password', code: 'AUTH_INVALID_CREDENTIALS' });
      }

      // Reset failed login counter on successful authentication
      await anomalyDetector.resetFailedLoginCounter(email, req.ip);

      // Sprint 41: Check if 2FA is enabled — return temp token instead of full auth
      if (USE_DATABASE && dbQuery) {
        try {
          const twoFAResult = await dbQuery(
            `SELECT totp_enabled FROM users WHERE id = $1`,
            [user.id]
          );
          if (twoFAResult.rows.length > 0 && twoFAResult.rows[0].totp_enabled) {
            const tempToken = jwt.sign(
              { id: user.id, type: '2fa_pending' },
              JWT_SECRET,
              { expiresIn: '5m' }
            );
            return res.json({
              requires2FA: true,
              tempToken,
            });
          }
        } catch (e) {
          log.warn('2FA check failed, proceeding without', e.message);
        }
      }

      // Generate token pair with device tracking (Week 2 Security Sprint)
      const authResponse = await generateAuthResponse(user, req);

      // Log successful login
      await securityLogger.logLoginSuccess(user.id, req, {
        email: user.email,
        userType: user.userType
      });

      // Return auth response with access + refresh tokens
      res.json(authResponse);
  }));

// Get current user endpoint
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const users = await authHelper.getUsers();
  const user = users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found', code: 'AUTH_USER_NOT_FOUND' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
}));

// Logout endpoint
router.post('/logout', requireAuth, (req, res) => {
  // In a real app, you might want to invalidate the token server-side
  res.json({ success: true, message: 'Logged out successfully' });
});

// Google OAuth endpoint
router.post('/google', asyncHandler(async (req, res) => {
  log.info('Google OAuth request received', {
      hasCredential: !!req.body.credential,
      credentialLength: req.body.credential ? req.body.credential.length : 0,
      clientId: GOOGLE_CLIENT_ID
    });

    const { credential } = req.body;

    if (!credential) {
      log.info('No credential provided in request');
      return res.status(400).json({ success: false, error: 'Google credential is required', code: 'AUTH_MISSING_CREDENTIAL' });
    }

    // Verify the Google ID token (wrapped with circuit breaker)
    log.info('Attempting to verify Google ID token...');
    const ticket = await oauthBreaker.execute(() =>
      googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      })
    );

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, email_verified } = payload;
    log.info('Google token verified successfully', { email, name, email_verified });

    if (!email_verified) {
      log.info('Email not verified by Google');
      return res.status(400).json({ success: false, error: 'Google email not verified', code: 'AUTH_EMAIL_NOT_VERIFIED' });
    }

    // Check if user already exists
    const users = await authHelper.getUsers();
    let user = Array.isArray(users) ? users.find(u => u.email === email) : null;

    if (user) {
      // User exists, update Google ID if not set
      log.info('Existing user found', user.email);
      if (!user.googleId) {
        user.googleId = googleId;
        await authHelper.saveUsers(users);
      }
    } else {
      // Create new user with UUID (Week 2 - compatible with database)
      log.info('Creating new user for', email);
      user = {
        id: uuidv4(),
        email,
        name,
        googleId,
        userType: 'client', // Default user type for OAuth users
        createdAt: new Date().toISOString()
      };
      users.push(user);
      await authHelper.saveUsers(users);
    }

    // Generate token pair with device tracking (Week 2 Security Sprint)
    // Use simple auth response if database is not enabled
    const authResponse = USE_DATABASE
      ? await generateAuthResponse(user, req)
      : simpleAuthResponse(user);
    log.info('User authentication successful', user.email);

    // Log successful OAuth authentication
    await securityLogger.logOAuthSuccess(user.id, 'google', req, {
      email: user.email,
      name: user.name,
      isNewUser: !users.find(u => u.email === email)
    });

    // Return auth response with access + refresh tokens
    res.json(authResponse);
}));

// Google OAuth redirect callback endpoint (for redirect flow to bypass COOP)
router.post('/google/callback', asyncHandler(async (req, res) => {
  log.info('Google OAuth received redirect callback', {
      hasCredential: !!req.body?.credential,
      hasCsrfToken: !!req.body?.g_csrf_token,
      hasCsrfCookie: !!req.cookies?.g_csrf_token,
      origin: req.headers.origin,
      referer: req.headers.referer,
      contentType: req.headers['content-type']
    });

    const { credential, g_csrf_token } = req.body;

    // CSRF token verification - logged but not blocking
    // In redirect mode, SameSite=Lax cookies aren't sent with cross-origin POSTs from Google
    // The JWT signature verification with Google's public keys is sufficient security
    const cookieCsrfToken = req.cookies?.g_csrf_token;
    if (!g_csrf_token || !cookieCsrfToken || g_csrf_token !== cookieCsrfToken) {
      log.info('Google OAuth CSRF token mismatch (expected in redirect mode)', {
        hasFormToken: !!g_csrf_token,
        hasCookieToken: !!cookieCsrfToken,
        tokensMatch: g_csrf_token === cookieCsrfToken
      });
      // Continue anyway - JWT verification is sufficient security for OAuth
    }

    if (!credential) {
      log.info('Google OAuth no credential in redirect callback', { bodyKeys: Object.keys(req.body || {}) });
      return res.redirect(`${config.FRONTEND_URL || 'https://fluxstudio.art'}/login?error=no_credential`);
    }

    // Check if Google client is configured
    if (!googleClient) {
      log.error('Google OAuth client not configured - GOOGLE_CLIENT_ID may be missing');
      return res.redirect(`${config.FRONTEND_URL || 'https://fluxstudio.art'}/login?error=google_not_configured`);
    }

    // Log credential details for debugging
    log.debug('Google OAuth credential details', {
      credentialType: typeof credential,
      credentialLength: credential?.length,
      credentialPrefix: credential?.substring(0, 50),
      credentialSuffix: credential?.substring(credential.length - 20),
      clientIdLength: GOOGLE_CLIENT_ID?.length,
      clientIdPrefix: GOOGLE_CLIENT_ID?.substring(0, 20)
    });

    // Try to decode the JWT to see its claims (without verification)
    try {
      const parts = credential.split('.');
      if (parts.length === 3) {
        const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        log.debug('Google OAuth JWT Header', header);
        log.debug('Google OAuth JWT Payload', {
          iss: payload.iss,
          aud: payload.aud,
          exp: payload.exp,
          iat: payload.iat,
          email: payload.email,
          email_verified: payload.email_verified,
          azp: payload.azp
        });
        log.debug('Google OAuth expected audience', GOOGLE_CLIENT_ID);
        log.debug('Google OAuth token audience matches', payload.aud === GOOGLE_CLIENT_ID);
        log.debug('Google OAuth token expired', Date.now() / 1000 > payload.exp);
      }
    } catch (decodeError) {
      log.error('Google OAuth failed to decode JWT', decodeError);
    }

    // Verify the Google ID token (wrapped with circuit breaker)
    log.info('Google OAuth calling verifyIdToken...');
    const ticket = await oauthBreaker.execute(() =>
      googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      })
    );

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, email_verified } = payload;
    log.info('Google token verified successfully', { email, name, email_verified });

    if (!email_verified) {
      return res.redirect(`${config.FRONTEND_URL || 'https://fluxstudio.art'}/login?error=email_not_verified`);
    }

    // Check if user already exists
    const users = await authHelper.getUsers();
    let user = Array.isArray(users) ? users.find(u => u.email === email) : null;

    if (user) {
      // User exists, update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        await authHelper.saveUsers(users);
      }
    } else {
      // Create new user
      user = {
        id: uuidv4(),
        email,
        name,
        googleId,
        userType: 'client',
        createdAt: new Date().toISOString()
      };
      users.push(user);
      await authHelper.saveUsers(users);
    }

    // Generate JWT token
    const authResponse = USE_DATABASE
      ? await generateAuthResponse(user, req)
      : simpleAuthResponse(user);

    // Log successful OAuth authentication
    await securityLogger.logOAuthSuccess(user.id, 'google', req, {
      email: user.email,
      name: user.name,
      flow: 'redirect'
    });

    // Redirect to frontend with tokens
    const frontendUrl = config.FRONTEND_URL || 'https://fluxstudio.art';
    const token = authResponse.token || authResponse.accessToken;
    const refreshToken = authResponse.refreshToken;

    // Pass both access and refresh tokens to frontend
    const redirectUrl = `${frontendUrl}/auth/callback/google?token=${encodeURIComponent(token)}${refreshToken ? `&refreshToken=${encodeURIComponent(refreshToken)}` : ''}`;
    res.redirect(redirectUrl);
}));

// ========================================
// EMAIL VERIFICATION & PASSWORD RESET
// Phase 1 - User Adoption Roadmap
// ========================================

/**
 * Verify email address with token
 * POST /api/auth/verify-email
 */
router.post('/verify-email',
  authRateLimit,
  validateInput.sanitizeInput,
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Verification token is required', code: 'AUTH_MISSING_TOKEN' });
    }

      // For database mode, query directly
      if (USE_DATABASE && dbQuery) {
        // First check if token was already used (email already verified with no token)
        const usedCheck = await dbQuery(`
          SELECT id, email_verified FROM users
          WHERE email_verified = true AND verification_token IS NULL
          AND id IN (SELECT id FROM users WHERE verification_token = $1)
        `, [token]);

        const result = await dbQuery(`
          SELECT id, email, name, email_verified, verification_expires
          FROM users
          WHERE verification_token = $1
        `, [token]);

        if (result.rows.length === 0) {
          // Check if any user was previously verified with this token pattern
          return res.status(400).json({ success: false, error: 'This verification link is invalid or has already been used.', code: 'TOKEN_INVALID' });
        }

        const user = result.rows[0];

        // Check if already verified
        if (user.email_verified) {
          return res.json({ success: true, message: 'Email already verified', verified: true, code: 'TOKEN_ALREADY_USED' });
        }

        // Check if token is expired
        if (user.verification_expires && new Date(user.verification_expires) < new Date()) {
          return res.status(400).json({ success: false, error: 'Your verification link has expired. Please request a new one.', code: 'TOKEN_EXPIRED' });
        }

        // Mark email as verified and clear token
        await dbQuery(`
          UPDATE users
          SET email_verified = true, verification_token = NULL, verification_expires = NULL
          WHERE id = $1
        `, [user.id]);

        // Send welcome email
        await emailService.sendWelcomeEmail(user.email, user.name || 'there');

        // Log the verification
        await securityLogger.logEvent(
          'email_verified',
          securityLogger.SEVERITY.INFO,
          { userId: user.id, email: user.email }
        );

        // Sprint 44: Track email verification funnel event
        ingestEvent(user.id, 'email_verified', {}, {
          ipAddress: req.ip, userAgent: req.get('user-agent'),
        }).catch(() => {});

        return res.json({ success: true, message: 'Email verified successfully', verified: true });
      }

      // Fallback for file-based storage
      const users = await authHelper.getUsers();
      const user = users.find(u => u.verificationToken === token);

      if (!user) {
        return res.status(400).json({ success: false, error: 'This verification link is invalid or has already been used.', code: 'TOKEN_INVALID' });
      }

      if (user.emailVerified) {
        return res.json({ success: true, message: 'Email already verified', verified: true, code: 'TOKEN_ALREADY_USED' });
      }

      if (user.verificationExpires && new Date(user.verificationExpires) < new Date()) {
        return res.status(400).json({ success: false, error: 'Your verification link has expired. Please request a new one.', code: 'TOKEN_EXPIRED' });
      }

      // Update user
      user.emailVerified = true;
      user.verificationToken = null;
      user.verificationExpires = null;
      await authHelper.saveUsers(users);

      // Send welcome email
      await emailService.sendWelcomeEmail(user.email, user.name || 'there');

      res.json({ success: true, message: 'Email verified successfully', verified: true });
  })
);

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
router.post('/resend-verification',
  authRateLimit,
  validateInput.email,
  validateInput.sanitizeInput,
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required', code: 'AUTH_MISSING_EMAIL' });
    }

    // Check rate limiting for resend
      const isBlocked = await anomalyDetector.isIpBlocked(req.ip);
      if (isBlocked) {
        return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' });
      }

      // Generate new token
      const verificationToken = emailService.generateToken();
      const verificationExpires = emailService.generateExpiry(24); // 24 hours

      // For database mode
      if (USE_DATABASE && dbQuery) {
        const result = await dbQuery(`
          SELECT id, name, email_verified, verification_last_sent FROM users WHERE email = $1
        `, [email]);

        if (result.rows.length === 0) {
          // Don't reveal if email exists
          return res.json({ success: true, message: 'If an account exists with this email, a verification link has been sent.' });
        }

        const user = result.rows[0];

        if (user.email_verified) {
          return res.json({ success: true, message: 'Email is already verified' });
        }

        // Check per-user resend rate limit (60s cooldown)
        if (user.verification_last_sent) {
          const lastSent = new Date(user.verification_last_sent);
          const secondsSince = (Date.now() - lastSent.getTime()) / 1000;
          if (secondsSince < 60) {
            return res.status(429).json({
              success: false,
              error: `Please wait ${Math.ceil(60 - secondsSince)} seconds before requesting another verification email.`,
              code: 'RATE_LIMIT_EXCEEDED',
            });
          }
        }

        // Update token and last_sent timestamp
        await dbQuery(`
          UPDATE users
          SET verification_token = $1, verification_expires = $2, verification_last_sent = NOW()
          WHERE id = $3
        `, [verificationToken, verificationExpires, user.id]);

        // Send verification email
        await emailService.sendVerificationEmail(email, verificationToken, user.name || 'there');

        return res.json({ success: true, message: 'Verification email sent. Please check your inbox.' });
      }

      // Fallback for file-based storage
      const users = await authHelper.getUsers();
      const user = users.find(u => u.email === email);

      if (!user) {
        return res.json({ success: true, message: 'If an account exists with this email, a verification link has been sent.' });
      }

      if (user.emailVerified) {
        return res.json({ success: true, message: 'Email is already verified' });
      }

      // Check per-user resend rate limit (60s cooldown)
      if (user.verificationLastSent) {
        const lastSent = new Date(user.verificationLastSent);
        const secondsSince = (Date.now() - lastSent.getTime()) / 1000;
        if (secondsSince < 60) {
          return res.status(429).json({
            success: false,
            error: `Please wait ${Math.ceil(60 - secondsSince)} seconds before requesting another verification email.`,
            code: 'RATE_LIMIT_EXCEEDED',
          });
        }
      }

      // Update token and last_sent timestamp
      user.verificationToken = verificationToken;
      user.verificationExpires = verificationExpires.toISOString();
      user.verificationLastSent = new Date().toISOString();
      await authHelper.saveUsers(users);

      // Send verification email
      await emailService.sendVerificationEmail(email, verificationToken, user.name || 'there');

      res.json({ success: true, message: 'Verification email sent. Please check your inbox.' });
  })
);

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password',
  ipRateLimiters.passwordReset(),
  authRateLimit,
  validateInput.email,
  validateInput.sanitizeInput,
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required', code: 'AUTH_MISSING_EMAIL' });
    }

    // Check rate limiting
    const isBlocked = await anomalyDetector.isIpBlocked(req.ip);
      if (isBlocked) {
        return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' });
      }

      // Generate reset token
      const resetToken = emailService.generateToken();
      const resetExpires = emailService.generateExpiry(1); // 1 hour

      // For database mode
      if (USE_DATABASE && dbQuery) {
        const result = await dbQuery(`
          SELECT id, name, google_id FROM users WHERE email = $1
        `, [email]);

        // Always return success message to prevent email enumeration
        if (result.rows.length === 0) {
          return res.json({ success: true, message: 'If an account exists with this email, a password reset link has been sent.' });
        }

        const user = result.rows[0];

        // If user signed up with Google, suggest using Google login
        if (user.google_id && !user.password) {
          return res.json({
            success: true,
            message: 'This account uses Google Sign-In. Please log in with Google instead.',
            useGoogle: true
          });
        }

        // Update reset token
        await dbQuery(`
          UPDATE users
          SET password_reset_token = $1, password_reset_expires = $2
          WHERE id = $3
        `, [resetToken, resetExpires, user.id]);

        // Send reset email
        await emailService.sendPasswordResetEmail(email, resetToken, user.name || 'there');

        // Log the request
        await securityLogger.logEvent(
          'password_reset_requested',
          securityLogger.SEVERITY.INFO,
          { userId: user.id, email, ipAddress: req.ip }
        );

        return res.json({ success: true, message: 'If an account exists with this email, a password reset link has been sent.' });
      }

      // Fallback for file-based storage
      const users = await authHelper.getUsers();
      const user = users.find(u => u.email === email);

      if (!user) {
        return res.json({ success: true, message: 'If an account exists with this email, a password reset link has been sent.' });
      }

      if (user.googleId && !user.password) {
        return res.json({
          success: true,
          message: 'This account uses Google Sign-In. Please log in with Google instead.',
          useGoogle: true
        });
      }

      // Update reset token
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetExpires.toISOString();
      await authHelper.saveUsers(users);

      // Send reset email
      await emailService.sendPasswordResetEmail(email, resetToken, user.name || 'there');

      res.json({ success: true, message: 'If an account exists with this email, a password reset link has been sent.' });
  })
);

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
router.post('/reset-password',
  ipRateLimiters.passwordReset(),
  authRateLimit,
  validateInput.password,
  validateInput.sanitizeInput,
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Reset token is required', code: 'AUTH_MISSING_TOKEN' });
      }

      if (!password) {
        return res.status(400).json({ success: false, error: 'New password is required', code: 'AUTH_MISSING_PASSWORD' });
      }

      if (password.length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters', code: 'AUTH_WEAK_PASSWORD' });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // For database mode
      if (USE_DATABASE && dbQuery) {
        const result = await dbQuery(`
          SELECT id, email, password_reset_expires
          FROM users
          WHERE password_reset_token = $1
        `, [token]);

        if (result.rows.length === 0) {
          return res.status(400).json({ success: false, error: 'Invalid or expired reset token', code: 'AUTH_INVALID_RESET_TOKEN' });
        }

        const user = result.rows[0];

        // Check if token is expired
        if (user.password_reset_expires && new Date(user.password_reset_expires) < new Date()) {
          return res.status(400).json({ success: false, error: 'Reset token has expired. Please request a new one.', code: 'AUTH_RESET_TOKEN_EXPIRED' });
        }

        // Update password and clear reset token
        await dbQuery(`
          UPDATE users
          SET password = $1, password_reset_token = NULL, password_reset_expires = NULL
          WHERE id = $2
        `, [hashedPassword, user.id]);

        // Log the password change
        await securityLogger.logEvent(
          'password_reset_completed',
          securityLogger.SEVERITY.INFO,
          { userId: user.id, email: user.email, ipAddress: req.ip }
        );

        return res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
      }

      // Fallback for file-based storage
      const users = await authHelper.getUsers();
      const user = users.find(u => u.passwordResetToken === token);

      if (!user) {
        return res.status(400).json({ success: false, error: 'Invalid or expired reset token', code: 'AUTH_INVALID_RESET_TOKEN' });
      }

      if (user.passwordResetExpires && new Date(user.passwordResetExpires) < new Date()) {
        return res.status(400).json({ success: false, error: 'Reset token has expired. Please request a new one.', code: 'AUTH_RESET_TOKEN_EXPIRED' });
      }

      // Update password and clear reset token
      user.password = hashedPassword;
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await authHelper.saveUsers(users);

      res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
  })
);

// Apple OAuth endpoint (placeholder)
router.post('/apple', asyncHandler(async (req, res) => {
  // In production, this would:
  // 1. Verify the Apple Sign In token
  // 2. Get user info from Apple API
  // 3. Create or find user in database
  // 4. Return JWT token

  res.status(400).json({
    success: false,
    error: 'Apple Sign-In coming soon',
    code: 'APPLE_AUTH_NOT_AVAILABLE'
  });
}));

// =============================================================================
// USER SETTINGS & PREFERENCES
// =============================================================================

/**
 * GET /api/auth/settings
 * Get current user's settings and preferences
 */
router.get('/settings', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Try to get from database first
  if (USE_DATABASE && authAdapter) {
      try {
        const user = await authAdapter.findUserById(userId);
        if (user) {
          // Default settings structure
          const defaultSettings = {
            notifications: {
              push: true,
              emailDigest: true
            },
            appearance: {
              darkMode: false,
              language: 'en'
            },
            performance: {
              autoSave: true
            }
          };

          // Merge with user preferences
          const settings = {
            ...defaultSettings,
            ...(user.preferences || {})
          };

          return res.json({
            success: true,
            settings
          });
        }
      } catch (dbError) {
        log.error('Database error fetching settings', dbError);
        // Fall through to file-based storage
      }
    }

    // Fallback to file-based storage
    const users = await authHelper.getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'AUTH_USER_NOT_FOUND'
      });
    }

    const defaultSettings = {
      notifications: {
        push: true,
        emailDigest: true
      },
      appearance: {
        darkMode: false,
        language: 'en'
      },
      performance: {
        autoSave: true
      }
    };

    const settings = {
      ...defaultSettings,
      ...(user.preferences || {})
    };

    res.json({
      success: true,
      settings
    });
}));

/**
 * PUT /api/auth/settings
 * Update current user's settings and preferences
 */
router.put('/settings', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Settings object is required',
        code: 'AUTH_INVALID_SETTINGS'
      });
    }

    // Validate settings structure
    const allowedCategories = ['notifications', 'appearance', 'performance'];
    const validSettings = {};

    for (const [category, values] of Object.entries(settings)) {
      if (allowedCategories.includes(category) && typeof values === 'object') {
        validSettings[category] = values;
      }
    }

    // Try to update in database first
    if (USE_DATABASE && authAdapter) {
      try {
        // Get current user to merge settings
        const currentUser = await authAdapter.findUserById(userId);
        if (currentUser) {
          const mergedPreferences = {
            ...(currentUser.preferences || {}),
            ...validSettings
          };

          // Update user preferences in database
          const result = await query(`
            UPDATE users
            SET preferences = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, preferences
          `, [JSON.stringify(mergedPreferences), userId]);

          if (result.rows.length > 0) {
            return res.json({
              success: true,
              settings: mergedPreferences,
              message: 'Settings saved successfully'
            });
          }
        }
      } catch (dbError) {
        log.error('Database error updating settings', dbError);
        // Fall through to file-based storage
      }
    }

    // Fallback to file-based storage
    const users = await authHelper.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'AUTH_USER_NOT_FOUND'
      });
    }

    // Merge with existing preferences
    users[userIndex].preferences = {
      ...(users[userIndex].preferences || {}),
      ...validSettings
    };
    users[userIndex].updatedAt = new Date().toISOString();

    await authHelper.saveUsers(users);

    res.json({
      success: true,
      settings: users[userIndex].preferences,
      message: 'Settings saved successfully'
    });
}));

module.exports = router;
