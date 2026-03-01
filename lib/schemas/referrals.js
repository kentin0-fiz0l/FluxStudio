const { z } = require('zod');

const validateReferralCodeParamsSchema = z.object({
  code: z.string().min(1).max(20),
});

module.exports = {
  validateReferralCodeParamsSchema,
};
