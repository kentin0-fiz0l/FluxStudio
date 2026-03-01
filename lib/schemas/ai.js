const { z } = require('zod');

const aiChatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  context: z.object({}).passthrough().optional(),
  conversationId: z.string().optional(),
  model: z.string().optional(),
});

const aiChatSyncSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  context: z.object({}).passthrough().optional(),
  model: z.string().optional(),
});

const aiDesignReviewSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  imageUrl: z.string().url().optional(),
  aspects: z.array(z.enum(['overall', 'accessibility', 'usability', 'layout', 'typography', 'color'])).optional(),
});

const aiGenerateCodeSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  componentType: z.string().optional().default('component'),
  style: z.string().optional().default('modern'),
});

const aiDesignFeedbackSchema = z.object({
  imageUrl: z.string().url('imageUrl is required'),
  context: z.object({
    projectType: z.string().optional(),
    industry: z.string().optional(),
    targetAudience: z.string().optional(),
    brandGuidelines: z.string().optional(),
    focusAreas: z.array(z.string()).optional(),
  }).optional(),
});

const aiGenerateProjectStructureSchema = z.object({
  description: z.string().min(10, 'Please provide a project description (at least 10 characters)'),
  category: z.string().optional(),
  complexity: z.enum(['starter', 'basic', 'advanced', 'enterprise']).optional(),
});

const aiGenerateTemplateSchema = z.object({
  description: z.string().min(10, 'Please provide a template description (at least 10 characters)'),
  category: z.string().optional(),
  complexity: z.enum(['starter', 'basic', 'advanced', 'enterprise']).optional(),
});

module.exports = {
  aiChatSchema,
  aiChatSyncSchema,
  aiDesignReviewSchema,
  aiGenerateCodeSchema,
  aiDesignFeedbackSchema,
  aiGenerateProjectStructureSchema,
  aiGenerateTemplateSchema,
};
