/**
 * Connectors Routes - OAuth Integrations API
 *
 * Provides endpoints for:
 * - OAuth authorization flows (GitHub, Google Drive, Dropbox, OneDrive, Figma, Slack)
 * - Connector status and listing
 * - File browsing from connected services
 * - File import from connected services
 * - Sync job management
 *
 * All endpoints require authentication except OAuth callbacks.
 */

const express = require('express');
const { authenticateToken } = require('../lib/auth/middleware');
const { validateInput } = require('../middleware/security');
const connectorsAdapter = require('../database/connectors-adapter');
const oauthManager = require('../lib/oauth-manager');
const filesAdapter = require('../database/files-adapter');
const { createLogger } = require('../lib/logger');
const log = createLogger('Connectors');
const { zodValidate } = require('../middleware/zodValidate');
const { connectorImportSchema, connectorLinkSchema } = require('../lib/schemas');

const router = express.Router();

// Valid OAuth providers
const VALID_PROVIDERS = ['github', 'google_drive', 'dropbox', 'onedrive', 'figma', 'slack'];

// All available connectors definition
const ALL_CONNECTORS = [
  { id: 'github', name: 'GitHub', description: 'Version control and code collaboration', category: 'Development', icon: 'github' },
  { id: 'google_drive', name: 'Google Drive', description: 'Cloud storage and file sync', category: 'Storage', icon: 'cloud' },
  { id: 'dropbox', name: 'Dropbox', description: 'File storage and sharing', category: 'Storage', icon: 'dropbox' },
  { id: 'onedrive', name: 'OneDrive', description: 'Microsoft cloud storage', category: 'Storage', icon: 'cloud' },
  { id: 'figma', name: 'Figma', description: 'Design collaboration', category: 'Design', icon: 'figma' },
  { id: 'slack', name: 'Slack', description: 'Team communication', category: 'Communication', icon: 'slack' }
];

// Helper to create and emit notification (if messaging adapter available)
async function createNotification(userId, data) {
  try {
    // This would typically be handled by the notification service
    // For now, just log it
    log.info('Notification created', { userId, title: data.title });
  } catch (error) {
    log.error('Error creating notification', error);
  }
}

/**
 * GET /connectors/list
 * Get list of all connectors with status
 */
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const connectedProviders = await connectorsAdapter.getUserConnectors(req.user.id);

    // Merge connection status
    const connectors = ALL_CONNECTORS.map(connector => {
      const connection = connectedProviders.find(c => c.provider === connector.id);
      return {
        ...connector,
        status: connection?.isActive && !connection?.isExpired ? 'connected' : 'disconnected',
        username: connection?.username,
        email: connection?.email,
        connectedAt: connection?.connectedAt,
        lastUsedAt: connection?.lastUsedAt,
        isExpired: connection?.isExpired || false
      };
    });

    res.json({ success: true, connectors });
  } catch (error) {
    log.error('Error getting connectors list', error);
    res.status(500).json({ success: false, error: 'Failed to get connectors list', code: 'CONNECTORS_LIST_FAILED' });
  }
});

/**
 * GET /connectors/:provider/auth-url
 * Get OAuth authorization URL for a provider
 */
router.get('/:provider/auth-url', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;

    if (!VALID_PROVIDERS.includes(provider)) {
      return res.status(400).json({ success: false, error: `Invalid provider: ${provider}`, code: 'INVALID_PROVIDER' });
    }

    const { url, stateToken } = await oauthManager.getAuthorizationURL(provider, req.user.id);

    res.json({ success: true, url, stateToken });
  } catch (error) {
    log.error('Error generating OAuth URL', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate authorization URL', code: 'OAUTH_URL_FAILED' });
  }
});

/**
 * GET /connectors/:provider/callback
 * Handle OAuth callback (no auth required - callback from external provider)
 */
