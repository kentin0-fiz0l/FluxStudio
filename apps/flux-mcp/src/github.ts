/**
 * GitHub API integration for workflow management
 */
import { request } from 'undici';
import type { PreviewResponse, LogsResponse } from './schema.js';

const GITHUB_API_BASE = 'https://api.github.com';

export class GitHubClient {
  private token: string;
  private owner: string;
  private repo: string;
  private workflowFile: string;

  constructor() {
    this.token = process.env.GITHUB_TOKEN || '';
    this.owner = process.env.GITHUB_OWNER || '';
    this.repo = process.env.GITHUB_REPO || '';
    this.workflowFile = process.env.GITHUB_WORKFLOW_FILE || 'deploy.yml';

    if (!this.token || !this.owner || !this.repo) {
      throw new Error('Missing required environment variables: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO');
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Flux-MCP-Server/1.0',
    };
  }

  /**
   * Trigger workflow dispatch for a given branch
   */
  async createPreview(branch: string, payload?: Record<string, any>): Promise<PreviewResponse> {
    const url = `${GITHUB_API_BASE}/repos/${this.owner}/${this.repo}/actions/workflows/${this.workflowFile}/dispatches`;

    console.log(`[GitHub] Dispatching workflow for branch: ${branch}`);

    // Dispatch the workflow
    const dispatchResponse = await request(url, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: branch,
        inputs: payload || {},
      }),
    });

    if (dispatchResponse.statusCode !== 204) {
      const errorBody = await dispatchResponse.body.text();
      throw new Error(`Failed to dispatch workflow: ${dispatchResponse.statusCode} - ${errorBody}`);
    }

    console.log('[GitHub] Workflow dispatched successfully');

    // Wait a moment for the run to be created
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get the latest run for this workflow and branch
    const runsUrl = `${GITHUB_API_BASE}/repos/${this.owner}/${this.repo}/actions/workflows/${this.workflowFile}/runs?branch=${branch}&per_page=1`;

    const runsResponse = await request(runsUrl, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (runsResponse.statusCode !== 200) {
      throw new Error(`Failed to fetch workflow runs: ${runsResponse.statusCode}`);
    }

    const runsData = await runsResponse.body.json() as any;

    if (!runsData.workflow_runs || runsData.workflow_runs.length === 0) {
      throw new Error('No workflow runs found for this branch');
    }

    const latestRun = runsData.workflow_runs[0];

    return {
      run_id: latestRun.id,
      status: latestRun.status,
      html_url: latestRun.html_url,
      created_at: latestRun.created_at,
      head_branch: latestRun.head_branch,
    };
  }

  /**
   * Get detailed status and logs information for a workflow run
   */
  async tailLogs(runId: number): Promise<LogsResponse> {
    const url = `${GITHUB_API_BASE}/repos/${this.owner}/${this.repo}/actions/runs/${runId}`;

    console.log(`[GitHub] Fetching run info for: ${runId}`);

    const response = await request(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (response.statusCode !== 200) {
      const errorBody = await response.body.text();
      throw new Error(`Failed to fetch run info: ${response.statusCode} - ${errorBody}`);
    }

    const runData = await response.body.json() as any;

    return {
      run_id: runData.id,
      name: runData.name,
      status: runData.status,
      conclusion: runData.conclusion,
      html_url: runData.html_url,
      logs_url: runData.logs_url,
      created_at: runData.created_at,
      updated_at: runData.updated_at,
    };
  }

  /**
   * Format logs response as human-readable text
   */
  formatLogsResponse(logs: LogsResponse): string {
    const lines = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `Workflow Run: ${logs.name}`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `Run ID:      #${logs.run_id}`,
      `Status:      ${logs.status}`,
      `Conclusion:  ${logs.conclusion || 'N/A'}`,
      `Created:     ${new Date(logs.created_at).toLocaleString()}`,
      `Updated:     ${new Date(logs.updated_at).toLocaleString()}`,
      '',
      '🔗 Links:',
      `   Web UI:   ${logs.html_url}`,
      `   Logs ZIP: ${logs.logs_url}`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ];

    return lines.join('\n');
  }
}
