/**
 * Assets Routes - Reusable Creative Elements API
 *
 * Provides endpoints for:
 * - Asset CRUD operations
 * - Asset versioning
 * - Asset-project relationships
 * - File streaming
 * - Asset statistics
 *
 * All endpoints require authentication.
 */

const express = require('express');
const multer = require('multer');
const { createLogger } = require('../lib/logger');
const log = createLogger('Assets');
const { authenticateToken } = require('../lib/auth/middleware');
const { zodValidate } = require('../middleware/zodValidate');
const { createAssetSchema, updateAssetSchema, createAssetVersionSchema, setPrimaryVersionSchema, linkProjectAssetSchema } = require('../lib/schemas/assets');
const assetsAdapter = require('../database/assets-adapter');
const { determineAssetKind } = require('../database/assets-adapter');
const filesAdapter = require('../database/files-adapter');
const fileStorage = require('../storage');

const router = express.Router();

// Configure multer for file uploads
const fileUploadStorage = multer.memoryStorage();
const fileUpload = multer({
  storage: fileUploadStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10
  }
});

/**
 * GET /api/assets
 * List assets with filtering
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, kind, status, limit = 50, offset = 0 } = req.query;

    const result = await assetsAdapter.listAssets({
      ownerId: req.user.id,
      search,
      kind,
      status: status || 'active',
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    res.json({
      success: true,
      assets: result.assets,
      total: result.total
    });
  } catch (error) {
    log.error('Error listing assets', error);
    res.status(500).json({ success: false, error: 'Failed to list assets', code: 'ASSET_LIST_ERROR' });
  }
});

/**
 * GET /api/assets/stats
 * Get asset statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await assetsAdapter.getAssetStats(req.user.id);
    res.json({ success: true, stats });
  } catch (error) {
    log.error('Error getting asset stats', error);
    res.status(500).json({ success: false, error: 'Failed to get stats', code: 'ASSET_STATS_ERROR' });
  }
});

/**
 * POST /api/assets
 * Create asset from existing file
 */
router.post('/', authenticateToken, zodValidate(createAssetSchema), async (req, res) => {
  try {
    const { fileId, name, kind, description, tags } = req.body;

    if (!fileId) {
      return res.status(400).json({ success: false, error: 'fileId is required', code: 'ASSET_MISSING_FILE_ID' });
    }

    // Get the file to inherit properties
    const file = await filesAdapter.getFileById(fileId, req.user.id);
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found', code: 'ASSET_FILE_NOT_FOUND' });
    }

    // Infer kind from mime type if not provided
    const assetKind = kind || determineAssetKind(file.mimeType);

    // Create the asset
    const asset = await assetsAdapter.createAsset({
      organizationId: file.organizationId,
      ownerId: req.user.id,
      name: name || file.name,
      kind: assetKind,
      primaryFileId: fileId,
      description: description || null,
      tags: tags || []
    });

    // Create initial version (version 1)
    await assetsAdapter.createAssetVersion({
      assetId: asset.id,
      fileId: fileId,
      label: 'Initial version',
      format: file.extension,
      width: file.width || null,
      height: file.height || null,
      durationMs: file.duration || null
    });

    // Refetch asset with versions
    const fullAsset = await assetsAdapter.getAssetById(asset.id);

    res.status(201).json({ success: true, asset: fullAsset });
  } catch (error) {
    log.error('Error creating asset', error);
    res.status(500).json({ success: false, error: 'Failed to create asset', code: 'ASSET_CREATE_ERROR' });
  }
});

/**
 * GET /api/assets/:assetId
 * Get detailed asset info
 */
router.get('/:assetId', authenticateToken, async (req, res) => {
  try {
    const { assetId } = req.params;

    const asset = await assetsAdapter.getAssetById(assetId);

    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found', code: 'ASSET_NOT_FOUND' });
    }

    res.json({ success: true, asset });
  } catch (error) {
    log.error('Error getting asset', error);
    res.status(500).json({ success: false, error: 'Failed to get asset', code: 'ASSET_GET_ERROR' });
  }
});

