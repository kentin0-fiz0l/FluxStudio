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
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');

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
      console.warn('GitHub Sync Service not available:', error.message);
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
      console.error('Error getting projects from database:', error);
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
    console.warn('saveProjects() called in database mode - use individual project operations instead');
    return true;
  }
  const PROJECTS_FILE = path.join(__dirname, '..', 'projects.json');
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify({ projects }, null, 2));
}

// ========================================
// General OAuth Routes
// ========================================

// Get OAuth authorization URL (initiate OAuth flow)
router.get('/:provider/auth', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user.id;

    const { url, stateToken } = await getOAuthManager().getAuthorizationURL(provider, userId);

    res.json({
      authorizationUrl: url,
      stateToken,
      provider
    });
  } catch (error) {
    console.error(`OAuth init error (${req.params.provider}):`, error);
    res.status(500).json({ message: error.message });
  }
});

// OAuth callback handler (GET - for direct browser redirects)
router.get('/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ message: 'Missing OAuth code or state' });
    }

    await getOAuthManager().handleCallback(provider, code, state);

    // Redirect to frontend callback page
    res.redirect(`https://fluxstudio.art/auth/callback/${provider}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
  } catch (error) {
    console.error(`OAuth callback error (${req.params.provider}):`, error);
    res.redirect(`https://fluxstudio.art/auth/callback/${provider}?error=${encodeURIComponent(error.message)}`);
  }
});

