const { z } = require('zod');

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').optional(),
  description: z.string().optional(),
});

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['admin', 'member', 'viewer']).optional(),
});

const updateTeamMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

module.exports = { createTeamSchema, updateTeamSchema, inviteTeamMemberSchema, updateTeamMemberRoleSchema };
