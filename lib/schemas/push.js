const { z } = require('zod');

const pushSubscribeSchema = z.object({
  endpoint: z.string().url('Valid endpoint URL is required'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'Auth key is required'),
  }),
});

const pushUnsubscribeSchema = z.object({
  endpoint: z.string().min(1, 'Endpoint is required'),
});

const pushPreferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  pushMessages: z.boolean().optional(),
  pushProjectUpdates: z.boolean().optional(),
  pushMentions: z.boolean().optional(),
  pushComments: z.boolean().optional(),
  quietHoursStart: z.string().nullable().optional(),
  quietHoursEnd: z.string().nullable().optional(),
});

module.exports = { pushSubscribeSchema, pushUnsubscribeSchema, pushPreferencesSchema };
