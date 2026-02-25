/**
 * Integration Service
 * API client for OAuth integrations
 */

import type {
  Integration,
  IntegrationProvider
} from '../types/integrations';
import { apiService } from './apiService';

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
  /**
   * Get all connected integrations for the current user
   */
  async getIntegrations(): Promise<Integration[]> {
    const result = await apiService.get<IntegrationListResponse>('/integrations');
    return result.data?.integrations || [];
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
    const result = await apiService.get<AuthorizationResponse>(`/integrations/${provider}/auth`);
    return result.data!;
  }

  /**
   * Disconnect an integration
   */
  async disconnect(provider: IntegrationProvider): Promise<void> {
    await apiService.delete(`/integrations/${provider}`);
  }

  /**
   * Refresh an expired integration
   */
  async refresh(provider: IntegrationProvider): Promise<Integration> {
    const result = await apiService.post<Integration>(`/integrations/${provider}/refresh`);
    return result.data!;
  }

  // Figma-specific methods

  /**
   * Get Figma files accessible to the user
   */
  async getFigmaFiles(): Promise<FigmaFile[]> {
    const result = await apiService.get<FigmaFilesResponse>('/integrations/figma/files');
    return result.data?.files || [];
  }

  /**
   * Get a specific Figma file by key
   */
  async getFigmaFile(fileKey: string): Promise<FigmaFileDetail> {
    const result = await apiService.get<FigmaFileDetail>(`/integrations/figma/files/${fileKey}`);
    return result.data!;
  }

  // Slack-specific methods

  /**
   * Get Slack channels for all connected workspaces
   */
  async getSlackChannels(teamId?: string): Promise<SlackChannel[]> {
    const params: Record<string, string> = {};
    if (teamId) params.teamId = teamId;

    const result = await apiService.get<SlackChannelsResponse>('/integrations/slack/channels', { params });
    return result.data?.channels || [];
  }

  /**
   * Send a message to a Slack channel
   */
  async sendSlackMessage(channel: string, message: string, teamId?: string): Promise<SlackMessageResponse> {
    const result = await apiService.post<SlackMessageResponse>('/integrations/slack/message', { channel, message, teamId });
    return result.data!;
  }

  // GitHub-specific methods

  /**
   * Get GitHub repositories accessible to the user
   */
  async getGitHubRepositories(): Promise<GitHubRepository[]> {
    const result = await apiService.get<GitHubRepositoriesResponse>('/integrations/github/repositories');
    return result.data?.repositories || [];
  }

  /**
   * Get a specific GitHub repository
   */
  async getGitHubRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const result = await apiService.get<GitHubRepository>(`/integrations/github/repositories/${owner}/${repo}`);
    return result.data!;
  }

  /**
   * Link a GitHub repository to a project
   */
  async linkGitHubRepository(owner: string, repo: string, projectId: string): Promise<void> {
    await apiService.post(`/integrations/github/repositories/${owner}/${repo}/link`, { projectId });
  }

  /**
   * Get issues for a GitHub repository
   */
  async getGitHubIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
    const result = await apiService.get<GitHubIssuesResponse>(`/integrations/github/repositories/${owner}/${repo}/issues`);
    return result.data?.issues || [];
  }

  /**
   * Get pull requests for a GitHub repository
   */
  async getGitHubPullRequests(owner: string, repo: string): Promise<GitHubPullRequest[]> {
    const result = await apiService.get<GitHubPullRequestsResponse>(`/integrations/github/repositories/${owner}/${repo}/pulls`);
    return result.data?.pulls || [];
  }

  /**
   * Get commits for a GitHub repository
   */
  async getGitHubCommits(owner: string, repo: string): Promise<GitHubCommit[]> {
    const result = await apiService.get<GitHubCommitsResponse>(`/integrations/github/repositories/${owner}/${repo}/commits`);
    return result.data?.commits || [];
  }
}

export const integrationService = new IntegrationService();
