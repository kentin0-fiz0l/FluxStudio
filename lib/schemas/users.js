const { z } = require('zod');

const updateUserSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  role: z.string().optional(),
  name: z.string().min(1, 'Name is required').optional(),
});

module.exports = { updateUserSchema };
