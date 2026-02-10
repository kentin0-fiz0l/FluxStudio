/**
 * Environment Variable Validation for FluxStudio
 *
 * Validates required environment variables on startup and provides
 * helpful error messages for missing or invalid configuration.
 *
 * Usage:
 *   const { validateEnvironment } = require('./config/validateEnv');
 *   validateEnvironment(); // Throws if critical variables are missing
 */

const crypto = require('crypto');

/**
 * Environment variable specifications
 */
const ENV_SPECS = {
  // Required in all environments
  required: {
    // Security (auto-generated if missing in development)
    JWT_SECRET: {
      description: 'Secret key for JWT token signing',
      minLength: 32,
      autoGenerate: true
    }
  },

  // Required in production
  production: {
    DATABASE_URL: {
      description: 'PostgreSQL connection string',
      pattern: /^postgres(ql)?:\/\/.+/
    },
    JWT_SECRET: {
      description: 'Secret key for JWT token signing',
      minLength: 64,
      autoGenerate: false // Must be set in production
    },
    SESSION_SECRET: {
      description: 'Secret for session encryption',
      minLength: 32
    }
  },

  // Optional with defaults
  optional: {
    NODE_ENV: {
      default: 'development',
      allowed: ['development', 'production', 'test', 'staging']
    },
    PORT: {
      default: '3001',
      type: 'number'
    },
    REDIS_URL: {
      description: 'Redis connection URL for caching'
    },
    CORS_ORIGINS: {
      default: 'http://localhost:3000,http://localhost:5173'
    },
    RATE_LIMIT_WINDOW_MS: {
      default: '900000',
      type: 'number'
    },
    RATE_LIMIT_MAX_REQUESTS: {
      default: '100',
      type: 'number'
    },
    MAX_FILE_SIZE: {
      default: '52428800', // 50MB
      type: 'number'
    },
    LOG_LEVEL: {
      default: 'info',
      allowed: ['debug', 'info', 'warn', 'error']
    }
  },

  // OAuth (optional but validated if present)
  oauth: {
    GOOGLE_CLIENT_ID: {
      description: 'Google OAuth Client ID'
    },
    GOOGLE_CLIENT_SECRET: {
      description: 'Google OAuth Client Secret',
      sensitive: true
    },
    GITHUB_CLIENT_ID: {
      description: 'GitHub OAuth Client ID'
    },
    GITHUB_CLIENT_SECRET: {
      description: 'GitHub OAuth Client Secret',
      sensitive: true
    },
    FIGMA_CLIENT_ID: {
      description: 'Figma OAuth Client ID'
    },
    FIGMA_CLIENT_SECRET: {
      description: 'Figma OAuth Client Secret',
      sensitive: true
    },
    SLACK_CLIENT_ID: {
      description: 'Slack OAuth Client ID'
    },
    SLACK_CLIENT_SECRET: {
      description: 'Slack OAuth Client Secret',
      sensitive: true
    }
  },

  // Email (optional)
  email: {
    SMTP_HOST: {
      description: 'SMTP server hostname'
    },
    SMTP_PORT: {
      default: '587',
      type: 'number'
    },
    SMTP_USER: {
      description: 'SMTP username'
    },
    SMTP_PASS: {
      description: 'SMTP password',
      sensitive: true
    },
    EMAIL_FROM: {
      default: 'noreply@fluxstudio.art'
    }
  },

  // Monitoring (optional)
  monitoring: {
    SENTRY_DSN: {
      description: 'Sentry DSN for error tracking'
    }
  }
};

/**
 * Validation result
 */
class ValidationResult {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.generated = [];
  }

  addError(key, message) {
    this.errors.push({ key, message });
  }

  addWarning(key, message) {
    this.warnings.push({ key, message });
  }

  addGenerated(key, value) {
    this.generated.push({ key, value: value.substring(0, 16) + '...' });
  }

  get isValid() {
    return this.errors.length === 0;
  }
}

/**
 * Generate a secure random string
 */
function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Validate a single environment variable
 */
