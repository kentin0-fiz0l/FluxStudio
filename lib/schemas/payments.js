const { z } = require('zod');

const createCheckoutSessionSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  mode: z.enum(['subscription', 'payment']).optional().default('subscription'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  metadata: z.record(z.string()).optional().default({}),
});

const createPortalSessionSchema = z.object({
  returnUrl: z.string().url().optional(),
});

module.exports = { createCheckoutSessionSchema, createPortalSessionSchema };
