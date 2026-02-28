const { z } = require('zod');

const updateNotificationPreferencesSchema = z.object({
  updates: z.record(z.unknown()),
});

module.exports = { updateNotificationPreferencesSchema };
