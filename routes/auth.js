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
const { config } = require('../config/environment');
const { authRateLimit, validateInput } = require('../middleware/security');
const { getCsrfToken } = require('../middleware/csrf');

// Import helpers
const { generateAuthResponse } = require('../lib/auth/authHelpers');
const securityLogger = require('../lib/auth/securityLogger');
const { captureAuthError } = require('../lib/monitoring/sentry');
const anomalyDetector = require('../lib/security/anomalyDetector');

// Import email service for verification and password reset
const { emailService } = require('../lib/email/emailService');

// Import database query function for email verification (when USE_DATABASE=true)
let dbQuery = null;
try {
  const { query } = require('../database/config');
  dbQuery = query;
} catch (e) {
  console.log('Database query not available for email verification');
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
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      userType: user.userType,
      type: 'access'  // Required by tokenService.verifyAccessToken()
    },
    JWT_SECRET,
    { expiresIn: '7d' }
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
    return res.status(500).json({ message: 'Auth system not initialized' });
  }
  return authHelper.authenticateToken(req, res, next);
};

// CSRF token endpoint - must be called before making state-changing requests
router.get('/csrf-token', getCsrfToken);

// Signup endpoint
router.post('/signup',
  authRateLimit,
  validateInput.email,
  validateInput.password,
  validateInput.sanitizeInput,
  async (req, res) => {
    try {
      const { email, password, name, userType = 'client' } = req.body;

      // Check if IP is blocked (Sprint 13 Day 2 - Anomaly Detection)
      const isBlocked = await anomalyDetector.isIpBlocked(req.ip);
      if (isBlocked) {
        return res.status(429).json({
          message: 'Too many requests. Please try again later.'
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
          message: 'Too many signup attempts. Please try again later.'
        });
      }

      // Validation
      if (!email || !password || !name) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Validate userType
      const validUserTypes = ['client', 'designer', 'admin'];
      if (!validUserTypes.includes(userType)) {
        return res.status(400).json({ message: 'Invalid user type' });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }

      // Check if user exists
      const users = await authHelper.getUsers();
      if (users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate email verification token
      const verificationToken = emailService.generateToken();
      const verificationExpires = emailService.generateExpiry(24); // 24 hours

      // Create user with UUID (Week 2 - compatible with database)
      const newUser = {
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

      // If using database, also update the verification columns
      if (USE_DATABASE && dbQuery) {
        try {
          await dbQuery(`
            UPDATE users
            SET email_verified = false, verification_token = $1, verification_expires = $2
            WHERE id = $3
          `, [verificationToken, verificationExpires, newUser.id]);
        } catch (dbError) {
          console.warn('Could not update verification columns in database:', dbError.message);
        }
      }

      // Send verification email (non-blocking - don't fail signup if email fails)
      emailService.sendVerificationEmail(email, verificationToken, name)
        .then(sent => {
          if (sent) {
            console.log('Verification email sent to:', email);
          } else {
            console.warn('Failed to send verification email to:', email);
          }
        })
        .catch(err => {
          console.error('Error sending verification email:', err.message);
        });

      // Generate token pair with device tracking (Week 2 Security Sprint)
      const authResponse = await generateAuthResponse(newUser, req);

      // Log successful signup
      await securityLogger.logSignupSuccess(newUser.id, email, req, {
        userType,
        name
      });

      // Return auth response with access + refresh tokens
      // Include emailVerified status so frontend knows to show verification reminder
      res.json({
        ...authResponse,
        emailVerified: false,
        message: 'Account created! Please check your email to verify your account.'
      });
    } catch (error) {
      console.error('Signup error:', error);

      // Capture error in Sentry with auth context (Sprint 13 Day 2)
      captureAuthError(error, {
        endpoint: '/api/auth/signup',
        email: req.body.email,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      // Log failed signup attempt
      await securityLogger.logSignupFailure(req.body.email, error.message, req, {
        error: error.message
      });

      res.status(500).json({ message: 'Server error during signup' });
    }
  });

// Login endpoint
router.post('/login',
  authRateLimit,
  validateInput.email,
  validateInput.sanitizeInput,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check if IP is blocked (Sprint 13 Day 2 - Anomaly Detection)
      const isBlocked = await anomalyDetector.isIpBlocked(req.ip);
      if (isBlocked) {
        return res.status(429).json({
          message: 'Too many failed attempts. Please try again later.'
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
            message: 'Too many failed attempts. Your IP has been temporarily blocked.'
          });
        }

        // Log failed login - user not found
        await securityLogger.logLoginFailure(email, 'User not found', req);
        return res.status(401).json({ message: 'Invalid email or password' });
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
            message: 'Too many failed attempts. Your IP has been temporarily blocked.'
          });
        }

        // Log failed login - invalid password
        await securityLogger.logLoginFailure(email, 'Invalid password', req, {
          userId: user.id
        });
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Reset failed login counter on successful authentication
      await anomalyDetector.resetFailedLoginCounter(email, req.ip);

      // Generate token pair with device tracking (Week 2 Security Sprint)
      const authResponse = await generateAuthResponse(user, req);

      // Log successful login
      await securityLogger.logLoginSuccess(user.id, req, {
        email: user.email,
        userType: user.userType
      });

      // Return auth response with access + refresh tokens
      res.json(authResponse);
    } catch (error) {
      console.error('Login error:', error);

      // Capture error in Sentry with auth context (Sprint 13 Day 2)
      captureAuthError(error, {
        endpoint: '/api/auth/login',
        email: req.body.email,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      // Log failed login - server error
      await securityLogger.logLoginFailure(req.body.email, `Server error: ${error.message}`, req);

      res.status(500).json({ message: 'Server error during login' });
    }
  });

// Get current user endpoint
router.get('/me', requireAuth, async (req, res) => {
  try {
    const users = await authHelper.getUsers();
    const user = users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Failed to fetch user data' });
  }
});

// Logout endpoint
router.post('/logout', requireAuth, (req, res) => {
  // In a real app, you might want to invalidate the token server-side
  res.json({ message: 'Logged out successfully' });
});

// Google OAuth endpoint
router.post('/google', async (req, res) => {
  try {
    console.log('Google OAuth request received:', {
      body: req.body,
      hasCredential: !!req.body.credential,
      credentialLength: req.body.credential ? req.body.credential.length : 0,
      clientId: GOOGLE_CLIENT_ID
    });

    const { credential } = req.body;

    if (!credential) {
      console.log('No credential provided in request');
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Verify the Google ID token
    console.log('Attempting to verify Google ID token...');
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, email_verified } = payload;
    console.log('Google token verified successfully:', { email, name, email_verified });

    if (!email_verified) {
      console.log('Email not verified by Google');
      return res.status(400).json({ message: 'Google email not verified' });
    }

    // Check if user already exists
    const users = await authHelper.getUsers();
    let user = Array.isArray(users) ? users.find(u => u.email === email) : null;

    if (user) {
      // User exists, update Google ID if not set
      console.log('Existing user found:', user.email);
      if (!user.googleId) {
        user.googleId = googleId;
        await authHelper.saveUsers(users);
      }
    } else {
      // Create new user with UUID (Week 2 - compatible with database)
      console.log('Creating new user for:', email);
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
    console.log('User authentication successful:', user.email);

    // Log successful OAuth authentication
    await securityLogger.logOAuthSuccess(user.id, 'google', req, {
      email: user.email,
      name: user.name,
      isNewUser: !users.find(u => u.email === email)
    });

    // Return auth response with access + refresh tokens
    res.json(authResponse);

  } catch (error) {
    // Classify the Google OAuth error for better diagnostics
    let errorType = 'unknown';
    let userMessage = 'Google authentication failed';

    if (error.message?.includes('Token used too late') || error.message?.includes('expired')) {
      errorType = 'token_expired';
      userMessage = 'Google sign-in expired. Please try again.';
    } else if (error.message?.includes('Invalid token') || error.message?.includes('Wrong number of segments')) {
      errorType = 'invalid_token';
      userMessage = 'Invalid Google credential. Please try again.';
    } else if (error.message?.includes('audience') || error.message?.includes('client_id')) {
      errorType = 'audience_mismatch';
      userMessage = 'Google authentication configuration error.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      errorType = 'network_error';
      userMessage = 'Unable to verify Google sign-in. Please check your connection.';
    }

    // Log error without sensitive data
    console.error(`[GoogleOAuth] Auth failed (${errorType}): ${error.message}`);

    // Log failed OAuth attempt
    await securityLogger.logOAuthFailure('google', error.message, req, {
      errorType,
      errorMessage: error.message,
      hasCredential: !!req.body.credential
    });

    res.status(401).json({ message: userMessage, errorType });
  }
});

// Google OAuth redirect callback endpoint (for redirect flow to bypass COOP)
router.post('/google/callback', async (req, res) => {
  try {
    console.log('[GoogleOAuth] Received redirect callback:', {
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
      console.log('[GoogleOAuth] CSRF token mismatch (expected in redirect mode):', {
        hasFormToken: !!g_csrf_token,
        hasCookieToken: !!cookieCsrfToken,
        tokensMatch: g_csrf_token === cookieCsrfToken
      });
      // Continue anyway - JWT verification is sufficient security for OAuth
    }

    if (!credential) {
      console.log('[GoogleOAuth] No credential in redirect callback. Request body keys:', Object.keys(req.body || {}));
      return res.redirect(`${config.FRONTEND_URL || 'https://fluxstudio.art'}/login?error=no_credential`);
    }

    // Check if Google client is configured
    if (!googleClient) {
      console.error('Google OAuth client not configured - GOOGLE_CLIENT_ID may be missing');
      return res.redirect(`${config.FRONTEND_URL || 'https://fluxstudio.art'}/login?error=google_not_configured`);
    }

    // Log credential details for debugging
    console.log('[GoogleOAuth] Credential details:', {
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
        console.log('[GoogleOAuth] JWT Header:', header);
        console.log('[GoogleOAuth] JWT Payload:', {
          iss: payload.iss,
          aud: payload.aud,
          exp: payload.exp,
          iat: payload.iat,
          email: payload.email,
          email_verified: payload.email_verified,
          azp: payload.azp
        });
        console.log('[GoogleOAuth] Expected audience:', GOOGLE_CLIENT_ID);
        console.log('[GoogleOAuth] Token audience matches:', payload.aud === GOOGLE_CLIENT_ID);
        console.log('[GoogleOAuth] Token expired:', Date.now() / 1000 > payload.exp);
      }
    } catch (decodeError) {
      console.error('[GoogleOAuth] Failed to decode JWT:', decodeError.message);
    }

    // Verify the Google ID token
    console.log('[GoogleOAuth] Calling verifyIdToken...');
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, email_verified } = payload;
    console.log('Google token verified successfully:', { email, name, email_verified });

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

  } catch (error) {
    // Log detailed error for debugging
    console.error('[GoogleOAuth] Redirect callback failed:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      clientIdSet: !!GOOGLE_CLIENT_ID,
      clientIdLength: GOOGLE_CLIENT_ID?.length,
      hasCredential: !!req.body?.credential,
      credentialLength: req.body?.credential?.length
    });

    await securityLogger.logOAuthFailure('google', error.message, req, {
      flow: 'redirect',
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code
    });

    const frontendUrl = config.FRONTEND_URL || 'https://fluxstudio.art';
    res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }
});

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
  async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: 'Verification token is required' });
      }

      // For database mode, query directly
      if (USE_DATABASE && dbQuery) {
        const result = await dbQuery(`
          SELECT id, email, name, email_verified, verification_expires
          FROM users
          WHERE verification_token = $1
        `, [token]);

        if (result.rows.length === 0) {
          return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        const user = result.rows[0];

        // Check if already verified
        if (user.email_verified) {
          return res.json({ message: 'Email already verified', verified: true });
        }

        // Check if token is expired
        if (user.verification_expires && new Date(user.verification_expires) < new Date()) {
          return res.status(400).json({ message: 'Verification token has expired. Please request a new one.' });
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

        return res.json({ message: 'Email verified successfully', verified: true });
      }

      // Fallback for file-based storage
      const users = await authHelper.getUsers();
      const user = users.find(u => u.verificationToken === token);

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired verification token' });
      }

      if (user.emailVerified) {
        return res.json({ message: 'Email already verified', verified: true });
      }

      if (user.verificationExpires && new Date(user.verificationExpires) < new Date()) {
        return res.status(400).json({ message: 'Verification token has expired. Please request a new one.' });
      }

      // Update user
      user.emailVerified = true;
      user.verificationToken = null;
      user.verificationExpires = null;
      await authHelper.saveUsers(users);

      // Send welcome email
      await emailService.sendWelcomeEmail(user.email, user.name || 'there');

      res.json({ message: 'Email verified successfully', verified: true });
    } catch (error) {
      console.error('Email verification error:', error);
      captureAuthError(error, {
        endpoint: '/api/auth/verify-email',
        ipAddress: req.ip
      });
      res.status(500).json({ message: 'Server error during email verification' });
    }
  }
);

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
router.post('/resend-verification',
  authRateLimit,
  validateInput.email,
  validateInput.sanitizeInput,
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check rate limiting for resend
      const isBlocked = await anomalyDetector.isIpBlocked(req.ip);
      if (isBlocked) {
        return res.status(429).json({ message: 'Too many requests. Please try again later.' });
      }

      // Generate new token
      const verificationToken = emailService.generateToken();
      const verificationExpires = emailService.generateExpiry(24); // 24 hours

      // For database mode
      if (USE_DATABASE && dbQuery) {
        const result = await dbQuery(`
          SELECT id, name, email_verified FROM users WHERE email = $1
        `, [email]);

        if (result.rows.length === 0) {
          // Don't reveal if email exists
          return res.json({ message: 'If an account exists with this email, a verification link has been sent.' });
        }

        const user = result.rows[0];

        if (user.email_verified) {
          return res.json({ message: 'Email is already verified' });
        }

        // Update token
        await dbQuery(`
          UPDATE users
          SET verification_token = $1, verification_expires = $2
          WHERE id = $3
        `, [verificationToken, verificationExpires, user.id]);

        // Send verification email
        await emailService.sendVerificationEmail(email, verificationToken, user.name || 'there');

        return res.json({ message: 'Verification email sent. Please check your inbox.' });
      }

      // Fallback for file-based storage
      const users = await authHelper.getUsers();
      const user = users.find(u => u.email === email);

      if (!user) {
        return res.json({ message: 'If an account exists with this email, a verification link has been sent.' });
      }

      if (user.emailVerified) {
        return res.json({ message: 'Email is already verified' });
      }

      // Update token
      user.verificationToken = verificationToken;
      user.verificationExpires = verificationExpires.toISOString();
      await authHelper.saveUsers(users);

      // Send verification email
      await emailService.sendVerificationEmail(email, verificationToken, user.name || 'there');

      res.json({ message: 'Verification email sent. Please check your inbox.' });
    } catch (error) {
      console.error('Resend verification error:', error);
      captureAuthError(error, {
        endpoint: '/api/auth/resend-verification',
        email: req.body.email,
        ipAddress: req.ip
      });
      res.status(500).json({ message: 'Server error while sending verification email' });
    }
  }
);

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password',
  authRateLimit,
  validateInput.email,
  validateInput.sanitizeInput,
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check rate limiting
      const isBlocked = await anomalyDetector.isIpBlocked(req.ip);
      if (isBlocked) {
        return res.status(429).json({ message: 'Too many requests. Please try again later.' });
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
          return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
        }

        const user = result.rows[0];

        // If user signed up with Google, suggest using Google login
        if (user.google_id && !user.password) {
          return res.json({
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

        return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
      }

      // Fallback for file-based storage
      const users = await authHelper.getUsers();
      const user = users.find(u => u.email === email);

      if (!user) {
        return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
      }

      if (user.googleId && !user.password) {
        return res.json({
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

      res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      captureAuthError(error, {
        endpoint: '/api/auth/forgot-password',
        email: req.body.email,
        ipAddress: req.ip
      });
      res.status(500).json({ message: 'Server error while processing password reset request' });
    }
  }
);

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
router.post('/reset-password',
  authRateLimit,
  validateInput.password,
  validateInput.sanitizeInput,
  async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token) {
        return res.status(400).json({ message: 'Reset token is required' });
      }

      if (!password) {
        return res.status(400).json({ message: 'New password is required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
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
          return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        const user = result.rows[0];

        // Check if token is expired
        if (user.password_reset_expires && new Date(user.password_reset_expires) < new Date()) {
          return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
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

        return res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
      }

      // Fallback for file-based storage
      const users = await authHelper.getUsers();
      const user = users.find(u => u.passwordResetToken === token);

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      if (user.passwordResetExpires && new Date(user.passwordResetExpires) < new Date()) {
        return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
      }

      // Update password and clear reset token
      user.password = hashedPassword;
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await authHelper.saveUsers(users);

      res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
    } catch (error) {
      console.error('Reset password error:', error);
      captureAuthError(error, {
        endpoint: '/api/auth/reset-password',
        ipAddress: req.ip
      });
      res.status(500).json({ message: 'Server error while resetting password' });
    }
  }
);

// Apple OAuth endpoint (placeholder)
router.post('/apple', async (req, res) => {
  try {
    // In production, this would:
    // 1. Verify the Apple Sign In token
    // 2. Get user info from Apple API
    // 3. Create or find user in database
    // 4. Return JWT token

    // For now, return a helpful message
    res.status(501).json({
      message: 'Apple Sign In integration is in development. Please use email/password authentication for now.',
      error: 'OAuth not yet implemented'
    });
  } catch (error) {
    console.error('Apple OAuth error:', error);
    res.status(500).json({ message: 'Apple authentication error' });
  }
});

// =============================================================================
// USER SETTINGS & PREFERENCES
// =============================================================================

/**
 * GET /api/auth/settings
 * Get current user's settings and preferences
 */
router.get('/settings', requireAuth, async (req, res) => {
  try {
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
        console.error('Database error fetching settings:', dbError);
        // Fall through to file-based storage
      }
    }

    // Fallback to file-based storage
    const users = await authHelper.getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
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
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

/**
 * PUT /api/auth/settings
 * Update current user's settings and preferences
 */
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Settings object is required'
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
        console.error('Database error updating settings:', dbError);
        // Fall through to file-based storage
      }
    }

    // Fallback to file-based storage
    const users = await authHelper.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
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
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save settings'
    });
  }
});

module.exports = router;
