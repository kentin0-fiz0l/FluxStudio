/**
 * Environment Configuration for FluxStudio
 * Validates and provides secure defaults for environment variables
 */

const crypto = require('crypto');

/**
 * Generate secure random string
 */
function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const required = ['JWT_SECRET'];
  const missing = [];

  for (const key of required) {
    if (!process.env[key] || process.env[key] === 'your-secret-key-change-in-production') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn('⚠️  Missing or insecure environment variables:', missing.join(', '));
    console.warn('⚠️  Using auto-generated secrets for development. Set proper values in production!');

    // Auto-generate secrets for development
    for (const key of missing) {
      process.env[key] = generateSecureSecret();
      console.warn(`⚠️  Auto-generated ${key}: ${process.env[key].substring(0, 16)}...`);
    }
  }
}

/**
 * Environment configuration object
 */
const config = {
  // Application
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_NAME: process.env.APP_NAME || 'FluxStudio',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173',

  // Ports
  AUTH_PORT: parseInt(process.env.PORT) || 3001,
  MESSAGING_PORT: parseInt(process.env.MESSAGING_PORT) || 3004,

  // Security
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  SESSION_SECRET: process.env.SESSION_SECRET || generateSecureSecret(),
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || generateSecureSecret(32),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,

  // CORS
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173,https://fluxstudio.art').split(','),

  // OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID,
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
  APPLE_KEY_ID: process.env.APPLE_KEY_ID,
  APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY,

  // File Upload
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB

  // Database (for future use)
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,

  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@fluxstudio.art',

  // Monitoring
  SENTRY_DSN: process.env.SENTRY_DSN,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_DIR: process.env.LOG_DIR || './logs',

  // Feature Flags
  ENABLE_REGISTRATION: process.env.ENABLE_REGISTRATION !== 'false',
  ENABLE_OAUTH: process.env.ENABLE_OAUTH !== 'false',
  ENABLE_FILE_UPLOAD: process.env.ENABLE_FILE_UPLOAD !== 'false',
  ENABLE_WEBSOCKET: process.env.ENABLE_WEBSOCKET !== 'false',

  // Maintenance
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true',
  MAINTENANCE_MESSAGE: process.env.MAINTENANCE_MESSAGE || 'We are currently performing maintenance. Please check back soon.',

  // Development helpers
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTesting: process.env.NODE_ENV === 'test'
};

/**
 * Initialize environment configuration
 */
function initializeEnvironment() {
  console.log(`🚀 Starting ${config.APP_NAME} in ${config.NODE_ENV} mode`);

  validateEnvironment();

  // CRITICAL FIX: Update config object with any auto-generated values
  // This ensures config.JWT_SECRET matches process.env.JWT_SECRET
  // after validateEnvironment() may have auto-generated missing secrets
  config.JWT_SECRET = process.env.JWT_SECRET;
  config.SESSION_SECRET = process.env.SESSION_SECRET || config.SESSION_SECRET;

  // Validate JWT_SECRET in production
  if (config.isProduction) {
    if (!config.JWT_SECRET || config.JWT_SECRET.length < 32) {
      console.error('❌ CRITICAL: JWT_SECRET is missing or too short in production!');
      console.error('❌ Set JWT_SECRET as an environment secret in DigitalOcean App Platform');
      // Don't throw in case auto-generated value works, but warn loudly
    } else {
      console.log('✅ JWT_SECRET is properly configured');
      console.log('   Secret prefix:', config.JWT_SECRET.substring(0, 8) + '...');
    }
  }

  // Log configuration (without sensitive data)
  if (config.isDevelopment) {
    const safeConfig = { ...config };
    delete safeConfig.JWT_SECRET;
    delete safeConfig.SESSION_SECRET;
    delete safeConfig.ENCRYPTION_KEY;
    delete safeConfig.GOOGLE_CLIENT_SECRET;
    delete safeConfig.APPLE_PRIVATE_KEY;
    delete safeConfig.SMTP_PASS;

    console.log('📋 Configuration:', JSON.stringify(safeConfig, null, 2));
  }

  return config;
}

/**
 * Maintenance mode middleware
 */
function maintenanceMode(req, res, next) {
  if (config.MAINTENANCE_MODE && !req.path.includes('/health')) {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: config.MAINTENANCE_MESSAGE,
      retryAfter: 3600 // 1 hour
    });
  }
  next();
}

module.exports = {
  config: initializeEnvironment(),
  generateSecureSecret,
  validateEnvironment,
  maintenanceMode
};