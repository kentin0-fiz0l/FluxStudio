const { z } = require('zod');

const transcodeSchema = z.object({
  fileId: z.string().uuid('Must be a valid UUID'),
});

module.exports = { transcodeSchema };
