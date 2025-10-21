/**
 * TypeScript definitions for validation middleware
 * @module middleware/validation
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Validation rule configuration for a single field
 */
export interface ValidationRule {
  /** Field is required */
  required?: boolean;
  /** Maximum string length */
  maxLength?: number;
  /** Allowed values (enum validation) */
  whitelist?: string[];
  /** Must be valid UUID */
  uuid?: boolean;
  /** Must be valid ISO 8601 date */
  iso8601?: boolean;
  /** Human-readable field name for error messages */
  fieldName: string;
}

/**
 * Schema definition - map of field names to validation rules
 */
export interface ValidationSchema {
  [fieldName: string]: ValidationRule;
}

/**
 * Complete validation rules for all entities
 */
export interface ValidationRulesConfig {
  project: ValidationSchema;
  task: ValidationSchema;
  milestone: ValidationSchema;
}

/**
 * Standardized validation error response
 */
export interface ValidationErrorResponse {
  success: false;
  error: string;
  field?: string;
}

// ============================================================================
// VALIDATION ERROR CLASS
// ============================================================================

/**
 * Custom error class for validation failures
 */
export class ValidationError extends Error {
  name: 'ValidationError';
  field: string | null;
  statusCode: 400;

  constructor(message: string, field?: string | null);
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Creates a standardized validation error response
 */
export function createValidationError(
  message: string,
  field?: string | null
): ValidationErrorResponse;

/**
 * Express error handler for validation errors
 */
export function validationErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void;

/**
 * Validates that a value is a non-empty string
 * @throws {ValidationError}
 */
export function validateRequired(value: any, fieldName: string): void;

/**
 * Validates string length
 * @throws {ValidationError}
 */
export function validateLength(
  value: string,
  maxLength: number,
  fieldName: string
): void;

/**
 * Validates value against whitelist
 * @throws {ValidationError}
 */
export function validateWhitelist(
  value: any,
  whitelist: string[],
  fieldName: string
): void;

/**
 * Validates UUID format
 * @throws {ValidationError}
 */
export function validateUUID(value: string, fieldName: string): void;

/**
 * Validates ISO 8601 date format
 * @throws {ValidationError}
 */
export function validateISO8601(value: string, fieldName: string): void;

/**
 * Validates email format
 * @throws {ValidationError}
 */
export function validateEmail(email: string, fieldName?: string): void;

/**
 * Validates URL format
 * @throws {ValidationError}
 */
export function validateURL(url: string, fieldName?: string): void;

/**
 * Sanitizes string input to prevent XSS attacks
 */
export function sanitizeString(value: string): string;

/**
 * Validates and sanitizes a single field based on rules
 * @throws {ValidationError}
 */
export function validateField(
  value: any,
  rules: ValidationRule,
  fieldKey: string
): any;

// ============================================================================
// VALIDATOR CREATORS
// ============================================================================

/**
 * Creates a validation middleware from a schema definition
 */
export function createValidator(schema: ValidationSchema): RequestHandler;

/**
 * Creates a custom validator from ad-hoc rules
 *
 * @example
 * const validateCustom = createCustomValidator({
 *   email: { required: true, fieldName: 'Email address' },
 *   age: { fieldName: 'Age' }
 * });
 */
export function createCustomValidator(rules: ValidationSchema): RequestHandler;

/**
 * Async validator function signature
 */
export type AsyncValidatorFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Creates an async validator that supports asynchronous validation logic
 *
 * @example
 * const validateUniqueEmail = createAsyncValidator(async (req, res, next) => {
 *   const exists = await checkEmailExists(req.body.email);
 *   if (exists) throw new ValidationError('Email already registered');
 * });
 */
export function createAsyncValidator(
  asyncValidatorFn: AsyncValidatorFunction
): RequestHandler;

// ============================================================================
// READY-TO-USE VALIDATORS
// ============================================================================

/**
 * Validates project creation/update data
 * - Sanitizes name and description (XSS protection)
 * - Enforces length limits
 * - Validates status and priority whitelists
 * - Validates UUID format for teamId
 */
export const validateProjectData: RequestHandler;

/**
 * Validates task creation/update data
 * - Sanitizes title and description (XSS protection)
 * - Enforces length limits
 * - Validates status and priority whitelists
 * - Validates ISO 8601 date format
 * - Validates UUID format for assignedTo
 */
export const validateTaskData: RequestHandler;

/**
 * Validates milestone creation/update data
 * - Sanitizes title and description (XSS protection)
 * - Enforces length limits
 * - Validates ISO 8601 date format
 */
export const validateMilestoneData: RequestHandler;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Centralized validation rules configuration
 */
export const VALIDATION_RULES: ValidationRulesConfig;

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * @example Basic usage in Express routes
 * ```typescript
 * import { validateProjectData } from './middleware/validation';
 *
 * app.post('/api/projects',
 *   authenticateToken,
 *   validateProjectData,
 *   async (req, res) => {
 *     // req.body is now validated and sanitized
 *     const project = await createProject(req.body);
 *     res.json({ success: true, project });
 *   }
 * );
 * ```
 *
 * @example Custom validator
 * ```typescript
 * import { createCustomValidator } from './middleware/validation';
 *
 * const validateUserProfile = createCustomValidator({
 *   username: { required: true, maxLength: 50, fieldName: 'Username' },
 *   bio: { maxLength: 500, fieldName: 'Bio' },
 *   website: { fieldName: 'Website URL' }
 * });
 *
 * app.put('/api/profile', authenticateToken, validateUserProfile, handler);
 * ```
 *
 * @example Async validator
 * ```typescript
 * import { createAsyncValidator, ValidationError } from './middleware/validation';
 *
 * const validateUniqueUsername = createAsyncValidator(async (req, res, next) => {
 *   const { username } = req.body;
 *   const exists = await User.findOne({ username });
 *   if (exists) {
 *     throw new ValidationError('Username already taken', 'username');
 *   }
 *   next();
 * });
 * ```
 *
 * @example Using validation functions directly
 * ```typescript
 * import { validateEmail, validateURL, ValidationError } from './middleware/validation';
 *
 * async function processContact(data: any) {
 *   try {
 *     validateEmail(data.email, 'Contact email');
 *     validateURL(data.website, 'Website');
 *     // Process valid data
 *   } catch (error) {
 *     if (error instanceof ValidationError) {
 *       console.error(`Validation failed: ${error.message}`);
 *     }
 *   }
 * }
 * ```
 */
