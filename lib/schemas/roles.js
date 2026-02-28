const { z } = require('zod');

const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  slug: z.string().min(1, 'Role slug is required'),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

module.exports = { createRoleSchema, updateRoleSchema };