router.get('/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state, error: oauthError, error_description } = req.query;

    if (oauthError) {
      log.error('OAuth error', { provider, error: oauthError, description: error_description });
      return res.redirect(`/connectors?error=${encodeURIComponent(oauthError)}&provider=${provider}`);
    }

    if (!code || !state) {
      return res.redirect('/connectors?error=missing_params');
    }

    const result = await oauthManager.handleCallback(provider, code, state);

    // Create notification for successful connection
    if (result.userInfo?.userId) {
      await createNotification(result.userInfo.userId, {
        type: 'info',
        title: `${provider.charAt(0).toUpperCase() + provider.slice(1).replace('_', ' ')} Connected`,
        message: `Successfully connected your ${provider.replace('_', ' ')} account`
      });
    }

    res.redirect(`/connectors?success=true&provider=${provider}`);
  } catch (error) {
    log.error('OAuth callback error', error);
    res.redirect(`/connectors?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * DELETE /connectors/:provider
 * Disconnect a connector
 */
router.delete('/:provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    await connectorsAdapter.disconnectConnector(req.user.id, provider);
    res.json({ success: true });
  } catch (error) {
    log.error('Error disconnecting connector', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect connector', code: 'CONNECTOR_DISCONNECT_FAILED' });
  }
});

/**
 * GET /connectors/:provider/status
 * Get connection status for a specific provider
 */
router.get('/:provider/status', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    const isConnected = await connectorsAdapter.isConnected(req.user.id, provider);
    const connectorInfo = await connectorsAdapter.getConnectorInfo(req.user.id, provider);

    res.json({
      success: true,
      connected: isConnected,
      info: connectorInfo
    });
  } catch (error) {
    log.error('Error getting connector status', error);
    res.status(500).json({ success: false, error: 'Failed to get connector status', code: 'CONNECTOR_STATUS_FAILED' });
  }
});

/**
 * GET /connectors/:provider/files
 * Get files from a connector
 */
router.get('/:provider/files', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    const { path, folderId, owner, repo } = req.query;

    // Check if connected
    const isConnected = await connectorsAdapter.isConnected(req.user.id, provider);
    if (!isConnected) {
      return res.status(401).json({ success: false, error: `Not connected to ${provider}`, code: 'NOT_CONNECTED' });
    }

    let files;
    switch (provider) {
      case 'github':
        if (owner && repo) {
          files = await connectorsAdapter.getGitHubRepoContents(req.user.id, owner, repo, path || '');
        } else {
          files = await connectorsAdapter.getGitHubRepos(req.user.id);
        }
        break;
      case 'google_drive':
        files = await connectorsAdapter.getGoogleDriveFiles(req.user.id, folderId || 'root');
        break;
      case 'dropbox':
        files = await connectorsAdapter.getDropboxFiles(req.user.id, path || '');
        break;
      case 'onedrive':
        files = await connectorsAdapter.getOneDriveFiles(req.user.id, folderId || 'root');
        break;
      default:
        return res.status(400).json({ success: false, error: `File listing not supported for ${provider}`, code: 'UNSUPPORTED_PROVIDER' });
    }

    res.json({ success: true, files });
  } catch (error) {
    log.error('Error getting provider files', { provider: req.params.provider, error: error.message });
    res.status(500).json({ success: false, error: error.message || 'Failed to get files', code: 'PROVIDER_FILES_FETCH_FAILED' });
  }
});

/**
 * POST /connectors/:provider/import
 * Import file from connector
 */
router.post('/:provider/import', authenticateToken, zodValidate(connectorImportSchema), async (req, res) => {
  try {
    const { provider } = req.params;
    const { fileId, projectId, organizationId } = req.body;

    // Check if connected
    const isConnected = await connectorsAdapter.isConnected(req.user.id, provider);
    if (!isConnected) {
      return res.status(401).json({ success: false, error: `Not connected to ${provider}`, code: 'NOT_CONNECTED' });
    }

    const importedFile = await connectorsAdapter.importFile(req.user.id, provider, fileId, {
      projectId,
      organizationId
    });

    // Also create entry in unified files table for consistent access
    try {
      await filesAdapter.createFromConnector({
        userId: req.user.id,
        organizationId,
        projectId,
        provider,
        connectorFileId: importedFile.id,
        name: importedFile.name,
        mimeType: importedFile.mime_type || importedFile.mimeType,
        sizeBytes: importedFile.size_bytes || importedFile.sizeBytes,
        storageKey: `connector://${provider}/${fileId}`,
        fileUrl: importedFile.local_path || importedFile.localPath,
        metadata: {
          providerFileId: fileId,
          importedAt: new Date().toISOString()
        }
      });
    } catch (unifiedFileError) {
      log.error('Error creating unified file entry', unifiedFileError);
      // Non-fatal - connector file is still created
    }

    // Create notification for import
    await createNotification(req.user.id, {
      type: 'project_file_uploaded',
      title: 'File Imported',
      message: `Successfully imported "${importedFile.name}" from ${provider.replace('_', ' ')}`
    });

    res.json({ success: true, file: importedFile });
  } catch (error) {
    log.error('Error importing from provider', { provider: req.params.provider, error: error.message });
    res.status(500).json({ success: false, error: error.message || 'Failed to import file', code: 'FILE_IMPORT_FAILED' });
  }
});

