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

const updateConversationSchema = z.object({
  name: z.string().max(200).optional(),
  isGroup: z.boolean().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
  role: z.enum(['member', 'admin', 'moderator']).optional(),
});

const markAsReadSchema = z.object({
  messageId: z.string().uuid('messageId must be a valid UUID'),
});

const muteConversationSchema = z.object({
  duration: z.number().int().min(0).max(8760).optional(), // max 1 year in hours
});

const archiveConversationSchema = z.object({
  archived: z.boolean().optional().default(true),
});

const markAsReadV2Schema = z.object({
  lastReadMessageId: z.string().uuid('lastReadMessageId must be a valid UUID'),
});

const editMessageSchema = z.object({
  text: z.string().min(1, 'Text content is required').max(10000, 'Message too long'),
});

module.exports = {
  createConversationSchema,
  createMessageSchema,
  updateConversationSchema,
  addMemberSchema,
  markAsReadSchema,
  muteConversationSchema,
  archiveConversationSchema,
  editMessageSchema,
  markAsReadV2Schema,
};
