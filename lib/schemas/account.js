const { z } = require('zod');

const deleteAccountSchema = z.object({
  reason: z.string().max(1000, 'Reason must be 1000 characters or less').optional(),
});

module.exports = { deleteAccountSchema };