/**
 * GET /connectors/files
 * Get imported files
 */
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const { provider, projectId, limit = 100, offset = 0 } = req.query;

    const files = await connectorsAdapter.getConnectorFiles(req.user.id, {
      provider,
      projectId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ success: true, files });
  } catch (error) {
    log.error('Error getting connector files', error);
    res.status(500).json({ success: false, error: 'Failed to get files', code: 'CONNECTOR_FILES_FETCH_FAILED' });
  }
});

/**
 * POST /connectors/files/:fileId/link
 * Link imported file to project
 */
router.post('/files/:fileId/link', authenticateToken, zodValidate(connectorLinkSchema), async (req, res) => {
  try {
    const { fileId } = req.params;
    const { projectId } = req.body;

    const file = await connectorsAdapter.linkFileToProject(fileId, projectId, req.user.id);

    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found', code: 'FILE_NOT_FOUND' });
    }

    // Create notification for file linked
    await createNotification(req.user.id, {
      type: 'project_file_uploaded',
      title: 'File Linked to Project',
      message: `"${file.name}" has been linked to your project`
    });

    res.json({ success: true, file });
  } catch (error) {
    log.error('Error linking file to project', error);
    res.status(500).json({ success: false, error: 'Failed to link file', code: 'FILE_LINK_FAILED' });
  }
});

/**
 * DELETE /connectors/files/:fileId
 * Delete imported file
 */
router.delete('/files/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const deleted = await connectorsAdapter.deleteConnectorFile(fileId, req.user.id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'File not found', code: 'FILE_NOT_FOUND' });
    }

    res.json({ success: true });
  } catch (error) {
    log.error('Error deleting connector file', error);
    res.status(500).json({ success: false, error: 'Failed to delete file', code: 'FILE_DELETE_FAILED' });
  }
});

/**
 * GET /connectors/sync-jobs
 * Get sync jobs
 */
router.get('/sync-jobs', authenticateToken, async (req, res) => {
  try {
    const { provider, limit = 10 } = req.query;
    const jobs = await connectorsAdapter.getSyncJobs(req.user.id, provider, parseInt(limit));
    res.json({ success: true, jobs });
  } catch (error) {
    log.error('Error getting sync jobs', error);
    res.status(500).json({ success: false, error: 'Failed to get sync jobs', code: 'SYNC_JOBS_FETCH_FAILED' });
  }
});

/**
 * POST /connectors/:provider/sync
 * Trigger a sync for a provider
 */
router.post('/:provider/sync', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;

    // Check if connected
    const isConnected = await connectorsAdapter.isConnected(req.user.id, provider);
    if (!isConnected) {
      return res.status(401).json({ success: false, error: `Not connected to ${provider}`, code: 'NOT_CONNECTED' });
    }

    const job = await connectorsAdapter.createSyncJob(req.user.id, provider);

    res.json({ success: true, job });
  } catch (error) {
    log.error('Error triggering sync', error);
    res.status(500).json({ success: false, error: 'Failed to trigger sync', code: 'SYNC_TRIGGER_FAILED' });
  }
});

/**
 * POST /connectors/:provider/refresh
 * Refresh OAuth token for a provider
 */
router.post('/:provider/refresh', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;

    const refreshed = await oauthManager.refreshToken(req.user.id, provider);

    res.json({ success: true, refreshed });
  } catch (error) {
    log.error('Error refreshing token', error);
    res.status(500).json({ success: false, error: 'Failed to refresh token', code: 'TOKEN_REFRESH_FAILED' });
  }
});

module.exports = router;
