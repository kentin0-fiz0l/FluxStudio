const { z } = require('zod');

const submitTicketSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  category: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
});

module.exports = { submitTicketSchema };
