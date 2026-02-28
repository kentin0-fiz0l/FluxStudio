const { z } = require('zod');

const createConversationSchema = z.object({
  name: z.string().optional(),
  isGroup: z.boolean().optional(),
  memberUserIds: z.array(z.string().uuid()).optional(),
  organizationId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
});

const createMessageSchema = z.object({
  text: z.string().optional(),
  assetId: z.string().uuid().optional().nullable(),
  replyToMessageId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  isSystemMessage: z.boolean().optional(),
}).refine(data => data.text || data.assetId, {
  message: 'Either text or assetId is required',
});

module.exports = { createConversationSchema, createMessageSchema };
