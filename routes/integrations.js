/**
 * Integrations Routes - OAuth Integration API (Figma, Slack, GitHub)
 *
 * Provides endpoints for:
 * - OAuth authorization and callback flows
 * - Figma file access, comments, webhooks
 * - Slack channel listing, messaging, webhooks
 * - GitHub repositories, issues, PRs, commits, branches, collaborators
 * - GitHub-FluxStudio project linking and sync
 *
 * Extracted from server-unified.js during Sprint 18 decomposition.
 */

const express = require('express');
const crypto = require('crypto');
const { createLogger } = require('../lib/logger');
const log = createLogger('Integrations');
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const { zodValidate } = require('../middleware/zodValidate');
const { asyncHandler } = require('../middleware/errorHandler');
const { oauthCallbackSchema, slackMessageSchema, slackProjectUpdateSchema, githubCreateIssueSchema, githubLinkRepoSchema } = require('../lib/schemas');
const { logAction } = require('../lib/auditLog');

const { createCircuitBreaker } = require('../lib/circuitBreaker');

const slackBreaker = createCircuitBreaker({
  name: 'slack-api',
  failureThreshold: 5,
  recoveryTimeout: 30000,
});

const githubBreaker = createCircuitBreaker({
  name: 'github-api',
  failureThreshold: 5,
  recoveryTimeout: 30000,
});

const router = express.Router();

// Lazy-loaded dependencies (initialized on first use)
let oauthManager = null;
let githubSyncService = null;

function getOAuthManager() {
  if (!oauthManager) {
    oauthManager = require('../lib/oauth-manager');
  }
  return oauthManager;
}

function getGitHubSyncService() {
  if (!githubSyncService) {
    try {
      const GitHubSyncService = require('../services/github-sync-service');
      const USE_DATABASE = process.env.USE_DATABASE === 'true';
      if (USE_DATABASE) {
        const authAdapter = require('../database/auth-adapter');
        githubSyncService = new GitHubSyncService({
          database: authAdapter.dbConfig,
          syncInterval: 300000
        });
      }
    } catch (error) {
      log.warn('GitHub Sync Service not available', error.message);
    }
  }
  return githubSyncService;
}

// Helper to get projects (file or DB based)
async function getProjects() {
  const fs = require('fs');
  const path = require('path');
  const USE_DATABASE = process.env.USE_DATABASE === 'true';

  if (USE_DATABASE) {
    try {
      const result = await query(`
        SELECT p.* FROM projects p
        WHERE p.status IS NULL OR p.status != 'cancelled'
        ORDER BY p.updated_at DESC NULLS LAST
        LIMIT 100
      `);
      return result.rows;
    } catch (error) {
      log.error('Error getting projects from database', error);
      return [];
    }
  }

  const PROJECTS_FILE = path.join(__dirname, '..', 'projects.json');
  const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
  return JSON.parse(data).projects;
}

async function saveProjects(projects) {
  const fs = require('fs');
  const path = require('path');
  const USE_DATABASE = process.env.USE_DATABASE === 'true';

  if (USE_DATABASE) {
    log.warn('saveProjects() called in database mode - use individual project operations instead');
    return true;
  }
  const PROJECTS_FILE = path.join(__dirname, '..', 'projects.json');
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify({ projects }, null, 2));
}

// ========================================
// General OAuth Routes
// ========================================

// Get OAuth authorization URL (initiate OAuth flow)
router.get('/:provider/auth', authenticateToken, asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const userId = req.user.id;

  const { url, stateToken } = await getOAuthManager().getAuthorizationURL(provider, userId);

  res.json({
    authorizationUrl: url,
    stateToken,
    provider
  });
}));

