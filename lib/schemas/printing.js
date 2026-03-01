const { z } = require('zod');

const VALID_MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'NYLON'];
const VALID_QUALITIES = ['draft', 'standard', 'high', 'ultra'];

const printFileLinkSchema = z.object({
  project_id: z.string().uuid('project_id is required'),
  file_id: z.string().uuid().optional(),
  metadata: z.object({}).passthrough().optional(),
  notes: z.string().max(1000).optional(),
});

const printJobLinkSchema = z.object({
  project_id: z.string().uuid('project_id is required'),
  file_id: z.string().uuid().optional(),
});

const printJobStatusSchema = z.object({
  status: z.string().min(1, 'status is required'),
  progress: z.number().min(0).max(100).optional(),
  error_message: z.string().optional(),
});

const printJobSyncSchema = z.object({
  status: z.string().min(1, 'status is required'),
  progress: z.number().min(0).max(100).optional(),
});

const quickPrintSchema = z.object({
  filename: z.string().min(1, 'filename is required'),
  projectId: z.string().uuid('projectId is required'),
  config: z.object({
    material: z.enum(VALID_MATERIALS, { errorMap: () => ({ message: `Invalid material. Valid: ${VALID_MATERIALS.join(', ')}` }) }),
    quality: z.enum(VALID_QUALITIES, { errorMap: () => ({ message: `Invalid quality preset. Valid: ${VALID_QUALITIES.join(', ')}` }) }),
    copies: z.number().int().min(1).optional(),
    supports: z.boolean().optional(),
    infill: z.number().min(0).max(100).optional(),
    notes: z.string().optional(),
  }),
});

const printEstimateSchema = z.object({
  filename: z.string().min(1, 'filename is required'),
  material: z.enum(VALID_MATERIALS, { errorMap: () => ({ message: `Invalid material. Valid: ${VALID_MATERIALS.join(', ')}` }) }),
  quality: z.enum(VALID_QUALITIES, { errorMap: () => ({ message: `Invalid quality preset. Valid: ${VALID_QUALITIES.join(', ')}` }) }),
  copies: z.number().int().min(1).optional(),
});

module.exports = {
  printFileLinkSchema,
  printJobLinkSchema,
  printJobStatusSchema,
  printJobSyncSchema,
  quickPrintSchema,
  printEstimateSchema,
};