function validateVar(key, spec, result) {
  const value = process.env[key];

  // Check if present
  if (!value || value.trim() === '') {
    // Auto-generate if allowed
    if (spec.autoGenerate && process.env.NODE_ENV !== 'production') {
      const generated = generateSecret(spec.minLength || 32);
      process.env[key] = generated;
      result.addGenerated(key, generated);
      result.addWarning(key, `Auto-generated for development. Set in production!`);
      return true;
    }

    // Apply default if available
    if (spec.default !== undefined) {
      process.env[key] = spec.default;
      return true;
    }

    // Missing required variable
    result.addError(key, `Required: ${spec.description || 'No description'}`);
    return false;
  }

  // Validate pattern
  if (spec.pattern && !spec.pattern.test(value)) {
    result.addError(key, `Invalid format. ${spec.description || ''}`);
    return false;
  }

  // Validate minimum length
  if (spec.minLength && value.length < spec.minLength) {
    result.addError(key, `Must be at least ${spec.minLength} characters`);
    return false;
  }

  // Validate allowed values
  if (spec.allowed && !spec.allowed.includes(value)) {
    result.addError(key, `Must be one of: ${spec.allowed.join(', ')}`);
    return false;
  }

  // Validate type
  if (spec.type === 'number' && isNaN(parseInt(value))) {
    result.addError(key, `Must be a number`);
    return false;
  }

  return true;
}

/**
 * Validate all environment variables
 */
function validateEnvironment(options = {}) {
  const { throwOnError = true, logResults = true } = options;
  const result = new ValidationResult();
  const isProduction = process.env.NODE_ENV === 'production';

  console.log('\n' + '='.repeat(60));
  console.log('Environment Validation');
  console.log('='.repeat(60));
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Validate required variables
  for (const [key, spec] of Object.entries(ENV_SPECS.required)) {
    validateVar(key, spec, result);
  }

  // Validate production-specific variables
  if (isProduction) {
    for (const [key, spec] of Object.entries(ENV_SPECS.production)) {
      validateVar(key, spec, result);
    }
  }

  // Apply defaults for optional variables
  for (const [key, spec] of Object.entries(ENV_SPECS.optional)) {
    validateVar(key, spec, result);
  }

  // Validate OAuth if any are configured
  const oauthProviders = ['GOOGLE', 'GITHUB', 'FIGMA', 'SLACK'];
  for (const provider of oauthProviders) {
    const clientId = process.env[`${provider}_CLIENT_ID`];
    const clientSecret = process.env[`${provider}_CLIENT_SECRET`];

    if (clientId && !clientSecret) {
      result.addWarning(
        `${provider}_CLIENT_SECRET`,
        `${provider}_CLIENT_ID is set but ${provider}_CLIENT_SECRET is missing`
      );
    }
    if (clientSecret && !clientId) {
      result.addWarning(
        `${provider}_CLIENT_ID`,
        `${provider}_CLIENT_SECRET is set but ${provider}_CLIENT_ID is missing`
      );
    }
  }

  // Log results
  if (logResults) {
    if (result.generated.length > 0) {
      console.log('\nAuto-generated (development only):');
      for (const { key, value } of result.generated) {
        console.log(`  - ${key}: ${value}`);
      }
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      for (const { key, message } of result.warnings) {
        console.log(`  ⚠️  ${key}: ${message}`);
      }
    }

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      for (const { key, message } of result.errors) {
        console.log(`  ❌ ${key}: ${message}`);
      }
    }

    if (result.isValid) {
      console.log('\n✅ Environment validation passed');
    } else {
      console.log('\n❌ Environment validation failed');
    }

    console.log('='.repeat(60) + '\n');
  }

  // Throw or return
  if (throwOnError && !result.isValid) {
    const errorMessages = result.errors.map(e => `${e.key}: ${e.message}`).join('\n  ');
    throw new Error(`Environment validation failed:\n  ${errorMessages}`);
  }

  return result;
}

/**
 * Get sanitized environment info (safe for logging)
 */
function getEnvironmentInfo() {
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '3001',
    DATABASE_URL: process.env.DATABASE_URL ? '[CONFIGURED]' : '[NOT SET]',
    REDIS_URL: process.env.REDIS_URL ? '[CONFIGURED]' : '[NOT SET]',
    CORS_ORIGINS: process.env.CORS_ORIGINS || '[DEFAULT]',
    GOOGLE_OAUTH: process.env.GOOGLE_CLIENT_ID ? 'enabled' : 'disabled',
    GITHUB_OAUTH: process.env.GITHUB_CLIENT_ID ? 'enabled' : 'disabled',
    FIGMA_OAUTH: process.env.FIGMA_CLIENT_ID ? 'enabled' : 'disabled',
    SLACK_OAUTH: process.env.SLACK_CLIENT_ID ? 'enabled' : 'disabled',
    SMTP: process.env.SMTP_HOST ? 'configured' : 'not configured',
    SENTRY: process.env.SENTRY_DSN ? 'enabled' : 'disabled'
  };
}

/**
 * Check if a feature is enabled
 */
function isFeatureEnabled(feature) {
  const envVar = `ENABLE_${feature.toUpperCase()}`;
  return process.env[envVar] !== 'false';
}

module.exports = {
  validateEnvironment,
  getEnvironmentInfo,
  isFeatureEnabled,
  ENV_SPECS
};
