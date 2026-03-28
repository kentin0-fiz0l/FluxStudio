const { z } = require('zod');

const joinBetaWaitlistSchema = z.object({
  email: z.string().email('A valid email is required'),
  name: z.string().max(200).optional(),
  role: z.enum(['band_director', 'drill_writer', 'color_guard', 'educator', 'other']).optional(),
  organization: z.string().max(200).optional(),
});

const inviteBetaUserSchema = z.object({
  email: z.string().email('A valid email is required'),
});

module.exports = { joinBetaWaitlistSchema, inviteBetaUserSchema };
