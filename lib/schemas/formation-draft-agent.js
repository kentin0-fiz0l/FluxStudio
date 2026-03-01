const { z } = require('zod');

const generateFormationSchema = z.object({
  formationId: z.string().uuid('Must be a valid UUID'),
  songId: z.string().uuid('Must be a valid UUID').optional(),
  showDescription: z.string().min(1, 'showDescription is required'),
  performerCount: z.number().int().positive('performerCount must be a positive integer'),
  constraints: z.record(z.unknown()).optional(),
});

const refineFormationSchema = z.object({
  instruction: z.string().min(1, 'instruction is required'),
});

const interruptFormationSchema = z.object({
  action: z.enum(['pause', 'cancel']),
});

module.exports = { generateFormationSchema, refineFormationSchema, interruptFormationSchema };
