/**
 * Validation Middleware
 *
 * Simplified, composable validation system for FluxStudio API
 * Provides XSS protection, length limits, whitelist validation, and clear error messages
 *
 * @module middleware/validation
 */

const validator = require('validator');

// ============================================================================
// VALIDATION RULES - Centralized configuration
// ============================================================================

const VALIDATION_RULES = {
  project: {
    name: { required: true, maxLength: 200, fieldName: 'Project name' },
    description: { required: false, maxLength: 2000, fieldName: 'Description' },
    status: {
      whitelist: ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'],
      fieldName: 'Status'
    },
    priority: {
      whitelist: ['low', 'medium', 'high', 'urgent'],
      fieldName: 'Priority'
    },
    teamId: { uuid: true, fieldName: 'Team ID' }
  },
  task: {
    title: { required: true, maxLength: 500, fieldName: 'Task title' },
    description: { required: false, maxLength: 5000, fieldName: 'Description' },
    status: {
      whitelist: ['todo', 'in_progress', 'completed'],
      fieldName: 'Task status'
    },
    priority: {
      whitelist: ['low', 'medium', 'high'],
      fieldName: 'Task priority'
    },
    dueDate: { iso8601: true, fieldName: 'Due date' },
    assignedTo: { uuid: true, fieldName: 'Assigned user' }
  },
  milestone: {
    title: { required: true, maxLength: 300, fieldName: 'Milestone title' },
    description: { required: false, maxLength: 3000, fieldName: 'Description' },
    dueDate: { iso8601: true, fieldName: 'Due date' }
  }
};

// ============================================================================
// VALIDATION ERROR HANDLING - Centralized error response
// ============================================================================

/**
 * ValidationError - Custom error class for validation failures
 */
class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

/**
 * Creates a standardized validation error response
 * @param {string} message - Error message
 * @param {string} [field] - Field that failed validation
 * @returns {Object} Standardized error response
 */
function createValidationError(message, field = null) {
  const error = {
    success: false,
    error: message
  };

  if (field) {
    error.field = field;
  }

  return error;
}

/**
 * Express error handler for validation errors
 */
function validationErrorHandler(err, req, res, next) {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json(
      createValidationError(err.message, err.field)
    );
  }
  next(err);
}

// ============================================================================
// CORE VALIDATORS - Composable validation functions
// ============================================================================

/**
 * Validates that a value is a non-empty string
 * @param {*} value - Value to validate
 * @param {string} fieldName - Human-readable field name
 * @throws {ValidationError}
 */
function validateRequired(value, fieldName) {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required and must be a non-empty string`, fieldName);
  }
}

/**
 * Validates string length
 * @param {string} value - Value to validate
 * @param {number} maxLength - Maximum allowed length
 * @param {string} fieldName - Human-readable field name
 * @throws {ValidationError}
 */
function validateLength(value, maxLength, fieldName) {
  if (value && value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must be ${maxLength} characters or less`,
      fieldName
    );
  }
}

/**
 * Validates value against whitelist
 * @param {*} value - Value to validate
 * @param {Array} whitelist - Allowed values
 * @param {string} fieldName - Human-readable field name
 * @throws {ValidationError}
 */
function validateWhitelist(value, whitelist, fieldName) {
  if (value && !whitelist.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${whitelist.join(', ')}`,
      fieldName
    );
  }
}

/**
 * Validates UUID format
 * @param {string} value - Value to validate
 * @param {string} fieldName - Human-readable field name
 * @throws {ValidationError}
 */
function validateUUID(value, fieldName) {
  if (value && !validator.isUUID(value)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`, fieldName);
  }
}

/**
 * Validates ISO 8601 date format
 * @param {string} value - Value to validate
 * @param {string} fieldName - Human-readable field name
 * @throws {ValidationError}
 */
function validateISO8601(value, fieldName) {
  if (value && !validator.isISO8601(value)) {
    throw new ValidationError(
      `${fieldName} must be in ISO 8601 format (e.g., 2025-10-30T00:00:00Z)`,
      fieldName
    );
  }
}

/**
 * Sanitizes string input to prevent XSS attacks
 * Trims whitespace and escapes HTML entities
 * @param {string} value - Value to sanitize
 * @returns {string} Sanitized value
 */
function sanitizeString(value) {
  if (!value || typeof value !== 'string') {
    return value;
  }
  return validator.escape(validator.trim(value));
}

// ============================================================================
// FIELD VALIDATION - Validates and sanitizes individual fields
// ============================================================================

/**
 * Validates and sanitizes a single field based on rules
 * @param {*} value - Value to validate
 * @param {Object} rules - Validation rules
 * @param {string} fieldKey - Field key for req.body
 * @returns {*} Sanitized value
 * @throws {ValidationError}
 */
