const { z } = require('zod');

const createFeatureFlagSchema = z.object({
  name: z.string().min(1, 'Flag name is required'),
  description: z.string().optional(),
  enabled: z.boolean().optional().default(false),
  rollout_percentage: z.number().min(0).max(100).optional(),
  user_allowlist: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
}).passthrough();

const updateFeatureFlagSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  rollout_percentage: z.number().min(0).max(100).optional(),
  user_allowlist: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
}).passthrough();

module.exports = { createFeatureFlagSchema, updateFeatureFlagSchema };