// OAuth callback handler (GET - for direct browser redirects)
router.get('/:provider/callback', asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({ success: false, error: 'Missing OAuth code or state', code: 'INTEGRATION_OAUTH_MISSING_PARAMS' });
  }

  await getOAuthManager().handleCallback(provider, code, state);

  // Redirect to frontend callback page
  res.redirect(`https://fluxstudio.art/auth/callback/${provider}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
}));

// OAuth callback handler (POST - for frontend OAuth callback page)
router.post('/:provider/callback', zodValidate(oauthCallbackSchema), asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { code, state } = req.body;

  if (!code || !state) {
    return res.status(400).json({
      success: false,
      error: 'Missing OAuth code or state',
      code: 'INTEGRATION_OAUTH_MISSING_PARAMS'
    });
  }

  const result = await getOAuthManager().handleCallback(provider, code, state);

  const providerData = result.userInfo || {};
  const permissions = providerData.scope || [];

  logAction(req.user?.id || null, 'oauth_connect', 'integration', provider, { provider }, req);

  res.json({
    success: true,
    message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} integration successful`,
    data: {
      provider,
      permissions: Array.isArray(permissions) ? permissions : permissions.split ? permissions.split(' ') : [],
      accountName: providerData.name || providerData.username || providerData.email || null
    }
  });
}));

// Get user's active integrations
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const integrations = await getOAuthManager().getUserIntegrations(req.user.id);
  res.json({ integrations });
}));

// Disconnect an integration
router.delete('/:provider', authenticateToken, asyncHandler(async (req, res) => {
  const { provider } = req.params;
  await getOAuthManager().disconnectIntegration(req.user.id, provider);

  logAction(req.user.id, 'oauth_disconnect', 'integration', provider, { provider }, req);

  res.json({
    message: `${provider} integration disconnected successfully`,
    provider
  });
}));

// ========================================
// Figma Integration Routes
// ========================================

router.get('/figma/files', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'figma');
  const FigmaService = require('../src/services/figmaService').default;
  const figma = new FigmaService(accessToken);

  const me = await figma.getMe();
  const teamId = me.teams && me.teams.length > 0 ? me.teams[0].id : null;

  if (!teamId) {
    return res.json({ projects: [], files: [] });
  }

  const projects = await figma.getTeamProjects(teamId);

  res.json({
    teamId,
    projects,
    user: {
      id: me.id,
      email: me.email,
      handle: me.handle
    }
  });
}));

router.get('/figma/files/:fileKey', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'figma');
  const FigmaService = require('../src/services/figmaService').default;
  const figma = new FigmaService(accessToken);

  const file = await figma.getFile(req.params.fileKey);

  res.json(file);
}));

router.get('/figma/comments/:fileKey', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'figma');
  const FigmaService = require('../src/services/figmaService').default;
  const figma = new FigmaService(accessToken);

  const comments = await figma.getComments(req.params.fileKey);

  res.json({ comments });
}));

