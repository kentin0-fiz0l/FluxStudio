const { z } = require('zod');

const createCustomTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  type: z.string().min(1, 'Template type is required'),
  description: z.string().optional(),
  content: z.unknown().optional(),
  settings: z.record(z.unknown()).optional(),
});

module.exports = { createCustomTemplateSchema };
