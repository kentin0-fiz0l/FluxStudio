const { z } = require('zod');

const aiDesignAnalyzeStreamSchema = z.object({
  imageUrl: z.string().url().optional(),
  designElements: z.array(z.record(z.unknown())).optional(),
  context: z.string().optional(),
});

const aiDesignPaletteStreamSchema = z.object({
  industry: z.string().optional(),
  mood: z.array(z.string()).optional(),
  brand: z.string().optional(),
});

const aiDesignLayoutStreamSchema = z.object({
  elements: z.array(z.record(z.unknown())),
  viewport: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
});

const aiDesignAccessibilityStreamSchema = z.object({
  designData: z.record(z.unknown()),
});

module.exports = {
  aiDesignAnalyzeStreamSchema,
  aiDesignPaletteStreamSchema,
  aiDesignLayoutStreamSchema,
  aiDesignAccessibilityStreamSchema,
};