router.post('/figma/webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['x-figma-signature'];
  const webhookSecret = process.env.FIGMA_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    const FigmaService = require('../src/services/figmaService').default;
    const isValid = FigmaService.verifyWebhookSignature(
      JSON.stringify(req.body),
      signature,
      webhookSecret
    );

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature', code: 'INTEGRATION_FIGMA_WEBHOOK_INVALID_SIG' });
    }
  }

  const FigmaService = require('../src/services/figmaService').default;
  const webhook = FigmaService.parseWebhook(req.body);

  log.info('Figma webhook received', webhook);

  await query(
    `INSERT INTO integration_webhooks (provider, event_type, event_id, payload, ip_address, signature_valid)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      'figma',
      webhook.event_type,
      webhook.timestamp,
      JSON.stringify(req.body),
      req.ip,
      !!webhookSecret && !!signature
    ]
  );

  res.json({ success: true });
}));

// ========================================
// Slack Integration Routes
// ========================================

router.get('/slack/channels', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'slack');
  const SlackService = require('../src/services/slackService').default;
  const slack = new SlackService(accessToken);

  const channels = await slackBreaker.execute(() => slack.listChannels(true));

  res.json({ channels });
}));

router.post('/slack/message', authenticateToken, zodValidate(slackMessageSchema), asyncHandler(async (req, res) => {
  const { channel, text, blocks } = req.body;

  if (!channel || !text) {
    return res.status(400).json({ success: false, error: 'Channel and text are required', code: 'INTEGRATION_SLACK_MISSING_PARAMS' });
  }

  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'slack');
  const SlackService = require('../src/services/slackService').default;
  const slack = new SlackService(accessToken);

  const message = await slackBreaker.execute(() => slack.postMessage(channel, text, { blocks }));

  res.json({ message });
}));

router.post('/slack/project-update', authenticateToken, zodValidate(slackProjectUpdateSchema), asyncHandler(async (req, res) => {
  const { channel, projectName, updateType, details } = req.body;

  if (!channel || !projectName || !updateType) {
    return res.status(400).json({ success: false, error: 'Missing required fields', code: 'INTEGRATION_SLACK_MISSING_FIELDS' });
  }

  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'slack');
  const SlackService = require('../src/services/slackService').default;
  const slack = new SlackService(accessToken);

  const message = await slackBreaker.execute(() => slack.sendProjectUpdate(channel, projectName, updateType, details));

  res.json({ message });
}));

router.post('/slack/webhook', asyncHandler(async (req, res) => {
  const SlackService = require('../src/services/slackService').default;

  const challenge = SlackService.handleChallenge(req.body);
  if (challenge) {
    return res.json({ challenge });
  }

  const signature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];
  const webhookSecret = process.env.SLACK_SIGNING_SECRET;

  if (webhookSecret && signature && timestamp) {
    const isValid = SlackService.verifyWebhookSignature(
      webhookSecret,
      timestamp,
      JSON.stringify(req.body),
      signature
    );

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature', code: 'INTEGRATION_SLACK_WEBHOOK_INVALID_SIG' });
    }
  }

  const webhook = SlackService.parseWebhook(req.body);

  log.info('Slack webhook received', webhook);

  await query(
    `INSERT INTO integration_webhooks (provider, event_type, payload, ip_address, signature_valid)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      'slack',
      webhook.type,
      JSON.stringify(req.body),
      req.ip,
      !!webhookSecret && !!signature
    ]
  );

  res.json({ success: true });
}));

// ========================================
// GitHub Integration Routes
// ========================================

router.get('/github/repositories', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: accessToken });

  const { type, sort, direction, per_page } = req.query;

  const { data } = await githubBreaker.execute(() => octokit.repos.listForAuthenticatedUser({
    type: type || 'owner',
    sort: sort || 'updated',
    direction: direction || 'desc',
    per_page: per_page ? parseInt(per_page) : 30
  }));

  res.json({ repositories: data });
}));

router.get('/github/repositories/:owner/:repo', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: accessToken });

  const { owner, repo } = req.params;

  const { data } = await githubBreaker.execute(() => octokit.repos.get({ owner, repo }));

  res.json(data);
}));

router.get('/github/repositories/:owner/:repo/issues', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: accessToken });

  const { owner, repo } = req.params;
  const { state, labels, sort, direction, per_page } = req.query;

  const { data } = await githubBreaker.execute(() => octokit.issues.listForRepo({
    owner,
    repo,
    state: state || 'open',
    labels,
    sort: sort || 'created',
    direction: direction || 'desc',
    per_page: per_page ? parseInt(per_page) : 30
  }));

  res.json({ issues: data });
}));

router.get('/github/repositories/:owner/:repo/issues/:issue_number', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: accessToken });

  const { owner, repo, issue_number } = req.params;

  const { data } = await githubBreaker.execute(() => octokit.issues.get({
    owner,
    repo,
    issue_number: parseInt(issue_number)
  }));

  res.json(data);
}));

router.post('/github/repositories/:owner/:repo/issues', authenticateToken, zodValidate(githubCreateIssueSchema), asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: accessToken });

  const { owner, repo } = req.params;
  const { title, body, labels, assignees } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: 'Issue title is required', code: 'INTEGRATION_GITHUB_MISSING_TITLE' });
  }

  const { data } = await githubBreaker.execute(() => octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels,
    assignees
  }));

  res.json(data);
}));