function validateField(value, rules, fieldKey) {
  const { required, maxLength, whitelist, uuid, iso8601, fieldName } = rules;

  // Required validation
  if (required) {
    validateRequired(value, fieldName);
  }

  // Skip further validation if value is undefined/null and not required
  if (!value && !required) {
    return value;
  }

  // Type validation for strings
  if (value !== undefined && value !== null && typeof value !== 'string' && (maxLength || required)) {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }

  // Sanitize string values
  let sanitizedValue = value;
  if (typeof value === 'string') {
    sanitizedValue = sanitizeString(value);
  }

  // Length validation (after sanitization)
  if (maxLength) {
    validateLength(sanitizedValue, maxLength, fieldName);
  }

  // Whitelist validation
  if (whitelist) {
    validateWhitelist(value, whitelist, fieldName);
  }

  // UUID validation
  if (uuid) {
    validateUUID(value, fieldName);
  }

  // ISO 8601 date validation
  if (iso8601) {
    validateISO8601(value, fieldName);
  }

  return sanitizedValue;
}

// ============================================================================
// SCHEMA VALIDATION - Validates entire request bodies
// ============================================================================

/**
 * Creates a validation middleware from a schema definition
 * @param {Object} schema - Validation schema (from VALIDATION_RULES)
 * @returns {Function} Express middleware function
 */
function createValidator(schema) {
  return function validatorMiddleware(req, res, next) {
    try {
      // Validate and sanitize each field in the schema
      for (const [fieldKey, rules] of Object.entries(schema)) {
        const value = req.body[fieldKey];
        const sanitizedValue = validateField(value, rules, fieldKey);

        // Update req.body with sanitized value
        if (sanitizedValue !== undefined) {
          req.body[fieldKey] = sanitizedValue;
        }
      }

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(error.statusCode).json(
          createValidationError(error.message, error.field)
        );
      }
      // Pass unexpected errors to error handler
      next(error);
    }
  };
}

// ============================================================================
// EXPORTED VALIDATORS - Ready-to-use middleware
// ============================================================================

/**
 * Validates project creation/update data
 * - Sanitizes name and description (XSS protection)
 * - Enforces length limits
 * - Validates status and priority whitelists
 * - Validates UUID format for teamId
 */
const validateProjectData = createValidator(VALIDATION_RULES.project);

/**
 * Validates task creation/update data
 * - Sanitizes title and description (XSS protection)
 * - Enforces length limits
 * - Validates status and priority whitelists
 * - Validates ISO 8601 date format
 * - Validates UUID format for assignedTo
 */
const validateTaskData = createValidator(VALIDATION_RULES.task);

/**
 * Validates milestone creation/update data
 * - Sanitizes title and description (XSS protection)
 * - Enforces length limits
 * - Validates ISO 8601 date format
 */
const validateMilestoneData = createValidator(VALIDATION_RULES.milestone);

// ============================================================================
// CUSTOM VALIDATORS - For special use cases
// ============================================================================

/**
 * Creates a custom validator from ad-hoc rules
 * Useful for one-off validation needs
 *
 * @param {Object} rules - Validation rules object
 * @returns {Function} Express middleware function
 *
 * @example
 * const validateCustom = createCustomValidator({
 *   email: { required: true, fieldName: 'Email address' },
 *   age: { fieldName: 'Age' }
 * });
 */
function createCustomValidator(rules) {
  return createValidator(rules);
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @param {string} [fieldName='Email'] - Field name for error messages
 * @throws {ValidationError}
 */
function validateEmail(email, fieldName = 'Email') {
  if (email && !validator.isEmail(email)) {
    throw new ValidationError(`${fieldName} must be a valid email address`, fieldName);
  }
}

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @param {string} [fieldName='URL'] - Field name for error messages
 * @throws {ValidationError}
 */
function validateURL(url, fieldName = 'URL') {
  if (url && !validator.isURL(url)) {
    throw new ValidationError(`${fieldName} must be a valid URL`, fieldName);
  }
}

// ============================================================================
// ASYNC VALIDATION SUPPORT
// ============================================================================

/**
 * Creates an async validator that supports asynchronous validation logic
 * @param {Function} asyncValidatorFn - Async validation function
 * @returns {Function} Express middleware function
 *
 * @example
 * const validateUniqueEmail = createAsyncValidator(async (req, res, next) => {
 *   const exists = await checkEmailExists(req.body.email);
 *   if (exists) throw new ValidationError('Email already registered');
 * });
 */
function createAsyncValidator(asyncValidatorFn) {
  return async function asyncValidatorMiddleware(req, res, next) {
    try {
      await asyncValidatorFn(req, res, next);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(error.statusCode).json(
          createValidationError(error.message, error.field)
        );
      }
      next(error);
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Ready-to-use validators
  validateProjectData,
  validateTaskData,
  validateMilestoneData,

  // Custom validator creators
  createValidator,
  createCustomValidator,
  createAsyncValidator,

  // Core validation functions (for unit testing)
  validateRequired,
  validateLength,
  validateWhitelist,
  validateUUID,
  validateISO8601,
  validateEmail,
  validateURL,

  // Utility functions
  sanitizeString,
  validateField,

  // Error handling
  ValidationError,
  validationErrorHandler,
  createValidationError,

  // Constants
  VALIDATION_RULES
};
