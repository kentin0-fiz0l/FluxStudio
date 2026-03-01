const { z } = require('zod');

const revokeSessionParamsSchema = z.object({
  id: z.string().uuid('Must be a valid UUID'),
});

module.exports = { revokeSessionParamsSchema };
