const { z } = require('zod');

const mcpQuerySchema = z.object({
  query: z.string().min(1, 'Query is required').max(5000),
});

module.exports = { mcpQuerySchema };
