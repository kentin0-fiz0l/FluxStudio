const { z } = require('zod');

const deleteAccountComplianceSchema = z.object({
  reason: z.string().max(1000).optional(),
});

const updateConsentsSchema = z.object({
  consents: z.record(z.unknown()),
});

module.exports = { deleteAccountComplianceSchema, updateConsentsSchema };
