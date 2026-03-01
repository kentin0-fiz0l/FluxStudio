const { z } = require('zod');

const analyzeSongSchema = z.object({
  songId: z.string().uuid('Must be a valid UUID'),
  focus: z.enum(['all', 'structure', 'harmony', 'arrangement']).optional().default('all'),
});

const suggestChordsSchema = z.object({
  songId: z.string().uuid('Must be a valid UUID'),
  sectionId: z.string().uuid('Must be a valid UUID').optional(),
  style: z.string().max(100).optional(),
  request: z.string().max(500).optional(),
});

const practiceInsightsSchema = z.object({
  songId: z.string().uuid('Must be a valid UUID'),
});

module.exports = { analyzeSongSchema, suggestChordsSchema, practiceInsightsSchema };
