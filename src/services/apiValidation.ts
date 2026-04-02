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
// Formation Schemas
// ============================================================================

export const createFormationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  stageWidth: z.number().int().min(100).max(10000).optional(),
  stageHeight: z.number().int().min(100).max(10000).optional(),
  gridSize: z.number().int().min(1).max(200).optional(),
});

export const updateFormationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  stageWidth: z.number().int().min(100).max(10000).optional(),
  stageHeight: z.number().int().min(100).max(10000).optional(),
  gridSize: z.number().int().min(1).max(200).optional(),
  isArchived: z.boolean().optional(),
  audioTrack: z.object({
    id: z.string().optional(),
    url: z.string().url(),
    filename: z.string(),
    duration: z.number().min(0).optional(),
  }).nullable().optional(),
});

export const saveFormationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  performers: z.array(z.record(z.unknown())).optional(),
  keyframes: z.array(z.record(z.unknown())).optional(),
});

export const uploadAudioSchema = z.object({
  id: z.string().optional(),
  url: z.string().url('Invalid audio URL'),
  filename: z.string().min(1, 'Filename required').max(255, 'Filename too long'),
  duration: z.number().min(0).optional(),
});

export const addPerformerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  label: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional(),
  groupName: z.string().max(100).optional(),
});

export const updatePerformerSchema = addPerformerSchema.partial();

export const keyframeSchema = z.object({
  timestampMs: z.number().int().min(0).optional(),
  transition: z.string().max(50).optional(),
  duration: z.number().min(0).optional(),
});

export const setPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  rotation: z.number().min(-360).max(360).optional(),
});

export const createSceneObjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  type: z.string().min(1, 'Type is required').max(50),
  position: z.record(z.unknown()).optional(),
  source: z.record(z.unknown()).optional(),
  attachedToPerformerId: z.string().optional(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  layer: z.number().int().min(0).optional(),
});

export const updateSceneObjectSchema = createSceneObjectSchema.partial();

export type CreateFormationInput = z.infer<typeof createFormationSchema>;
export type UpdateFormationInput = z.infer<typeof updateFormationSchema>;
export type SaveFormationInput = z.infer<typeof saveFormationSchema>;
export type UploadAudioInput = z.infer<typeof uploadAudioSchema>;
export type AddPerformerInput = z.infer<typeof addPerformerSchema>;
export type UpdatePerformerInput = z.infer<typeof updatePerformerSchema>;
export type KeyframeInput = z.infer<typeof keyframeSchema>;
export type SetPositionInput = z.infer<typeof setPositionSchema>;
export type CreateSceneObjectInput = z.infer<typeof createSceneObjectSchema>;
export type UpdateSceneObjectInput = z.infer<typeof updateSceneObjectSchema>;

// ============================================================================
// Conversation Schemas
// ============================================================================

export const createConversationSchema = z.object({
  name: z.string().max(200).optional(),
  isGroup: z.boolean().optional(),
  memberUserIds: z.array(z.string().uuid()).optional(),
  organizationId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export const updateConversationSchema = z.object({
  name: z.string().max(200).optional(),
  isGroup: z.boolean().optional(),
});

export const createMessageSchema = z.object({
  text: z.string().max(10000).optional(),
  assetId: z.string().optional(),
  replyToMessageId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.string().max(50).optional(),
});

export const markAsReadSchema = z.object({
  lastReadMessageId: z.string().uuid('Invalid message ID'),
});

export const muteConversationSchema = z.object({
  duration: z.number().int().min(0).optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;

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
// Printing Extended Schemas
// ============================================================================

export const printFileLinkSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  file_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

export const printJobLinkSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  file_id: z.string().uuid().optional(),
});

export const printJobStatusUpdateSchema = z.object({
  status: z.enum(['queued', 'printing', 'completed', 'failed', 'cancelled']),
  progress: z.number().min(0).max(100).optional(),
  error_message: z.string().optional(),
});

export const printEstimateSchema = z.object({
  filename: z.string().min(1, 'Filename required'),
  material: z.enum(['PLA', 'PETG', 'ABS', 'TPU', 'NYLON']),
  quality: z.enum(['draft', 'standard', 'high', 'ultra']),
  copies: z.number().int().min(1).optional(),
});

export type PrintFileLinkInput = z.infer<typeof printFileLinkSchema>;
export type PrintJobLinkInput = z.infer<typeof printJobLinkSchema>;
export type PrintJobStatusUpdateInput = z.infer<typeof printJobStatusUpdateSchema>;
export type PrintEstimateInput = z.infer<typeof printEstimateSchema>;

// ============================================================================
// Messaging Extended Schemas
// ============================================================================

export const editMessageSchema = z.object({
  content: z.string().min(1, 'Content required').max(10000, 'Message too long'),
});

export const addReactionSchema = z.object({
  emoji: z.string().min(1, 'Emoji required').max(10, 'Emoji too long'),
});

export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type AddReactionInput = z.infer<typeof addReactionSchema>;

// ============================================================================
// API Response Schemas
// ============================================================================

/** Base API envelope used by all endpoints */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

/** Auth / user response */
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  userType: z.string(),
  avatar: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

/** Login / signup response */
export const authResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  user: userResponseSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

/** Payment subscription response */
export const subscriptionResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['active', 'canceled', 'past_due', 'trialing', 'incomplete', 'unpaid']),
  planId: z.string().optional(),
  planName: z.string().optional(),
  currentPeriodEnd: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;

/** Checkout session response */
export const checkoutSessionResponseSchema = z.object({
  sessionId: z.string().optional(),
  url: z.string().url().optional(),
});

export type CheckoutSessionResponse = z.infer<typeof checkoutSessionResponseSchema>;

/** Pricing plan */
export const pricingPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  priceMonthly: z.number(),
  priceAnnual: z.number().optional(),
  features: z.array(z.string()).optional(),
  stripePriceId: z.string().optional(),
});

export const pricingResponseSchema = z.object({
  plans: z.array(pricingPlanSchema),
});

export type PricingPlan = z.infer<typeof pricingPlanSchema>;
export type PricingResponse = z.infer<typeof pricingResponseSchema>;

/** Portal session response */
export const portalSessionResponseSchema = z.object({
  url: z.string().url(),
});

export type PortalSessionResponse = z.infer<typeof portalSessionResponseSchema>;

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
