const { z } = require('zod');

const lmsProviderParamsSchema = z.object({
  provider: z.enum(['google_classroom', 'canvas_lms'], {
    errorMap: () => ({ message: 'Invalid LMS provider. Must be google_classroom or canvas_lms' }),
  }),
});

const lmsConnectSchema = z.object({
  institutionUrl: z.string().url('institutionUrl must be a valid URL').optional(),
});

const lmsShareSchema = z.object({
  formationId: z.string().uuid('Invalid formation ID'),
  courseId: z.string().min(1, 'courseId is required'),
  title: z.string().min(1, 'title is required').max(500),
  embedUrl: z.string().url('embedUrl must be a valid URL').optional(),
});

const lmsCallbackQuerySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

module.exports = {
  lmsProviderParamsSchema,
  lmsConnectSchema,
  lmsShareSchema,
  lmsCallbackQuerySchema,
};
