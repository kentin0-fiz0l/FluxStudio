const { z } = require('zod');

const createBoardSchema = z.object({
  name: z.string().min(1, 'Board name is required'),
  description: z.string().optional(),
  organizationId: z.string().uuid().optional(),
});

const updateBoardSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isArchived: z.boolean().optional(),
  thumbnailAssetId: z.string().uuid().optional(),
});

const createNodeSchema = z.object({
  type: z.enum(['text', 'asset', 'shape'], { required_error: 'Node type is required' }),
  assetId: z.string().uuid().optional(),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().optional(),
  height: z.number().optional(),
  zIndex: z.number().default(0),
  rotation: z.number().default(0),
  locked: z.boolean().default(false),
  data: z.record(z.unknown()).default({}),
});

const bulkPositionSchema = z.object({
  updates: z.array(z.object({
    nodeId: z.string().uuid('Valid node ID is required'),
    x: z.number().optional(),
    y: z.number().optional(),
    zIndex: z.number().optional(),
    rotation: z.number().optional(),
  })).min(1, 'At least one update is required'),
});

module.exports = { createBoardSchema, updateBoardSchema, createNodeSchema, bulkPositionSchema };
