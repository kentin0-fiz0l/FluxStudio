const { z } = require('zod');

const connectorImportSchema = z.object({
  fileId: z.string().min(1, 'fileId is required'),
  projectId: z.string().uuid('Must be a valid UUID').optional(),
  organizationId: z.string().uuid('Must be a valid UUID').optional(),
});

const connectorLinkSchema = z.object({
  projectId: z.string().uuid('Must be a valid UUID'),
});

module.exports = { connectorImportSchema, connectorLinkSchema };
