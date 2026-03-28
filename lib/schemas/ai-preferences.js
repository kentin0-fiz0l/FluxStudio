const { z } = require('zod');

const setAiPreferenceSchema = z.object({
  key: z.string().min(1).max(100, 'Preference key must be at most 100 characters'),
  value: z.unknown(),
});

const aiPreferenceFeedbackSchema = z.object({
  suggestionType: z.string().min(1, 'suggestionType is required'),
  accepted: z.boolean({ required_error: 'accepted is required' }),
  context: z.record(z.unknown()).optional(),
});

module.exports = { setAiPreferenceSchema, aiPreferenceFeedbackSchema };