/**
 * PATCH /api/assets/:assetId
 * Update asset metadata
 */
router.patch('/:assetId', authenticateToken, zodValidate(updateAssetSchema), async (req, res) => {
  try {
    const { assetId } = req.params;
    const { name, description, tags, status, kind } = req.body;

    const asset = await assetsAdapter.updateAssetMetadata(assetId, {
      name,
      description,
      tags,
      status,
      kind
    });

    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found', code: 'ASSET_NOT_FOUND' });
    }

    res.json({ success: true, asset });
  } catch (error) {
    log.error('Error updating asset', error);
    res.status(500).json({ success: false, error: 'Failed to update asset', code: 'ASSET_UPDATE_ERROR' });
  }
});

/**
 * DELETE /api/assets/:assetId
 * Delete asset
 */
router.delete('/:assetId', authenticateToken, async (req, res) => {
  try {
    const { assetId } = req.params;

    const success = await assetsAdapter.deleteAsset(assetId);

    if (!success) {
      return res.status(404).json({ success: false, error: 'Asset not found', code: 'ASSET_NOT_FOUND' });
    }

    res.json({ success: true });
  } catch (error) {
    log.error('Error deleting asset', error);
    res.status(500).json({ success: false, error: 'Failed to delete asset', code: 'ASSET_DELETE_ERROR' });
  }
});

/**
 * POST /api/assets/:assetId/versions
 * Create new version
 */
router.post('/:assetId/versions', authenticateToken, zodValidate(createAssetVersionSchema), async (req, res) => {
  try {
    const { assetId } = req.params;
    const { fileId, label, makePrimary } = req.body;

    if (!fileId) {
      return res.status(400).json({ success: false, error: 'fileId is required', code: 'ASSET_MISSING_FILE_ID' });
    }

    // Get file info for version metadata
    const file = await filesAdapter.getFileById(fileId, req.user.id);
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found', code: 'ASSET_FILE_NOT_FOUND' });
    }

    const version = await assetsAdapter.createAssetVersion({
      assetId,
      fileId,
      label: label || null,
      format: file.extension,
      width: file.width || null,
      height: file.height || null,
      durationMs: file.duration || null
    });

    // Optionally update primary file
    if (makePrimary) {
      await assetsAdapter.setPrimaryAssetVersion(assetId, version.id);
    }

    res.status(201).json({ success: true, version });
  } catch (error) {
    log.error('Error creating version', error);
    res.status(500).json({ success: false, error: 'Failed to create version', code: 'ASSET_CREATE_VERSION_ERROR' });
  }
});

/**
 * POST /api/assets/:assetId/primary
 * Set primary version
 */
router.post('/:assetId/primary', authenticateToken, zodValidate(setPrimaryVersionSchema), async (req, res) => {
  try {
    const { assetId } = req.params;
    const { versionId } = req.body;

    if (!versionId) {
      return res.status(400).json({ success: false, error: 'versionId is required', code: 'ASSET_MISSING_VERSION_ID' });
    }

    await assetsAdapter.setPrimaryAssetVersion(assetId, versionId);

    // Return updated asset
    const asset = await assetsAdapter.getAssetById(assetId);
    res.json({ success: true, asset });
  } catch (error) {
    log.error('Error setting primary version', error);
    res.status(500).json({ success: false, error: 'Failed to set primary version', code: 'ASSET_SET_PRIMARY_ERROR' });
  }
});

/**
 * GET /api/assets/:assetId/versions
 * Get versions list
 */
router.get('/:assetId/versions', authenticateToken, async (req, res) => {
  try {
    const { assetId } = req.params;

    const versions = await assetsAdapter.getAssetVersions(assetId);
    res.json({ success: true, versions });
  } catch (error) {
    log.error('Error getting versions', error);
    res.status(500).json({ success: false, error: 'Failed to get versions', code: 'ASSET_GET_VERSIONS_ERROR' });
  }
});

