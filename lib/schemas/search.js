const { z } = require('zod');

const searchQuerySchema = z.object({
  q: z.string({ required_error: 'Search query is required' }).min(1, 'Search query is required').max(500),
  types: z.string().regex(/^[a-z,]+$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sortBy: z.enum(['relevance', 'date']).optional().default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

module.exports = {
  searchQuerySchema,
};
