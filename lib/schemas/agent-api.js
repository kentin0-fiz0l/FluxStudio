const { z } = require('zod');

const agentChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(10000),
  sessionId: z.string().optional(),
  projectId: z.string().uuid('Must be a valid UUID').optional(),
});

const agentSessionSchema = z.object({
  projectId: z.string().uuid('Must be a valid UUID').optional(),
});

module.exports = { agentChatSchema, agentSessionSchema };
