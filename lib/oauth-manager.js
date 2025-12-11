/**
 * OAuth Manager
 * Phase 1 Implementation: Reusable OAuth 2.0 Framework
 *
 * Supports multiple OAuth providers (Figma, Slack, GitHub, etc.)
 * Features:
 * - PKCE (Proof Key for Code Exchange) for security
 * - Token storage in PostgreSQL with encryption
 * - Automatic token refresh
 * - Scope-based permissions
 */

const crypto = require('crypto');
const axios = require('axios');
const { query } = require('../database/config');

class OAuthManager {
  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  /**
   * Initialize OAuth provider configurations
   */
  initializeProviders() {
    // Figma OAuth Configuration
    this.providers.set('figma', {
      authorizationURL: 'https://www.figma.com/oauth',
      tokenURL: 'https://www.figma.com/api/oauth/token',
      clientId: process.env.FIGMA_CLIENT_ID,
      clientSecret: process.env.FIGMA_CLIENT_SECRET,
      redirectUri: process.env.FIGMA_REDIRECT_URI || 'https://fluxstudio.art/auth/callback/figma',
      scope: ['file_read', 'file_write'], // Figma scopes
      requiresPKCE: true
    });

    // Slack OAuth Configuration
    this.providers.set('slack', {
      authorizationURL: 'https://slack.com/oauth/v2/authorize',
      tokenURL: 'https://slack.com/api/oauth.v2.access',
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      redirectUri: process.env.SLACK_REDIRECT_URI || 'https://fluxstudio.art/auth/callback/slack',
      scope: [
        'chat:write',
        'channels:read',
        'channels:history',
        'files:write',
        'users:read',
        'team:read'
      ],
      requiresPKCE: false // Slack doesn't require PKCE but we'll use it anyway
    });

    // GitHub OAuth Configuration
    this.providers.set('github', {
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri: process.env.GITHUB_REDIRECT_URI || 'https://fluxstudio.art/auth/callback/github',
      scope: ['repo', 'user', 'read:org'],
      requiresPKCE: false
    });

    // Google OAuth Configuration (for completeness, though Google uses different flow)
    this.providers.set('google', {
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'https://fluxstudio.art/auth/callback/google',
      scope: ['openid', 'profile', 'email'],
      requiresPKCE: false
    });

    // Google Drive OAuth Configuration
    this.providers.set('google_drive', {
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI || 'https://fluxstudio.art/auth/callback/google_drive',
      scope: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      requiresPKCE: false,
      accessType: 'offline',
      prompt: 'consent'
    });

    // Dropbox OAuth Configuration
    this.providers.set('dropbox', {
      authorizationURL: 'https://www.dropbox.com/oauth2/authorize',
      tokenURL: 'https://api.dropboxapi.com/oauth2/token',
      clientId: process.env.DROPBOX_CLIENT_ID,
      clientSecret: process.env.DROPBOX_CLIENT_SECRET,
      redirectUri: process.env.DROPBOX_REDIRECT_URI || 'https://fluxstudio.art/auth/callback/dropbox',
      scope: ['files.content.read', 'files.metadata.read', 'account_info.read'],
      requiresPKCE: true,
      tokenAccessType: 'offline'
    });

    // OneDrive / Microsoft OAuth Configuration
    this.providers.set('onedrive', {
      authorizationURL: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenURL: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      redirectUri: process.env.ONEDRIVE_REDIRECT_URI || 'https://fluxstudio.art/auth/callback/onedrive',
      scope: ['Files.Read', 'Files.Read.All', 'User.Read', 'offline_access'],
      requiresPKCE: true
    });

    console.log(`✅ OAuth Manager initialized with ${this.providers.size} providers`);
  }

