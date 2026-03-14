/**
 * Zod schemas for Formation MCP tool inputs
 */
import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const RoomIdSchema = z
  .string()
  .regex(/^project-.+-formation-.+$/, 'Must be format: project-{projectId}-formation-{formationId}')
  .describe('Room ID in format: project-{projectId}-formation-{formationId}');

export const PositionSchema = z.object({
  x: z.number().min(0).max(100).describe('X position (0-100 normalized)'),
  y: z.number().min(0).max(100).describe('Y position (0-100 normalized)'),
});

// ============================================================================
// Read Tool Schemas
// ============================================================================

export const GetStateInputSchema = z.object({
  roomId: RoomIdSchema,
});

export const GetPerformersInputSchema = z.object({
  roomId: RoomIdSchema,
  keyframeId: z.string().optional().describe('Keyframe ID to get positions at (defaults to first keyframe)'),
});

export const GetAnalysisInputSchema = z.object({
  roomId: RoomIdSchema,
});

// ============================================================================
// Write Tool Schemas
// ============================================================================

export const SetPositionsInputSchema = z.object({
  roomId: RoomIdSchema,
  keyframeId: z.string().describe('Keyframe ID to set positions at'),
  positions: z.record(
    z.string(),
    PositionSchema,
  ).describe('Map of performerId to {x, y} positions'),
});

export const AddKeyframeInputSchema = z.object({
  roomId: RoomIdSchema,
  name: z.string().min(1).describe('Name for the new keyframe/set'),
  counts: z.number().int().positive().describe('Number of counts for the set'),
  afterKeyframeId: z.string().optional().describe('Insert after this keyframe (appends to end if omitted)'),
});

export const DistributeEvenlyInputSchema = z.object({
  roomId: RoomIdSchema,
  keyframeId: z.string().describe('Keyframe ID to distribute at'),
  performerIds: z.array(z.string()).min(1).describe('Performer IDs to distribute'),
  shape: z.enum(['line', 'arc', 'grid', 'circle']).describe('Geometric shape to distribute along'),
  params: z.object({
    start: PositionSchema.optional().describe('Start point (for line/arc)'),
    end: PositionSchema.optional().describe('End point (for line)'),
    center: PositionSchema.optional().describe('Center point (for arc/circle/grid)'),
    radius: z.number().positive().optional().describe('Radius (for arc/circle)'),
    startAngle: z.number().optional().describe('Start angle in degrees (for arc)'),
    endAngle: z.number().optional().describe('End angle in degrees (for arc)'),
    columns: z.number().int().positive().optional().describe('Number of columns (for grid)'),
    spacing: z.number().positive().optional().describe('Spacing between performers (for grid)'),
  }).describe('Shape-specific parameters'),
});

export const GenerateTransitionInputSchema = z.object({
  roomId: RoomIdSchema,
  fromKeyframeId: z.string().describe('Source keyframe ID'),
  toKeyframeId: z.string().describe('Target keyframe ID'),
  style: z.enum(['smooth', 'direct', 'sweeping']).describe('Transition style'),
});

export const ApplyTemplateInputSchema = z.object({
  roomId: RoomIdSchema,
  keyframeId: z.string().describe('Keyframe ID to apply template at'),
  templateName: z.enum([
    'company_front',
    'block',
    'wedge',
    'circle',
    'scatter',
    'diagonal',
  ]).describe('Named formation template'),
  performerIds: z.array(z.string()).optional().describe('Specific performers to apply to (defaults to all)'),
  params: z.object({
    center: PositionSchema.optional().describe('Center point for the formation'),
    scale: z.number().positive().optional().describe('Scale factor (default 1.0)'),
    rotation: z.number().optional().describe('Rotation in degrees'),
    spacing: z.number().positive().optional().describe('Spacing between performers'),
  }).optional().describe('Template parameters'),
});

export const MorphInputSchema = z.object({
  roomId: RoomIdSchema,
  keyframeId: z.string().describe('Keyframe ID to morph'),
  targetShape: z.enum(['line', 'arc', 'grid', 'circle', 'wedge', 'block']).describe('Target shape to morph toward'),
  morphFactor: z.number().min(0).max(1).describe('Morph amount: 0 = current, 1 = fully target shape'),
  params: z.object({
    center: PositionSchema.optional(),
    radius: z.number().positive().optional(),
    columns: z.number().int().positive().optional(),
    spacing: z.number().positive().optional(),
    start: PositionSchema.optional(),
    end: PositionSchema.optional(),
  }).optional().describe('Target shape parameters'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type GetStateInput = z.infer<typeof GetStateInputSchema>;
export type GetPerformersInput = z.infer<typeof GetPerformersInputSchema>;
export type GetAnalysisInput = z.infer<typeof GetAnalysisInputSchema>;
export type SetPositionsInput = z.infer<typeof SetPositionsInputSchema>;
export type AddKeyframeInput = z.infer<typeof AddKeyframeInputSchema>;
export type DistributeEvenlyInput = z.infer<typeof DistributeEvenlyInputSchema>;
export type GenerateTransitionInput = z.infer<typeof GenerateTransitionInputSchema>;
export type ApplyTemplateInput = z.infer<typeof ApplyTemplateInputSchema>;
export type MorphInput = z.infer<typeof MorphInputSchema>;
