const { z } = require('zod');

const updateNotificationPreferencesSchema = z.record(z.unknown());

module.exports = { updateNotificationPreferencesSchema };
