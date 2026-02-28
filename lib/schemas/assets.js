const { z } = require('zod');

const createAssetSchema = z.object({
  fileId: z.string().uuid('Valid file ID is required'),
  name: z.string().min(1, 'Asset name is required'),
  kind: z.string().min(1, 'Asset kind is required'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.string().optional(),
  kind: z.string().optional(),
});

const createAssetVersionSchema = z.object({
  fileId: z.string().uuid('Valid file ID is required'),
  label: z.string().optional(),
  makePrimary: z.boolean().optional(),
});

const setPrimaryVersionSchema = z.object({
  versionId: z.string().uuid('Valid version ID is required'),
});

const linkProjectAssetSchema = z.object({
  assetId: z.string().uuid('Valid asset ID is required'),
  role: z.string().optional(),
  sortOrder: z.number().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

module.exports = { createAssetSchema, updateAssetSchema, createAssetVersionSchema, setPrimaryVersionSchema, linkProjectAssetSchema };