router.patch('/github/repositories/:owner/:repo/issues/:issue_number', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: accessToken });

  const { owner, repo, issue_number } = req.params;
  const { title, body, state, labels, assignees } = req.body;

  const { data } = await githubBreaker.execute(() => octokit.issues.update({
    owner,
    repo,
    issue_number: parseInt(issue_number),
    title,
    body,
    state,
    labels,
    assignees
  }));

  res.json(data);
}));

router.post('/github/repositories/:owner/:repo/issues/:issue_number/comments', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: accessToken });

  const { owner, repo, issue_number } = req.params;
  const { body } = req.body;

  if (!body) {
    return res.status(400).json({ success: false, error: 'Comment body is required', code: 'INTEGRATION_GITHUB_MISSING_BODY' });
  }

  const { data } = await githubBreaker.execute(() => octokit.issues.createComment({
    owner,
    repo,
    issue_number: parseInt(issue_number),
    body
  }));

  res.json(data);
}));

router.get('/github/repositories/:owner/:repo/pulls', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: accessToken });

  const { owner, repo } = req.params;
  const { state, sort, direction, per_page } = req.query;

  const { data } = await githubBreaker.execute(() => octokit.pulls.list({
    owner,
    repo,
    state: state || 'open',
    sort: sort || 'created',
    direction: direction || 'desc',
    per_page: per_page ? parseInt(per_page) : 30
  }));

  res.json({ pulls: data });
}));

router.get('/github/repositories/:owner/:repo/commits', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: accessToken });

  const { owner, repo } = req.params;
  const { sha, path, per_page } = req.query;

  const { data } = await githubBreaker.execute(() => octokit.repos.listCommits({
    owner,
    repo,
    sha,
    path,
    per_page: per_page ? parseInt(per_page) : 30
  }));

  res.json({ commits: data });
}));

router.get('/github/repositories/:owner/:repo/branches', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: accessToken });

  const { owner, repo } = req.params;

  const { data } = await githubBreaker.execute(() => octokit.repos.listBranches({ owner, repo }));

  const branches = data.map(branch => ({
    name: branch.name,
    protected: branch.protected
  }));

  res.json({ branches });
}));

router.get('/github/repositories/:owner/:repo/collaborators', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: accessToken });

  const { owner, repo } = req.params;

  const { data } = await githubBreaker.execute(() => octokit.repos.listCollaborators({ owner, repo }));

  const collaborators = data.map(collab => ({
    login: collab.login,
    avatar_url: collab.avatar_url,
    permissions: collab.permissions || { admin: false, push: false, pull: false }
  }));

  res.json({ collaborators });
}));

router.post('/github/repositories/:owner/:repo/link', authenticateToken, zodValidate(githubLinkRepoSchema), asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  const { projectId } = req.body;

  if (!projectId) {
    return res.status(400).json({ success: false, error: 'Project ID is required', code: 'INTEGRATION_GITHUB_MISSING_PROJECT_ID' });
  }

  await getOAuthManager().getAccessToken(req.user.id, 'github');

  const projects = await getProjects();
  const projectIndex = projects.findIndex(p => p.id === projectId);

  if (projectIndex === -1) {
    return res.status(404).json({ success: false, error: 'Project not found', code: 'INTEGRATION_PROJECT_NOT_FOUND' });
  }

  const isMember = projects[projectIndex].members && projects[projectIndex].members.some(m => m.userId === req.user.id);
  if (!isMember) {
    return res.status(403).json({ success: false, error: 'Access denied', code: 'INTEGRATION_ACCESS_DENIED' });
  }

  if (!projects[projectIndex].githubMetadata) {
    projects[projectIndex].githubMetadata = {};
  }

  projects[projectIndex].githubMetadata = {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    linkedAt: new Date().toISOString(),
    linkedBy: req.user.id
  };

  await saveProjects(projects);

  res.json({
    message: 'Repository linked successfully',
    project: projects[projectIndex]
  });
}));

router.get('/github/user', authenticateToken, asyncHandler(async (req, res) => {
  const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: accessToken });

  const { data } = await octokit.users.getAuthenticated();

  res.json({
    login: data.login,
    name: data.name,
    email: data.email,
    avatar_url: data.avatar_url,
    bio: data.bio,
    public_repos: data.public_repos
  });
}));

