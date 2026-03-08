/**
 * AuthService - Domain service for authentication operations
 *
 * Extracts business logic from route handlers into a testable,
 * reusable service layer. Accepts only primitives/plain objects,
 * handles validation and authorization, returns standardized results.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createLogger } = require('../logger');
const log = createLogger('AuthService');

const { config } = require('../../config/environment');
const JWT_SECRET = config.JWT_SECRET;

// Lazy-load dependencies
let authAdapter = null;
let dbQuery = null;

function getAuthAdapter() {
  if (!authAdapter) {
    try {
      authAdapter = require('../../database/auth-adapter');
    } catch (e) {
      log.warn('Auth adapter not available');
    }
  }
  return authAdapter;
}

function getQuery() {
  if (!dbQuery) {
    try {
      const { query } = require('../../database/config');
      dbQuery = query;
    } catch (e) {
      log.warn('Database query not available');
    }
  }
  return dbQuery;
}

/**
 * Authenticate a user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function login(email, password) {
  try {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    const adapter = getAuthAdapter();
    if (!adapter) {
      return { success: false, error: 'Auth service not available' };
    }

    const user = await adapter.findUserByEmail(email);
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Generate access token
    const token = jwt.sign(
      { id: user.id, email: user.email, userType: user.userType || user.user_type, type: 'access' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    return {
      success: true,
      data: {
        token,
        accessToken: token,
        user: userWithoutPassword
      }
    };
  } catch (error) {
    log.error('Login error', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Register a new user
 * @param {Object} data - Registration data (email, password, name, userType)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function register(data) {
  try {
    const { email, password, name, userType = 'client' } = data;

    if (!email || !password || !name) {
      return { success: false, error: 'All fields are required' };
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    const validUserTypes = ['client', 'designer'];
    if (!validUserTypes.includes(userType)) {
      return { success: false, error: 'Invalid user type' };
    }

    const adapter = getAuthAdapter();
    if (!adapter) {
      return { success: false, error: 'Auth service not available' };
    }

    // Check if user exists
    const existingUser = await adapter.findUserByEmail(email);
    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await adapter.createUser({
      email,
      name,
      userType,
      password: hashedPassword,
      emailVerified: false,
    });

    // Generate token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, userType, type: 'access' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = newUser;

    return {
      success: true,
      data: {
        token,
        accessToken: token,
        user: userWithoutPassword
      }
    };
  } catch (error) {
    log.error('Register error', error);
    return { success: false, error: 'Registration failed' };
  }
}

/**
 * Validate and reissue a refresh token
 * @param {string} token - Refresh token to validate
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function refreshToken(token) {
  try {
    if (!token) {
      return { success: false, error: 'Refresh token is required' };
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return { success: false, error: 'Invalid or expired refresh token' };
    }

    if (decoded.type !== 'refresh') {
      return { success: false, error: 'Invalid token type' };
    }

    const adapter = getAuthAdapter();
    if (!adapter) {
      return { success: false, error: 'Auth service not available' };
    }

    const user = await adapter.findUserById(decoded.id);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Issue new access token
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, userType: user.userType || user.user_type, type: 'access' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Issue new refresh token
    const newRefreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return {
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    };
  } catch (error) {
    log.error('Refresh token error', error);
    return { success: false, error: 'Token refresh failed' };
  }
}

/**
 * Get the current user's profile
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function getCurrentUser(userId) {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    const adapter = getAuthAdapter();
    if (!adapter) {
      return { success: false, error: 'Auth service not available' };
    }

    const user = await adapter.findUserById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const { password: _, ...userWithoutPassword } = user;

    return { success: true, data: userWithoutPassword };
  } catch (error) {
    log.error('Get current user error', error);
    return { success: false, error: 'Failed to fetch user' };
  }
}

module.exports = {
  login,
  register,
  refreshToken,
  getCurrentUser,
};
