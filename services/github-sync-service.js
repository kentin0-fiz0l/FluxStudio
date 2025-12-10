/**
 * GitHub Issue Synchronization Service
 * Phase 4: Bi-directional sync between GitHub issues and FluxStudio tasks
 */

const { Octokit } = require('@octokit/rest');
const { Pool } = require('pg');

class GitHubSyncService {
  constructor(config = {}) {
    // Use DATABASE_URL if available (DigitalOcean managed database)
    // Always prefer DATABASE_URL over passed config for consistency
    if (process.env.DATABASE_URL) {
      // Strip sslmode from DATABASE_URL to prevent conflict with ssl config
      const connectionString = process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]+/g, '');
      this.dbConfig = {
        connectionString,
        ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true'
          ? { rejectUnauthorized: false }  // Accept DigitalOcean self-signed certs
          : false
      };
      console.log('[GitHubSyncService] Using DATABASE_URL for database connection (SSL: ' +
        (this.dbConfig.ssl ? 'enabled with rejectUnauthorized=false' : 'disabled') + ')');
    } else if (config.database) {
      this.dbConfig = config.database;
      console.log('[GitHubSyncService] Using provided database config');
    } else {
      // Fallback to individual variables (development only)
      this.dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'fluxstudio',
        user: process.env.DB_USER || 'fluxstudio_user',
        password: process.env.DB_PASSWORD
      };
      console.log('[GitHubSyncService] Using individual DB variables (fallback)');
    }

    this.pool = new Pool(this.dbConfig);
    this.syncInterval = config.syncInterval || 300000; // 5 minutes default
    this.isRunning = false;
  }

  /**
   * Get Octokit instance with user's access token
   */
  async getOctokit(userId) {
    const query = `
      SELECT access_token
      FROM oauth_tokens
      WHERE user_id = $1 AND provider = 'github'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [userId]);
    if (!result.rows.length) {
      throw new Error('No GitHub token found for user');
    }

    // Decrypt token (assuming it's stored encrypted)
    const encryptedToken = result.rows[0].access_token;
    const token = this.decryptToken(encryptedToken);

    return new Octokit({ auth: token });
  }

  /**
   * Decrypt access token (placeholder - implement based on your encryption method)
   */
  decryptToken(encryptedToken) {
    // TODO: Implement decryption based on your encryption method
    // For now, assuming tokens might be stored as-is or need decryption
    return encryptedToken;
  }

  /**
   * Sync issues from GitHub to FluxStudio for a specific repository link
   */
  async syncIssuesFromGitHub(linkId) {
    const link = await this.getRepositoryLink(linkId);
    if (!link) throw new Error('Repository link not found');

    const octokit = await this.getOctokit(link.user_id);

    try {
      // Get all issues from GitHub
      const { data: issues } = await octokit.issues.listForRepo({
        owner: link.owner,
        repo: link.repo,
        state: 'all',
        per_page: 100
      });

      console.log(`Fetched ${issues.length} issues from ${link.full_name}`);

      // Sync each issue
      for (const issue of issues) {
        await this.syncSingleIssue(linkId, issue, link);
      }

      // Update last synced timestamp
      await this.pool.query(
        'UPDATE github_repository_links SET last_synced_at = NOW(), sync_status = $1 WHERE id = $2',
        ['idle', linkId]
      );

      return { success: true, issueCount: issues.length };
    } catch (error) {
      console.error(`Error syncing issues for ${link.full_name}:`, error);

      // Update sync status to error
      await this.pool.query(
        'UPDATE github_repository_links SET sync_status = $1, last_error = $2 WHERE id = $3',
        ['error', error.message, linkId]
      );

      throw error;
    }
  }

  /**
   * Sync a single GitHub issue to FluxStudio
   */
  async syncSingleIssue(linkId, issue, link) {
    // Check if auto-create tasks is enabled
    const shouldCreateTask = link.auto_create_tasks || link.sync_issues;

    // Check if issue already synced
    const existingSync = await this.pool.query(
      'SELECT * FROM github_issue_sync WHERE github_link_id = $1 AND issue_number = $2',
      [linkId, issue.number]
    );

    if (existingSync.rows.length > 0) {
      // Update existing sync record
      await this.updateIssueSync(existingSync.rows[0], issue, link);
    } else if (shouldCreateTask) {
      // Create new task and sync record
      await this.createTaskFromIssue(linkId, issue, link);
    }
  }

  /**
   * Create a FluxStudio task from a GitHub issue
   */
  async createTaskFromIssue(linkId, issue, link) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create task
      const taskQuery = `
        INSERT INTO tasks (
          project_id,
          title,
          description,
          status,
          priority,
          created_by,
          metadata,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;

      const taskStatus = issue.state === 'open' ? 'in_progress' : 'completed';
      const priority = this.determinePriority(issue);

      const metadata = {
        github_issue_number: issue.number,
        github_link_id: linkId,
        github_url: issue.html_url,
        synced_from_github: true,
        github_labels: issue.labels.map(l => l.name),
        github_created_at: issue.created_at
      };

      const taskResult = await client.query(taskQuery, [
        link.project_id,
        issue.title,
        issue.body || '',
        taskStatus,
        priority,
        link.user_id,
        JSON.stringify(metadata),
        issue.created_at
      ]);

      const taskId = taskResult.rows[0].id;

      // Create sync record
      const syncQuery = `
        INSERT INTO github_issue_sync (
          github_link_id,
          issue_number,
          issue_id,
          issue_title,
          issue_body,
          issue_state,
          issue_html_url,
          issue_created_at,
          issue_updated_at,
          issue_closed_at,
          issue_labels,
          issue_assignees,
          fluxstudio_task_id,
          sync_direction,
          sync_status,
          last_synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      `;

      await client.query(syncQuery, [
        linkId,
        issue.number,
        issue.id,
        issue.title,
        issue.body,
        issue.state,
        issue.html_url,
        issue.created_at,
        issue.updated_at,
        issue.closed_at,
        JSON.stringify(issue.labels),
        JSON.stringify(issue.assignees),
        taskId,
        'both',
        'synced'
      ]);

      await client.query('COMMIT');

      console.log(`Created task ${taskId} from GitHub issue #${issue.number}`);

      return taskId;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error creating task from issue #${issue.number}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update existing issue sync record
   */
  async updateIssueSync(existingSync, issue, link) {
    // Check if issue has changed
    const hasChanged =
      existingSync.issue_title !== issue.title ||
      existingSync.issue_body !== issue.body ||
      existingSync.issue_state !== issue.state;

    if (!hasChanged) {
      // No changes, just update last_synced_at
      await this.pool.query(
        'UPDATE github_issue_sync SET last_synced_at = NOW() WHERE id = $1',
        [existingSync.id]
      );
      return;
    }

    // Update issue sync record
    await this.pool.query(`
      UPDATE github_issue_sync SET
        issue_title = $1,
        issue_body = $2,
        issue_state = $3,
        issue_updated_at = $4,
        issue_closed_at = $5,
        issue_labels = $6,
        issue_assignees = $7,
        last_synced_at = NOW(),
        sync_status = $8
      WHERE id = $9
    `, [
      issue.title,
      issue.body,
      issue.state,
      issue.updated_at,
      issue.closed_at,
      JSON.stringify(issue.labels),
      JSON.stringify(issue.assignees),
      'synced',
      existingSync.id
    ]);

    // Update corresponding task if bi-directional sync is enabled
    if (existingSync.fluxstudio_task_id && existingSync.sync_direction !== 'flux_to_github') {
      const taskStatus = issue.state === 'open' ? 'in_progress' : 'completed';

      await this.pool.query(`
        UPDATE tasks SET
          title = $1,
          description = $2,
          status = $3,
          updated_at = NOW()
        WHERE id = $4
      `, [
        issue.title,
        issue.body || '',
        taskStatus,
        existingSync.fluxstudio_task_id
      ]);

      console.log(`Updated task ${existingSync.fluxstudio_task_id} from GitHub issue #${issue.number}`);
    }
  }

  /**
   * Sync task changes back to GitHub
   */
  async syncTaskToGitHub(taskId) {
    // Get task details
    const taskResult = await this.pool.query(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );

    if (!taskResult.rows.length) {
      throw new Error('Task not found');
    }

    const task = taskResult.rows[0];

    // Get sync record
    const syncResult = await this.pool.query(
      'SELECT * FROM github_issue_sync WHERE fluxstudio_task_id = $1',
      [taskId]
    );

    if (!syncResult.rows.length) {
      console.log(`Task ${taskId} is not linked to a GitHub issue`);
      return;
    }

    const sync = syncResult.rows[0];

    // Check if sync is enabled
    if (sync.sync_direction === 'github_to_flux' || sync.sync_direction === 'disabled') {
      console.log(`Sync disabled for task ${taskId} (direction: ${sync.sync_direction})`);
      return;
    }

    // Get repository link
    const link = await this.getRepositoryLink(sync.github_link_id);
    const octokit = await this.getOctokit(link.user_id);

    try {
      // Update GitHub issue
      const issueState = task.status === 'completed' ? 'closed' : 'open';

      await octokit.issues.update({
        owner: link.owner,
        repo: link.repo,
        issue_number: sync.issue_number,
        title: task.title,
        body: task.description,
        state: issueState
      });

      // Update sync record
      await this.pool.query(`
        UPDATE github_issue_sync SET
          sync_status = 'synced',
          last_synced_at = NOW()
        WHERE id = $1
      `, [sync.id]);

      console.log(`Synced task ${taskId} to GitHub issue #${sync.issue_number}`);
    } catch (error) {
      console.error(`Error syncing task ${taskId} to GitHub:`, error);

      // Mark as error
      await this.pool.query(`
        UPDATE github_issue_sync SET
          sync_status = 'error',
          last_error = $1
        WHERE id = $2
      `, [error.message, sync.id]);

      throw error;
    }
  }

  /**
   * Process GitHub webhook event
   */
  async processWebhookEvent(event) {
    const { action, issue, repository } = event;

    if (!issue || !repository) {
      console.log('Webhook event has no issue or repository data');
      return;
    }

    // Find repository link
    const linkResult = await this.pool.query(
      'SELECT * FROM github_repository_links WHERE owner = $1 AND repo = $2',
      [repository.owner.login, repository.name]
    );

    if (!linkResult.rows.length) {
      console.log(`No repository link found for ${repository.full_name}`);
      return;
    }

    const link = linkResult.rows[0];

    // Sync the issue
    console.log(`Processing ${action} event for issue #${issue.number} in ${repository.full_name}`);
    await this.syncSingleIssue(link.id, issue, link);
  }

  /**
   * Start automatic sync polling
   */
  startAutoSync() {
    if (this.isRunning) {
      console.log('Auto sync already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting auto sync (interval: ${this.syncInterval}ms)`);

    this.syncTimer = setInterval(async () => {
      try {
        await this.syncAllRepositories();
      } catch (error) {
        console.error('Error in auto sync:', error);
      }
    }, this.syncInterval);
  }

  /**
   * Stop automatic sync polling
   */
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.isRunning = false;
    console.log('Auto sync stopped');
  }

  /**
   * Sync all repository links
   */
  async syncAllRepositories() {
    const links = await this.pool.query(
      'SELECT * FROM github_repository_links WHERE sync_issues = true'
    );

    console.log(`Syncing ${links.rows.length} repository links`);

    for (const link of links.rows) {
      try {
        await this.syncIssuesFromGitHub(link.id);
      } catch (error) {
        console.error(`Error syncing ${link.full_name}:`, error);
      }
    }
  }

  /**
   * Get repository link by ID
   */
  async getRepositoryLink(linkId) {
    const result = await this.pool.query(
      'SELECT * FROM github_repository_links WHERE id = $1',
      [linkId]
    );
    return result.rows[0];
  }

  /**
   * Determine task priority from GitHub issue labels
   */
  determinePriority(issue) {
    const labels = issue.labels.map(l => l.name.toLowerCase());

    if (labels.includes('priority: high') || labels.includes('urgent')) {
      return 'high';
    } else if (labels.includes('priority: low') || labels.includes('nice to have')) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Close database connection
   */
  async close() {
    this.stopAutoSync();
    await this.pool.end();
  }
}

module.exports = GitHubSyncService;
