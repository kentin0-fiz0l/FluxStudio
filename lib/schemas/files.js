const { z } = require('zod');

const attachFileSchema = z.object({
  projectId: z.string().uuid('Must be a valid UUID'),
  role: z.enum(['reference', 'source', 'output', 'draft']).optional().default('reference'),
  notes: z.string().max(1000).optional(),
});

const attachFileByProjectSchema = z.object({
  fileId: z.string().uuid('Must be a valid UUID'),
  role: z.enum(['reference', 'source', 'output', 'draft']).optional().default('reference'),
  notes: z.string().max(1000).optional(),
});

module.exports = { attachFileSchema, attachFileByProjectSchema };
