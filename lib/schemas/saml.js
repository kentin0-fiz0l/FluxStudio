const { z } = require('zod');

const samlAcsSchema = z.object({
  SAMLResponse: z.string().min(1, 'SAMLResponse is required'),
  RelayState: z.string().optional(),
});

module.exports = { samlAcsSchema };
