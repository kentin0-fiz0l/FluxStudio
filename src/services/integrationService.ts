/**
 * Integration Service
 * API client for OAuth integrations
 */

import type {
  Integration,
  IntegrationProvider
} from '../types/integrations';
import { buildApiUrl } from '../config/environment';

interface AuthorizationResponse {
  authorizationUrl: string;
  state: string;
}

interface IntegrationListResponse {
  integrations: Integration[];
}

// Figma API types
interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
}

interface FigmaFileDetail {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: Record<string, unknown>;
  components: Record<string, unknown>;
}

interface FigmaFilesResponse {
  files: FigmaFile[];
}

// Slack API types
interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  topic?: { value: string };
  purpose?: { value: string };
  num_members?: number;
}

interface SlackChannelsResponse {
  channels: SlackChannel[];
}

interface SlackMessageResponse {
  ok: boolean;
  channel: string;
  ts: string;
  message?: Record<string, unknown>;
}

// GitHub API types
interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  owner: { login: string; avatar_url: string };
  default_branch: string;
  language: string | null;
  updated_at: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

interface GitHubRepositoriesResponse {
  repositories: GitHubRepository[];
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: string;
  body: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: { login: string; avatar_url: string };
  labels: Array<{ name: string; color: string }>;
}

interface GitHubIssuesResponse {
  issues: GitHubIssue[];
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  body: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: { login: string; avatar_url: string };
  head: { ref: string };
  base: { ref: string };
}

interface GitHubPullRequestsResponse {
  pulls: GitHubPullRequest[];
}

interface GitHubCommit {
  sha: string;
  message: string;
  author: { name: string; email: string; date: string };
  html_url: string;
}

interface GitHubCommitsResponse {
  commits: GitHubCommit[];
}

class IntegrationService {
  private getAuthHeaders(): HeadersInit {
    // Fixed: Use 'auth_token' to match AuthContext storage key
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  /**
   * Get all connected integrations for the current user
   */
  async getIntegrations(): Promise<Integration[]> {
    const response = await fetch(buildApiUrl('/integrations'), {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch integrations: ${response.statusText}`);
    }

    const data: IntegrationListResponse = await response.json();
    return data.integrations || [];
  }

  /**
   * Get a specific integration by provider
   */
  async getIntegration(provider: IntegrationProvider): Promise<Integration | null> {
    const integrations = await this.getIntegrations();
    return integrations.find(i => i.provider === provider) || null;
  }

  /**
   * Start OAuth authorization flow
   * Returns the authorization URL to redirect the user to
   */
  async startAuthorization(provider: IntegrationProvider): Promise<AuthorizationResponse> {
    const response = await fetch(buildApiUrl(`/integrations/${provider}/auth`), {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to start authorization: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Disconnect an integration
   */
  async disconnect(provider: IntegrationProvider): Promise<void> {
    const response = await fetch(buildApiUrl(`/integrations/${provider}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to disconnect: ${response.statusText}`);
    }
  }

  /**
   * Refresh an expired integration
   */
  async refresh(provider: IntegrationProvider): Promise<Integration> {
    const response = await fetch(buildApiUrl(`/integrations/${provider}/refresh`), {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh: ${response.statusText}`);
    }

    return response.json();
  }

  // Figma-specific methods

  /**
   * Get Figma files accessible to the user
   */
  async getFigmaFiles(): Promise<FigmaFile[]> {
    const response = await fetch(buildApiUrl('/integrations/figma/files'), {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Figma files: ${response.statusText}`);
    }

    const data: FigmaFilesResponse = await response.json();
    return data.files || [];
  }

  /**
   * Get a specific Figma file by key
   */
  async getFigmaFile(fileKey: string): Promise<FigmaFileDetail> {
    const response = await fetch(buildApiUrl(`/integrations/figma/files/${fileKey}`), {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Figma file: ${response.statusText}`);
    }

    return response.json();
  }

  // Slack-specific methods

  /**
   * Get Slack channels for all connected workspaces
   */
  async getSlackChannels(teamId?: string): Promise<SlackChannel[]> {
    const url = teamId
      ? buildApiUrl(`/integrations/slack/channels?teamId=${teamId}`)
      : buildApiUrl('/integrations/slack/channels');

    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Slack channels: ${response.statusText}`);
    }

    const data: SlackChannelsResponse = await response.json();
    return data.channels || [];
  }

  /**
   * Send a message to a Slack channel
   */
  async sendSlackMessage(channel: string, message: string, teamId?: string): Promise<SlackMessageResponse> {
    const response = await fetch(buildApiUrl('/integrations/slack/message'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ channel, message, teamId })
    });

    if (!response.ok) {
      throw new Error(`Failed to send Slack message: ${response.statusText}`);
    }

    return response.json();
  }

  // GitHub-specific methods

  /**
   * Get GitHub repositories accessible to the user
   */
  async getGitHubRepositories(): Promise<GitHubRepository[]> {
    const response = await fetch(buildApiUrl('/integrations/github/repositories'), {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub repositories: ${response.statusText}`);
    }

    const data: GitHubRepositoriesResponse = await response.json();
    return data.repositories || [];
  }

  /**
   * Get a specific GitHub repository
   */
  async getGitHubRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const response = await fetch(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}`), {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub repository: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Link a GitHub repository to a project
   */
  async linkGitHubRepository(owner: string, repo: string, projectId: string): Promise<void> {
    const response = await fetch(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/link`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ projectId })
    });

    if (!response.ok) {
      throw new Error(`Failed to link repository: ${response.statusText}`);
    }
  }

  /**
   * Get issues for a GitHub repository
   */
  async getGitHubIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
    const response = await fetch(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/issues`), {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub issues: ${response.statusText}`);
    }

    const data: GitHubIssuesResponse = await response.json();
    return data.issues || [];
  }

  /**
   * Get pull requests for a GitHub repository
   */
  async getGitHubPullRequests(owner: string, repo: string): Promise<GitHubPullRequest[]> {
    const response = await fetch(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/pulls`), {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub pull requests: ${response.statusText}`);
    }

    const data: GitHubPullRequestsResponse = await response.json();
    return data.pulls || [];
  }

  /**
   * Get commits for a GitHub repository
   */
  async getGitHubCommits(owner: string, repo: string): Promise<GitHubCommit[]> {
    const response = await fetch(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/commits`), {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub commits: ${response.statusText}`);
    }

    const data: GitHubCommitsResponse = await response.json();
    return data.commits || [];
  }
}

export const integrationService = new IntegrationService();
