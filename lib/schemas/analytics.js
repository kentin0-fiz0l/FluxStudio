const { z } = require('zod');

const ingestEventSchema = z.object({
  eventName: z.string().min(1, 'eventName is required'),
  properties: z.record(z.unknown()).optional(),
  sessionId: z.string().optional(),
});

module.exports = { ingestEventSchema };
