/**
 * Environment Configuration for FluxStudio
 * Validates and provides secure defaults for environment variables
 */

const crypto = require('crypto');
const { z } = require('zod');

/**
 * Generate secure random string
 */
function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

/** Coerce a string env var to an integer with a fallback default */
const intString = (fallback) =>
  z.string().optional().transform((v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  });

/** Boolean-ish env var: "true" => true, anything else => false */
const boolTrue = z.string().optional().transform((v) => v === 'true');

/** Boolean-ish env var: "false" => false, anything else => true */
const boolNotFalse = z.string().optional().transform((v) => v !== 'false');

/**
 * Base schema - always applied regardless of NODE_ENV.
 * Optional fields accept `undefined` and fall back to defaults in the config object.
 */
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Required (auto-generated in dev when missing)
  JWT_SECRET: z.string().optional(),

  // Optional with defaults applied later
  SESSION_SECRET: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_SUMMARIES_ENABLED: boolTrue,
  PORT: intString(3001),
  MESSAGING_PORT: intString(3004),
});

/**
 * Production-specific schema - stricter requirements.
 */
const productionEnvSchema = baseEnvSchema.extend({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters in production'),
  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET must be explicitly set in production')
    .refine((v) => v !== 'your-secret-key-change-in-production', {
      message: 'SESSION_SECRET must not be the placeholder value in production',
    }),
  DATABASE_URL: z.string().url('DATABASE_URL is required in production'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required in production'),
});

/**
 * Validate required environment variables using Zod
 */
function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const schema = isProduction ? productionEnvSchema : baseEnvSchema;

  const result = schema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues;
    console.error('Environment validation failed:');
    for (const issue of issues) {
      const path = issue.path.join('.') || '(root)';
      console.error(`  - ${path}: ${issue.message}`);
    }

    if (isProduction) {
      console.error('FATAL: Cannot start in production with invalid environment');
      process.exit(1);
    }
  }

  // Validate AI config consistency (cross-field check)
  if (process.env.AI_SUMMARIES_ENABLED === 'true' && !process.env.ANTHROPIC_API_KEY) {
    const msg = 'ANTHROPIC_API_KEY is required when AI_SUMMARIES_ENABLED is true';
    if (isProduction) {
      console.error(`FATAL: ${msg}`);
      process.exit(1);
    }
    throw new Error(msg);
  }

  // Auto-generate missing secrets in development/test
  const secretKeys = ['JWT_SECRET'];
  const missing = secretKeys.filter(
    (key) => !process.env[key] || process.env[key] === 'your-secret-key-change-in-production'
  );

  if (missing.length > 0) {
    console.warn('Missing or insecure environment variables:', missing.join(', '));
    console.warn('Using auto-generated secrets for development. Set proper values in production!');

    for (const key of missing) {
      process.env[key] = generateSecureSecret();
      console.warn(`Auto-generated ${key}: ${process.env[key].substring(0, 16)}...`);
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

  // AI Services
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  AI_SUMMARIES_ENABLED: process.env.AI_SUMMARIES_ENABLED === 'true',

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
    delete safeConfig.ANTHROPIC_API_KEY;

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