router.post('/github/webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  const event = req.headers['x-github-event'];

  if (webhookSecret && signature) {
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

    if (signature !== digest) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature', code: 'INTEGRATION_GITHUB_WEBHOOK_INVALID_SIG' });
    }
  }

  log.info('GitHub webhook received', {
    event,
    action: req.body.action,
    repository: req.body.repository?.full_name
  });

  await query(
    `INSERT INTO integration_webhooks (provider, event_type, payload, ip_address, signature_valid)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      'github',
      event,
      JSON.stringify(req.body),
      req.ip,
      !!webhookSecret && !!signature
    ]
  );

  res.json({ success: true });

  const syncService = getGitHubSyncService();
  if (syncService && event === 'issues') {
    log.info(`GitHub issue ${req.body.action}: ${req.body.issue?.title}`);

    setImmediate(async () => {
      try {
        await syncService.processWebhookEvent(req.body);
        log.info('GitHub issue webhook processed successfully');
      } catch (error) {
        log.error('Error processing GitHub issue webhook', error);
      }
    });
  }
}));

// GitHub Sync API Endpoints

router.post('/github/sync/:linkId', authenticateToken, asyncHandler(async (req, res) => {
  const syncService = getGitHubSyncService();
  if (!syncService) {
    return res.status(503).json({
      success: false,
      error: 'GitHub Sync Service not available (requires database mode)',
      code: 'INTEGRATION_SYNC_SERVICE_UNAVAILABLE'
    });
  }

  const { linkId } = req.params;
  const result = await syncService.syncIssuesFromGitHub(linkId);

  res.json({
    message: 'Sync completed successfully',
    ...result
  });
}));

router.post('/github/sync/start', authenticateToken, asyncHandler(async (req, res) => {
  const syncService = getGitHubSyncService();
  if (!syncService) {
    return res.status(503).json({
      success: false,
      error: 'GitHub Sync Service not available (requires database mode)',
      code: 'INTEGRATION_SYNC_SERVICE_UNAVAILABLE'
    });
  }

  if (req.user.userType !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required', code: 'INTEGRATION_ADMIN_REQUIRED' });
  }

  syncService.startAutoSync();

  res.json({
    message: 'Auto-sync started successfully',
    interval: syncService.syncInterval
  });
}));

router.post('/github/sync/stop', authenticateToken, asyncHandler(async (req, res) => {
  const syncService = getGitHubSyncService();
  if (!syncService) {
    return res.status(503).json({
      success: false,
      error: 'GitHub Sync Service not available (requires database mode)',
      code: 'INTEGRATION_SYNC_SERVICE_UNAVAILABLE'
    });
  }

  if (req.user.userType !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required', code: 'INTEGRATION_ADMIN_REQUIRED' });
  }

  syncService.stopAutoSync();

  res.json({
    message: 'Auto-sync stopped successfully'
  });
}));

router.get('/github/sync/status/:linkId', authenticateToken, asyncHandler(async (req, res) => {
  const syncService = getGitHubSyncService();
  if (!syncService) {
    return res.status(503).json({
      success: false,
      error: 'GitHub Sync Service not available (requires database mode)',
      code: 'INTEGRATION_SYNC_SERVICE_UNAVAILABLE'
    });
  }

  const { linkId } = req.params;
  const link = await syncService.getRepositoryLink(linkId);

  if (!link) {
    return res.status(404).json({ success: false, error: 'Repository link not found', code: 'INTEGRATION_REPO_LINK_NOT_FOUND' });
  }

  res.json({
    link: {
      id: link.id,
      owner: link.owner,
      repo: link.repo,
      fullName: link.full_name,
      syncStatus: link.sync_status,
      lastSyncedAt: link.last_synced_at,
      lastError: link.last_error,
      autoCreateTasks: link.auto_create_tasks,
      syncIssues: link.sync_issues
    },
    isAutoSyncRunning: syncService.isRunning
  });
}));

module.exports = router;
module.exports.slackBreaker = slackBreaker;
module.exports.githubBreaker = githubBreaker;
