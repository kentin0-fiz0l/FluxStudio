const { z } = require('zod');

const aiFormationAnalyzeScreenshotSchema = z.object({
  image: z.string().min(1, 'Base64 image data is required'),
  formationId: z.string().optional(),
  analysisType: z.string().optional(),
  fieldWidth: z.number().positive().optional(),
  fieldHeight: z.number().positive().optional(),
  performerCount: z.number().int().positive().optional(),
  context: z.string().optional(),
});

module.exports = { aiFormationAnalyzeScreenshotSchema };