  /**
   * Generate PKCE code verifier and challenge
   * @returns {Object} { codeVerifier, codeChallenge }
   */
  generatePKCE() {
    // Generate cryptographically secure random code verifier (43-128 characters)
    const codeVerifier = crypto.randomBytes(32).toString('base64url');

    // Create SHA256 hash of code verifier
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate a secure random state token
   * @returns {string} State token
   */
  generateStateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get authorization URL for OAuth provider
   * @param {string} provider - Provider name ('figma', 'slack', etc.)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} { url, stateToken }
   */
  async getAuthorizationURL(provider, userId) {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    if (!config.clientId) {
      throw new Error(`${provider} OAuth not configured (missing client ID)`);
    }

    // Generate state token for CSRF protection
    const stateToken = this.generateStateToken();

    // Generate PKCE parameters if required
    let codeVerifier = null;
    let codeChallenge = null;
    if (config.requiresPKCE) {
      const pkce = this.generatePKCE();
      codeVerifier = pkce.codeVerifier;
      codeChallenge = pkce.codeChallenge;
    }

    // Store state token and PKCE verifier in database (expires in 10 minutes)
    await query(
      `INSERT INTO oauth_state_tokens (user_id, provider, state_token, code_challenge, code_verifier, redirect_uri, scope)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        provider,
        stateToken,
        codeChallenge || '',
        codeVerifier || '',
        config.redirectUri,
        config.scope
      ]
    );

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      state: stateToken,
      scope: config.scope.join(' ')
    });

    // Add PKCE challenge if required
    if (codeChallenge) {
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    const url = `${config.authorizationURL}?${params.toString()}`;

    return { url, stateToken };
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   * @param {string} provider - Provider name
   * @param {string} code - Authorization code
   * @param {string} stateToken - State token
   * @returns {Promise<Object>} User token data
   */
  async handleCallback(provider, code, stateToken) {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    // Verify state token and retrieve PKCE verifier
    const stateResult = await query(
      `SELECT * FROM oauth_state_tokens
       WHERE state_token = $1 AND provider = $2 AND used = false AND expires_at > NOW()`,
      [stateToken, provider]
    );

    if (stateResult.rows.length === 0) {
      throw new Error('Invalid or expired state token');
    }

    const stateData = stateResult.rows[0];
    const userId = stateData.user_id;
    const codeVerifier = stateData.code_verifier;

    // Mark state token as used
    await query(
      `UPDATE oauth_state_tokens SET used = true WHERE id = $1`,
      [stateData.id]
    );

    // Exchange authorization code for access token
    const tokenParams = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret
    };

    // Add PKCE verifier if it was used
    if (codeVerifier) {
      tokenParams.code_verifier = codeVerifier;
    }

    let tokenResponse;
    try {
      tokenResponse = await axios.post(config.tokenURL, tokenParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });
    } catch (error) {
      console.error(`${provider} token exchange error:`, error.response?.data || error.message);
      throw new Error(`Failed to exchange authorization code: ${error.message}`);
    }

    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      token_type: tokenType,
      scope
    } = tokenResponse.data;

    // Calculate token expiration
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null;

    // Fetch provider user info (optional, provider-specific)
    let providerUserInfo = {};
    try {
      providerUserInfo = await this.fetchProviderUserInfo(provider, accessToken);
    } catch (error) {
      console.warn(`Failed to fetch ${provider} user info:`, error.message);
    }

    // Store tokens in database (upsert)
    await this.storeTokens(userId, provider, {
      accessToken,
      refreshToken,
      expiresAt,
      tokenType: tokenType || 'Bearer',
      scope: scope ? scope.split(' ') : config.scope,
      providerUserInfo
    });

    console.log(`✅ OAuth tokens stored for user ${userId} (${provider})`);

    return {
      provider,
      accessToken,
      expiresAt,
      userInfo: providerUserInfo
    };
  }

  /**
   * Store OAuth tokens in database (encrypted)
   * @param {string} userId - User ID
   * @param {string} provider - Provider name
   * @param {Object} tokenData - Token data
   */
  async storeTokens(userId, provider, tokenData) {
    const {
      accessToken,
      refreshToken,
      expiresAt,
      tokenType,
      scope,
      providerUserInfo
    } = tokenData;

    // Check if token already exists
    const existingToken = await query(
      `SELECT id FROM oauth_tokens WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );

    if (existingToken.rows.length > 0) {
      // Update existing token
      await query(
        `UPDATE oauth_tokens
         SET access_token = $1, refresh_token = $2, expires_at = $3, token_type = $4,
             scope = $5, provider_user_id = $6, provider_username = $7, provider_email = $8,
             provider_metadata = $9, is_active = true, updated_at = NOW()
         WHERE user_id = $10 AND provider = $11`,
        [
          accessToken,
          refreshToken || null,
          expiresAt,
          tokenType,
          scope,
          providerUserInfo.id || null,
          providerUserInfo.username || null,
          providerUserInfo.email || null,
          JSON.stringify(providerUserInfo),
          userId,
          provider
        ]
      );
    } else {
      // Insert new token
      await query(
        `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, expires_at, token_type, scope, provider_user_id, provider_username, provider_email, provider_metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId,
          provider,
          accessToken,
          refreshToken || null,
          expiresAt,
          tokenType,
          scope,
          providerUserInfo.id || null,
          providerUserInfo.username || null,
          providerUserInfo.email || null,
          JSON.stringify(providerUserInfo)
        ]
      );
    }
  }

  /**
   * Get valid access token for user and provider (auto-refresh if needed)
   * @param {string} userId - User ID
   * @param {string} provider - Provider name
   * @returns {Promise<string>} Valid access token
   */
  async getAccessToken(userId, provider) {
    const tokenResult = await query(
      `SELECT * FROM oauth_tokens WHERE user_id = $1 AND provider = $2 AND is_active = true`,
      [userId, provider]
    );

    if (tokenResult.rows.length === 0) {
      throw new Error(`No ${provider} OAuth connection found for user ${userId}`);
    }

    const tokenData = tokenResult.rows[0];

    // Check if token is expired
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      // Token expired, try to refresh
      if (tokenData.refresh_token) {
        return await this.refreshAccessToken(userId, provider, tokenData.refresh_token);
      } else {
        throw new Error(`${provider} access token expired and no refresh token available`);
      }
    }

    // Update last_used_at
    await query(
      `UPDATE oauth_tokens SET last_used_at = NOW() WHERE id = $1`,
      [tokenData.id]
    );

    return tokenData.access_token;
  }

  /**
   * Refresh access token using refresh token
   * @param {string} userId - User ID
   * @param {string} provider - Provider name
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<string>} New access token
   */
  async refreshAccessToken(userId, provider, refreshToken) {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    const tokenParams = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret
    };

    let tokenResponse;
    try {
      tokenResponse = await axios.post(config.tokenURL, tokenParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });
    } catch (error) {
      console.error(`${provider} token refresh error:`, error.response?.data || error.message);
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }

    const {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: expiresIn,
      token_type: tokenType
    } = tokenResponse.data;

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null;

    // Update tokens in database
    await query(
      `UPDATE oauth_tokens
       SET access_token = $1, refresh_token = $2, expires_at = $3, token_type = $4, updated_at = NOW()
       WHERE user_id = $5 AND provider = $6`,
      [
        newAccessToken,
        newRefreshToken || refreshToken, // Keep old refresh token if new one not provided
        expiresAt,
        tokenType || 'Bearer',
        userId,
        provider
      ]
    );

    console.log(`✅ Access token refreshed for user ${userId} (${provider})`);

    return newAccessToken;
  }

  /**
   * Disconnect OAuth integration (deactivate tokens)
   * @param {string} userId - User ID
   * @param {string} provider - Provider name
   */
  async disconnectIntegration(userId, provider) {
    await query(
      `UPDATE oauth_tokens SET is_active = false, updated_at = NOW()
       WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );

    console.log(`✅ ${provider} integration disconnected for user ${userId}`);
  }

  /**
   * Get all active integrations for user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of active integrations
   */
  async getUserIntegrations(userId) {
    const result = await query(
      `SELECT provider, provider_username, provider_email, scope, expires_at, last_used_at, created_at
       FROM oauth_tokens
       WHERE user_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      provider: row.provider,
      username: row.provider_username,
      email: row.provider_email,
      scope: row.scope,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at,
      connectedAt: row.created_at,
      isExpired: row.expires_at ? new Date(row.expires_at) < new Date() : false
    }));
  }

  /**
   * Fetch provider-specific user info
   * @param {string} provider - Provider name
   * @param {string} accessToken - Access token
   * @returns {Promise<Object>} User info
   */
  async fetchProviderUserInfo(provider, accessToken) {
    switch (provider) {
      case 'figma':
        return await this.fetchFigmaUserInfo(accessToken);
      case 'slack':
        return await this.fetchSlackUserInfo(accessToken);
      case 'github':
        return await this.fetchGitHubUserInfo(accessToken);
      case 'google':
      case 'google_drive':
        return await this.fetchGoogleUserInfo(accessToken);
      case 'dropbox':
        return await this.fetchDropboxUserInfo(accessToken);
      case 'onedrive':
        return await this.fetchOneDriveUserInfo(accessToken);
      default:
        return {};
    }
  }

  /**
   * Fetch Figma user info
   */
  async fetchFigmaUserInfo(accessToken) {
    try {
      const response = await axios.get('https://api.figma.com/v1/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      return {
        id: response.data.id,
        username: response.data.handle,
        email: response.data.email,
        name: `${response.data.first_name || ''} ${response.data.last_name || ''}`.trim()
      };
    } catch (error) {
      console.error('Figma user info fetch error:', error.message);
      return {};
    }
  }

  /**
   * Fetch Slack user info
   */
  async fetchSlackUserInfo(accessToken) {
    try {
      const response = await axios.get('https://slack.com/api/auth.test', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      return {
        id: response.data.user_id,
        username: response.data.user,
        teamId: response.data.team_id,
        team: response.data.team
      };
    } catch (error) {
      console.error('Slack user info fetch error:', error.message);
      return {};
    }
  }

  /**
   * Fetch GitHub user info
   */
  async fetchGitHubUserInfo(accessToken) {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      return {
        id: response.data.id,
        username: response.data.login,
        email: response.data.email,
        name: response.data.name
      };
    } catch (error) {
      console.error('GitHub user info fetch error:', error.message);
      return {};
    }
  }

  /**
   * Fetch Google user info (for Google Drive)
   */
  async fetchGoogleUserInfo(accessToken) {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      return {
        id: response.data.id,
        username: response.data.email,
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture
      };
    } catch (error) {
      console.error('Google user info fetch error:', error.message);
      return {};
    }
  }

  /**
   * Fetch Dropbox user info
   */
  async fetchDropboxUserInfo(accessToken) {
    try {
      const response = await axios.post(
        'https://api.dropboxapi.com/2/users/get_current_account',
        null,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      return {
        id: response.data.account_id,
        username: response.data.email,
        email: response.data.email,
        name: response.data.name?.display_name
      };
    } catch (error) {
      console.error('Dropbox user info fetch error:', error.message);
      return {};
    }
  }

  /**
   * Fetch OneDrive / Microsoft user info
   */
  async fetchOneDriveUserInfo(accessToken) {
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      return {
        id: response.data.id,
        username: response.data.userPrincipalName || response.data.mail,
        email: response.data.mail || response.data.userPrincipalName,
        name: response.data.displayName
      };
    } catch (error) {
      console.error('OneDrive user info fetch error:', error.message);
      return {};
    }
  }

  /**
   * Encrypt a token using AES-256-GCM
   * @param {string} token - The plaintext token to encrypt
   * @returns {Buffer} Encrypted token as Buffer
   */
  encryptToken(token) {
    if (!token) return null;

    // Get encryption key from environment
    const encryptionKey = process.env.OAUTH_ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length < 32) {
      console.warn('⚠️  OAuth encryption key not set or too short. Tokens will be stored in plaintext!');
      console.warn('⚠️  Set OAUTH_ENCRYPTION_KEY environment variable (min 32 characters)');
      return null; // Fall back to plaintext storage
    }

    try {
      // Derive a 32-byte key from the encryption key
      const key = crypto.createHash('sha256').update(encryptionKey).digest();

      // Generate a random 16-byte initialization vector
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      // Encrypt the token
      let encrypted = cipher.update(token, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine IV + AuthTag + Encrypted Data
      // Format: [16 bytes IV][16 bytes Auth Tag][encrypted data]
      const result = Buffer.concat([iv, authTag, encrypted]);

      return result;
    } catch (error) {
      console.error('Token encryption error:', error.message);
      return null; // Fall back to plaintext on error
    }
  }

  /**
   * Decrypt an encrypted token
   * @param {Buffer} encryptedToken - The encrypted token as Buffer
   * @returns {string} Decrypted plaintext token
   */
  decryptToken(encryptedToken) {
    if (!encryptedToken) return null;

    // Get encryption key from environment
    const encryptionKey = process.env.OAUTH_ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length < 32) {
      console.error('⚠️  Cannot decrypt token: OAUTH_ENCRYPTION_KEY not set');
      return null;
    }

    try {
      // Derive the same 32-byte key
      const key = crypto.createHash('sha256').update(encryptionKey).digest();

      // Extract components from encrypted data
      // Format: [16 bytes IV][16 bytes Auth Tag][encrypted data]
      const iv = encryptedToken.slice(0, 16);
      const authTag = encryptedToken.slice(16, 32);
      const encrypted = encryptedToken.slice(32);

      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the token
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Token decryption error:', error.message);
      throw new Error('Failed to decrypt OAuth token');
    }
  }
}

// Singleton instance
const oauthManager = new OAuthManager();

module.exports = oauthManager;
