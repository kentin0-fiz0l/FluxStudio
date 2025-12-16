/**
 * API Validation Schemas
 *
 * Zod schemas for validating API request payloads.
 * Provides runtime type safety for all API calls.
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email format');

export const urlSchema = z.string().url('Invalid URL format').optional();

// ============================================================================
// Organization Schemas
// ============================================================================

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  website: urlSchema,
  logo: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

// ============================================================================
// Team Schemas
// ============================================================================

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  members: z.array(z.string().uuid()).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const updateTeamSchema = createTeamSchema.partial();

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

// ============================================================================
// Project Schemas
// ============================================================================

export const projectTypeSchema = z.enum([
  'design',
  'development',
  'marketing',
  'music',
  'video',
  'photography',
  'branding',
  'other',
]);

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  type: projectTypeSchema.optional().default('other'),
  organizationId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  templateId: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// ============================================================================
// File Schemas
// ============================================================================

export const fileMetadataSchema = z.object({
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  category: z.string().max(50).optional(),
  isPublic: z.boolean().optional(),
});

export type FileMetadataInput = z.infer<typeof fileMetadataSchema>;

// ============================================================================
// Messaging Schemas
// ============================================================================

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  content: z.string().min(1, 'Message content required').max(10000, 'Message too long'),
  replyToId: z.string().uuid().optional(),
  attachments: z.array(z.object({
    id: z.string(),
    type: z.enum(['image', 'file', 'link']),
    url: z.string().url(),
    name: z.string().optional(),
    size: z.number().optional(),
  })).max(10).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ============================================================================
// Printing Schemas
// ============================================================================

export const printConfigSchema = z.object({
  copies: z.number().int().min(1).max(100).optional().default(1),
  paperSize: z.enum(['A4', 'A3', 'Letter', 'Legal', 'Tabloid']).optional().default('A4'),
  orientation: z.enum(['portrait', 'landscape']).optional().default('portrait'),
  colorMode: z.enum(['color', 'grayscale', 'blackwhite']).optional().default('color'),
  quality: z.enum(['draft', 'normal', 'high']).optional().default('normal'),
  duplex: z.boolean().optional().default(false),
  margins: z.object({
    top: z.number().min(0).max(100).optional(),
    right: z.number().min(0).max(100).optional(),
    bottom: z.number().min(0).max(100).optional(),
    left: z.number().min(0).max(100).optional(),
  }).optional(),
});

export const quickPrintSchema = z.object({
  filename: z.string().min(1, 'Filename required').max(255, 'Filename too long'),
  projectId: z.string().uuid('Invalid project ID'),
  config: printConfigSchema.optional(),
});

export type PrintConfigInput = z.infer<typeof printConfigSchema>;
export type QuickPrintInput = z.infer<typeof quickPrintSchema>;

// ============================================================================
// Validation Helper
// ============================================================================

export class ValidationError extends Error {
  public readonly errors: z.ZodError['errors'];

  constructor(zodError: z.ZodError) {
    const message = zodError.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    super(`Validation failed: ${message}`);
    this.name = 'ValidationError';
    this.errors = zodError.errors;
  }
}

/**
 * Validate data against a schema
 * @throws ValidationError if validation fails
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}

/**
 * Validate data against a schema, returning null on failure
 */
export function validateSafe<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Create a validator function for a schema
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => validate(schema, data);
}
