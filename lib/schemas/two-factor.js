const { z } = require('zod');

const twoFactorCodeSchema = z.object({
  code: z.string().min(1, 'Verification code is required'),
});

const twoFactorVerifySchema = z.object({
  tempToken: z.string().min(1, 'Temp token is required'),
  code: z.string().min(1, 'Verification code is required'),
});

module.exports = { twoFactorCodeSchema, twoFactorVerifySchema };
