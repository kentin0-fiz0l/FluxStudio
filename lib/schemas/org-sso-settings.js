const { z } = require('zod');

const updateSSOSettingsSchema = z.object({
  idpSsoUrl: z.string().url('Valid SSO URL is required'),
  entityId: z.string().min(1, 'Entity ID is required'),
  idpCertificate: z.string().min(1, 'IDP certificate is required'),
  attributeMapping: z.record(z.string()).optional(),
  wantAssertionsSigned: z.boolean().optional(),
  autoProvision: z.boolean().optional(),
  defaultRole: z.string().optional(),
});

const testSSOConnectionSchema = z.object({
  url: z.string().url('Valid URL is required'),
});

const addSSODomainSchema = z.object({
  domain: z.string().min(1, 'Domain is required').regex(/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid domain format'),
});

module.exports = { updateSSOSettingsSchema, testSSOConnectionSchema, addSSODomainSchema };
