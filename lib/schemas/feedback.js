const { z } = require('zod');

const submitFeedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'general'], { required_error: 'Feedback type is required' }),
  message: z.string().min(1, 'Feedback message is required'),
  page: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

module.exports = { submitFeedbackSchema };
