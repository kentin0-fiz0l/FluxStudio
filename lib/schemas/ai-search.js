const { z } = require('zod');

const aiSearchInterpretSchema = z.object({
  query: z.string().min(1, 'query is required'),
});

const aiSearchSummarizeSchema = z.object({
  query: z.string().min(1, 'query is required'),
  results: z.array(z.record(z.unknown())).optional(),
});

module.exports = { aiSearchInterpretSchema, aiSearchSummarizeSchema };
