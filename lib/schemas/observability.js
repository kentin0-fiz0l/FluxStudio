const { z } = require('zod');

const observabilityEventsSchema = z.object({
  events: z.array(
    z.object({
      name: z.string().min(1, 'Event name is required'),
      sessionId: z.string().optional(),
      properties: z.record(z.unknown()).optional(),
      timestamp: z.string().optional(),
    })
  ).min(1, 'events must be a non-empty array').max(50, 'Maximum 50 events per batch'),
});

const singleVitalSchema = z.object({
  name: z.string().min(1),
  value: z.number(),
  id: z.string().min(1),
  rating: z.string().optional(),
  url: z.string().optional(),
  timestamp: z.string().optional(),
});

const batchVitalSchema = z.object({
  sessionId: z.string().min(1),
  url: z.string().optional(),
  vitals: z.record(z.number().nullable()).refine(val => val !== null && val !== undefined, { message: 'vitals is required' }),
  viewport: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  connectionType: z.string().optional(),
  userAgent: z.string().optional(),
  performanceScore: z.number().optional(),
});

const vitalsSchema = z.union([singleVitalSchema, batchVitalSchema]);

module.exports = { observabilityEventsSchema, vitalsSchema };
