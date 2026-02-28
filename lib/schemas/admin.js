const { z } = require('zod');

const createFeatureFlagSchema = z.object({
  name: z.string().min(1, 'Flag name is required'),
  key: z.string().min(1, 'Flag key is required'),
  description: z.string().optional(),
  isEnabled: z.boolean().optional().default(false),
  percentage: z.number().min(0).max(100).optional(),
});

const updateFeatureFlagSchema = z.object({
  name: z.string().min(1).optional(),
  key: z.string().min(1).optional(),
  description: z.string().optional(),
  isEnabled: z.boolean().optional(),
  percentage: z.number().min(0).max(100).optional(),
});

module.exports = { createFeatureFlagSchema, updateFeatureFlagSchema };
