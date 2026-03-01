const { z } = require('zod');

const linkPreviewSchema = z.object({
  url: z.string().url('Must be a valid URL'),
});

const webCaptureSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  projectId: z.string().uuid('Must be a valid UUID'),
  boardId: z.string().uuid('Must be a valid UUID').optional().nullable(),
});

const pdfExportSchema = z.object({
  html: z.string().min(1, 'html is required'),
  css: z.string().optional().nullable(),
  projectId: z.string().uuid('Must be a valid UUID'),
  format: z.string().optional(),
  pageSize: z.string().optional(),
});

const thumbnailSchema = z.object({
  projectId: z.string().uuid('Must be a valid UUID'),
});

const designQaSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  baselineAssetId: z.string().uuid('Must be a valid UUID'),
  viewport: z.object({
    width: z.number().int().positive('Width must be a positive integer'),
    height: z.number().int().positive('Height must be a positive integer'),
  }).optional().nullable(),
  threshold: z.number().min(0).max(1).optional(),
});

module.exports = { linkPreviewSchema, webCaptureSchema, pdfExportSchema, thumbnailSchema, designQaSchema };
