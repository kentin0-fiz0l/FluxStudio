const { z } = require('zod');

const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  documentType: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  documentType: z.string().max(50).optional(),
  isArchived: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

module.exports = { createDocumentSchema, updateDocumentSchema };
