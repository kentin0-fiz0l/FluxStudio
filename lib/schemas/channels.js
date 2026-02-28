const { z } = require('zod');

const createChannelSchema = z.object({
  name: z.string().min(1, 'Channel name is required'),
  teamId: z.string().min(1, 'Team ID is required'),
  description: z.string().optional(),
});

const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  description: z.string().optional(),
});

module.exports = { createChannelSchema, createOrganizationSchema };