/**
 * GET /api/assets/:assetId/projects
 * Get projects using this asset
 */
router.get('/:assetId/projects', authenticateToken, async (req, res) => {
  try {
    const { assetId } = req.params;

    const projects = await assetsAdapter.getAssetProjects(assetId);
    res.json({ success: true, projects });
  } catch (error) {
    log.error('Error getting asset projects', error);
    res.status(500).json({ success: false, error: 'Failed to get projects', code: 'ASSET_GET_PROJECTS_ERROR' });
  }
});

/**
 * GET /api/assets/:assetId/file
 * Stream the asset's primary file content
 * Use ?thumbnail=true for thumbnail preview, ?inline=true to display in browser
 */
router.get('/:assetId/file', authenticateToken, async (req, res) => {
  try {
    const { assetId } = req.params;
    const { thumbnail, inline } = req.query;

    // Get asset with file info
    const asset = await assetsAdapter.getAssetById(assetId);
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found', code: 'ASSET_NOT_FOUND' });
    }

    if (!asset.file) {
      return res.status(404).json({ success: false, error: 'Asset has no file', code: 'ASSET_NO_FILE' });
    }

    // Determine which file to serve (thumbnail or original)
    let storageKey;
    let mimeType = asset.file.mimeType;

    if (thumbnail === 'true' && asset.file.thumbnailUrl) {
      storageKey = asset.file.thumbnailUrl.replace('/files/storage/', '').replace('/files/', '');
    } else if (asset.file.storageKey) {
      storageKey = asset.file.storageKey;
    } else if (asset.file.url) {
      storageKey = asset.file.url.replace('/files/storage/', '').replace('/files/', '');
    } else {
      return res.status(404).json({ success: false, error: 'File storage key not found', code: 'ASSET_STORAGE_KEY_NOT_FOUND' });
    }

    // Check if file exists
    const exists = await fileStorage.exists(storageKey);
    if (!exists) {
      return res.status(404).json({ success: false, error: 'File not found in storage', code: 'ASSET_FILE_NOT_IN_STORAGE' });
    }

    // Get file stream
    const stream = await fileStorage.getFileStream(storageKey);

    // Set headers
    res.setHeader('Content-Type', mimeType || 'application/octet-stream');

    if (inline === 'true') {
      res.setHeader('Content-Disposition', `inline; filename="${asset.file.name || 'file'}"`);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${asset.file.name || 'file'}"`);
    }

    res.setHeader('Cache-Control', 'private, max-age=3600');

    stream.pipe(res);
  } catch (error) {
    log.error('Error serving asset file', error);
    res.status(500).json({ success: false, error: 'Failed to serve asset file', code: 'ASSET_SERVE_FILE_ERROR' });
  }
});

/**
 * POST /api/projects/:projectId/assets
 * Upload files as assets OR attach existing asset
 */