// OAuth callback handler (POST - for frontend OAuth callback page)
router.post('/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: 'Missing OAuth code or state'
      });
    }

    const result = await getOAuthManager().handleCallback(provider, code, state);

    const providerData = result.userInfo || {};
    const permissions = providerData.scope || [];

    res.json({
      success: true,
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} integration successful`,
      data: {
        provider,
        permissions: Array.isArray(permissions) ? permissions : permissions.split ? permissions.split(' ') : [],
        accountName: providerData.name || providerData.username || providerData.email || null
      }
    });
  } catch (error) {
    console.error(`OAuth callback error (${req.params.provider}):`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'OAuth callback failed'
    });
  }
});

// Get user's active integrations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const integrations = await getOAuthManager().getUserIntegrations(req.user.id);
    res.json({ integrations });
  } catch (error) {
    // Handle missing table gracefully (migrations not run)
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.warn('OAuth integrations table does not exist - returning empty array');
      return res.json({ integrations: [] });
    }
    console.error('Get integrations error:', error);
    res.status(500).json({ message: 'Error retrieving integrations' });
  }
});

// Disconnect an integration
router.delete('/:provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params;
    await getOAuthManager().disconnectIntegration(req.user.id, provider);

    res.json({
      message: `${provider} integration disconnected successfully`,
      provider
    });
  } catch (error) {
    console.error(`Disconnect integration error (${req.params.provider}):`, error);
    res.status(500).json({ message: error.message });
  }
});

// ========================================
// Figma Integration Routes
// ========================================

router.get('/figma/files', authenticateToken, async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Figma files error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/figma/files/:fileKey', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'figma');
    const FigmaService = require('../src/services/figmaService').default;
    const figma = new FigmaService(accessToken);

    const file = await figma.getFile(req.params.fileKey);

    res.json(file);
  } catch (error) {
    console.error('Figma file details error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/figma/comments/:fileKey', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'figma');
    const FigmaService = require('../src/services/figmaService').default;
    const figma = new FigmaService(accessToken);

    const comments = await figma.getComments(req.params.fileKey);

    res.json({ comments });
  } catch (error) {
    console.error('Figma comments error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/figma/webhook', async (req, res) => {
  try {
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
        return res.status(401).json({ message: 'Invalid webhook signature' });
      }
    }

    const FigmaService = require('../src/services/figmaService').default;
    const webhook = FigmaService.parseWebhook(req.body);

    console.log('Figma webhook received:', webhook);

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
  } catch (error) {
    console.error('Figma webhook error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ========================================
// Slack Integration Routes
// ========================================

router.get('/slack/channels', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'slack');
    const SlackService = require('../src/services/slackService').default;
    const slack = new SlackService(accessToken);

    const channels = await slack.listChannels(true);

    res.json({ channels });
  } catch (error) {
    console.error('Slack channels error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/slack/message', authenticateToken, async (req, res) => {
  try {
    const { channel, text, blocks } = req.body;

    if (!channel || !text) {
      return res.status(400).json({ message: 'Channel and text are required' });
    }

    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'slack');
    const SlackService = require('../src/services/slackService').default;
    const slack = new SlackService(accessToken);

    const message = await slack.postMessage(channel, text, { blocks });

    res.json({ message });
  } catch (error) {
    console.error('Slack post message error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/slack/project-update', authenticateToken, async (req, res) => {
  try {
    const { channel, projectName, updateType, details } = req.body;

    if (!channel || !projectName || !updateType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'slack');
    const SlackService = require('../src/services/slackService').default;
    const slack = new SlackService(accessToken);

    const message = await slack.sendProjectUpdate(channel, projectName, updateType, details);

    res.json({ message });
  } catch (error) {
    console.error('Slack project update error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/slack/webhook', async (req, res) => {
  try {
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
        return res.status(401).json({ message: 'Invalid webhook signature' });
      }
    }

    const webhook = SlackService.parseWebhook(req.body);

    console.log('Slack webhook received:', webhook);

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
  } catch (error) {
    console.error('Slack webhook error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ========================================
// GitHub Integration Routes
// ========================================

router.get('/github/repositories', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { type, sort, direction, per_page } = req.query;

    const { data } = await octokit.repos.listForAuthenticatedUser({
      type: type || 'owner',
      sort: sort || 'updated',
      direction: direction || 'desc',
      per_page: per_page ? parseInt(per_page) : 30
    });

    res.json({ repositories: data });
  } catch (error) {
    console.error('GitHub repositories error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/github/repositories/:owner/:repo', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo } = req.params;

    const { data } = await octokit.repos.get({ owner, repo });

    res.json(data);
  } catch (error) {
    console.error('GitHub repository error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/github/repositories/:owner/:repo/issues', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo } = req.params;
    const { state, labels, sort, direction, per_page } = req.query;

    const { data } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: state || 'open',
      labels,
      sort: sort || 'created',
      direction: direction || 'desc',
      per_page: per_page ? parseInt(per_page) : 30
    });

    res.json({ issues: data });
  } catch (error) {
    console.error('GitHub issues error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/github/repositories/:owner/:repo/issues/:issue_number', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo, issue_number } = req.params;

    const { data } = await octokit.issues.get({
      owner,
      repo,
      issue_number: parseInt(issue_number)
    });

    res.json(data);
  } catch (error) {
    console.error('GitHub issue error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/github/repositories/:owner/:repo/issues', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo } = req.params;
    const { title, body, labels, assignees } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Issue title is required' });
    }

    const { data } = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
      assignees
    });

    res.json(data);
  } catch (error) {
    console.error('GitHub create issue error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.patch('/github/repositories/:owner/:repo/issues/:issue_number', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo, issue_number } = req.params;
    const { title, body, state, labels, assignees } = req.body;

    const { data } = await octokit.issues.update({
      owner,
      repo,
      issue_number: parseInt(issue_number),
      title,
      body,
      state,
      labels,
      assignees
    });

    res.json(data);
  } catch (error) {
    console.error('GitHub update issue error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/github/repositories/:owner/:repo/issues/:issue_number/comments', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo, issue_number } = req.params;
    const { body } = req.body;

    if (!body) {
      return res.status(400).json({ message: 'Comment body is required' });
    }

    const { data } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: parseInt(issue_number),
      body
    });

    res.json(data);
  } catch (error) {
    console.error('GitHub add comment error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/github/repositories/:owner/:repo/pulls', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo } = req.params;
    const { state, sort, direction, per_page } = req.query;

    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state: state || 'open',
      sort: sort || 'created',
      direction: direction || 'desc',
      per_page: per_page ? parseInt(per_page) : 30
    });

    res.json({ pulls: data });
  } catch (error) {
    console.error('GitHub pull requests error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/github/repositories/:owner/:repo/commits', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo } = req.params;
    const { sha, path, per_page } = req.query;

    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      sha,
      path,
      per_page: per_page ? parseInt(per_page) : 30
    });

    res.json({ commits: data });
  } catch (error) {
    console.error('GitHub commits error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/github/repositories/:owner/:repo/branches', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo } = req.params;

    const { data } = await octokit.repos.listBranches({ owner, repo });

    const branches = data.map(branch => ({
      name: branch.name,
      protected: branch.protected
    }));

    res.json({ branches });
  } catch (error) {
    console.error('GitHub branches error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/github/repositories/:owner/:repo/collaborators', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getOAuthManager().getAccessToken(req.user.id, 'github');
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: accessToken });

    const { owner, repo } = req.params;

    const { data } = await octokit.repos.listCollaborators({ owner, repo });

    const collaborators = data.map(collab => ({
      login: collab.login,
      avatar_url: collab.avatar_url,
      permissions: collab.permissions || { admin: false, push: false, pull: false }
    }));

    res.json({ collaborators });
  } catch (error) {
    console.error('GitHub collaborators error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/github/repositories/:owner/:repo/link', authenticateToken, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    await getOAuthManager().getAccessToken(req.user.id, 'github');

    const projects = await getProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const isMember = projects[projectIndex].members && projects[projectIndex].members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
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
  } catch (error) {
    console.error('GitHub link repository error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/github/user', authenticateToken, async (req, res) => {
  try {
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
  } catch (error) {
    console.error('GitHub user error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/github/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    const event = req.headers['x-github-event'];

    if (webhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

      if (signature !== digest) {
        return res.status(401).json({ message: 'Invalid webhook signature' });
      }
    }

    console.log('GitHub webhook received:', {
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
      console.log(`GitHub issue ${req.body.action}: ${req.body.issue?.title}`);

      setImmediate(async () => {
        try {
          await syncService.processWebhookEvent(req.body);
          console.log('GitHub issue webhook processed successfully');
        } catch (error) {
          console.error('Error processing GitHub issue webhook:', error);
        }
      });
    }
  } catch (error) {
    console.error('GitHub webhook error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GitHub Sync API Endpoints

router.post('/github/sync/:linkId', authenticateToken, async (req, res) => {
  try {
    const syncService = getGitHubSyncService();
    if (!syncService) {
      return res.status(503).json({
        message: 'GitHub Sync Service not available (requires database mode)'
      });
    }

    const { linkId } = req.params;
    const result = await syncService.syncIssuesFromGitHub(linkId);

    res.json({
      message: 'Sync completed successfully',
      ...result
    });
  } catch (error) {
    console.error('GitHub manual sync error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/github/sync/start', authenticateToken, async (req, res) => {
  try {
    const syncService = getGitHubSyncService();
    if (!syncService) {
      return res.status(503).json({
        message: 'GitHub Sync Service not available (requires database mode)'
      });
    }

    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    syncService.startAutoSync();

    res.json({
      message: 'Auto-sync started successfully',
      interval: syncService.syncInterval
    });
  } catch (error) {
    console.error('GitHub start auto-sync error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/github/sync/stop', authenticateToken, async (req, res) => {
  try {
    const syncService = getGitHubSyncService();
    if (!syncService) {
      return res.status(503).json({
        message: 'GitHub Sync Service not available (requires database mode)'
      });
    }

    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    syncService.stopAutoSync();

    res.json({
      message: 'Auto-sync stopped successfully'
    });
  } catch (error) {
    console.error('GitHub stop auto-sync error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/github/sync/status/:linkId', authenticateToken, async (req, res) => {
  try {
    const syncService = getGitHubSyncService();
    if (!syncService) {
      return res.status(503).json({
        message: 'GitHub Sync Service not available (requires database mode)'
      });
    }

    const { linkId } = req.params;
    const link = await syncService.getRepositoryLink(linkId);

    if (!link) {
      return res.status(404).json({ message: 'Repository link not found' });
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
  } catch (error) {
    console.error('GitHub sync status error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