router.post('/projects/:projectId/assets', authenticateToken, zodValidate(linkProjectAssetSchema), fileUpload.array('files', 10), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { assetId, role = 'reference', sortOrder = 0, description, tags } = req.body;

    // Case 1: Attach existing asset (no files uploaded)
    if (!req.files || req.files.length === 0) {
      if (!assetId) {
        return res.status(400).json({ success: false, error: 'Either files or assetId is required', code: 'ASSET_MISSING_INPUT' });
      }

      await assetsAdapter.attachAssetToProject({
        assetId,
        projectId,
        role,
        sortOrder: parseInt(sortOrder) || 0
      });

      return res.json({ success: true, message: 'Asset attached to project' });
    }

    // Case 2: Upload files and create assets
    const createdAssets = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // 1. Save file to storage
        const storageResult = await fileStorage.saveFile({
          buffer: file.buffer,
          mimeType: file.mimetype,
          userId: req.user.id,
          originalName: file.originalname
        });

        // 2. Create file record
        const fileRecord = await filesAdapter.createFile({
          userId: req.user.id,
          projectId,
          source: 'upload',
          name: file.originalname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          extension: storageResult.extension,
          sizeBytes: storageResult.sizeBytes,
          storageKey: storageResult.storageKey,
          fileUrl: `/files/storage/${storageResult.storageKey}`,
          metadata: { hash: storageResult.hash }
        });

        // 3. Generate thumbnail for images
        if (file.mimetype.startsWith('image/')) {
          try {
            const previewResult = await fileStorage.savePreview({
              buffer: file.buffer,
              mimeType: file.mimetype,
              fileId: fileRecord.id,
              previewType: 'thumbnail'
            });

            await filesAdapter.createPreview({
              fileId: fileRecord.id,
              previewType: 'thumbnail',
              storageKey: previewResult.storageKey,
              mimeType: file.mimetype,
              sizeBytes: previewResult.sizeBytes,
              status: 'completed'
            });

            fileRecord.thumbnailUrl = `/files/storage/${previewResult.storageKey}`;
          } catch (previewError) {
            log.error('Preview generation error', previewError);
          }
        }

        // 4. Determine asset kind from mime type
        const kind = determineAssetKind(file.mimetype);

        // 5. Parse tags from request
        let parsedTags = [];
        if (tags) {
          try {
            parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
          } catch (e) {
            parsedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : [];
          }
        }

        // 6. Create asset
        const asset = await assetsAdapter.createAsset({
          ownerId: req.user.id,
          name: file.originalname,
          kind,
          primaryFileId: fileRecord.id,
          description: description || null,
          tags: parsedTags
        });

        // 7. Attach asset to project
        await assetsAdapter.attachAssetToProject({
          assetId: asset.id,
          projectId,
          role: role || 'reference',
          sortOrder: parseInt(sortOrder) || createdAssets.length
        });

        // Add file info to asset response
        asset.file = {
          id: fileRecord.id,
          name: fileRecord.name,
          mimeType: fileRecord.mimeType,
          size: fileRecord.sizeBytes,
          url: fileRecord.fileUrl,
          thumbnailUrl: fileRecord.thumbnailUrl
        };

        createdAssets.push(asset);
      } catch (fileError) {
        log.error('Error processing file', fileError, { filename: file.originalname });
        errors.push({ filename: file.originalname, error: fileError.message });
      }
    }

    if (createdAssets.length === 0 && errors.length > 0) {
      return res.status(500).json({ success: false, error: 'Failed to create assets', code: 'ASSET_BATCH_CREATE_ERROR', errors });
    }

    res.json({
      success: true,
      assets: createdAssets,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    log.error('Error creating/attaching project assets', error);
    res.status(500).json({ success: false, error: 'Failed to process assets', code: 'ASSET_PROCESS_ERROR' });
  }
});

/**
 * DELETE /api/projects/:projectId/assets/:assetId
 * Detach asset from project
 */
router.delete('/projects/:projectId/assets/:assetId', authenticateToken, async (req, res) => {
  try {
    const { projectId, assetId } = req.params;

    await assetsAdapter.detachAssetFromProject({ assetId, projectId });

    res.json({ success: true, message: 'Asset detached from project' });
  } catch (error) {
    log.error('Error detaching asset from project', error);
    res.status(500).json({ success: false, error: 'Failed to detach asset', code: 'ASSET_DETACH_ERROR' });
  }
});

/**
 * GET /api/projects/:projectId/assets
 * Get assets for a project
 */
router.get('/projects/:projectId/assets', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const assets = await assetsAdapter.getProjectAssets(projectId);
    res.json({ success: true, assets });
  } catch (error) {
    log.error('Error getting project assets', error);
    res.status(500).json({ success: false, error: 'Failed to get project assets', code: 'ASSET_GET_PROJECT_ASSETS_ERROR' });
  }
});

module.exports = router;
