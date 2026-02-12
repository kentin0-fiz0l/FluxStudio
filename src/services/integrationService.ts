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
  async getFigmaFiles(): Promise<any[]> {
    const response = await fetch(buildApiUrl('/integrations/figma/files'), {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Figma files: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Get a specific Figma file by key
   */
  async getFigmaFile(fileKey: string): Promise<any> {
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
  async getSlackChannels(teamId?: string): Promise<any[]> {
    const url = teamId
      ? buildApiUrl(`/integrations/slack/channels?teamId=${teamId}`)
      : buildApiUrl('/integrations/slack/channels');

    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Slack channels: ${response.statusText}`);
    }

    const data = await response.json();
    return data.channels || [];
  }

  /**
   * Send a message to a Slack channel
   */
  async sendSlackMessage(channel: string, message: string, teamId?: string): Promise<any> {
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
  async getGitHubRepositories(): Promise<any[]> {
    const response = await fetch(buildApiUrl('/integrations/github/repositories'), {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub repositories: ${response.statusText}`);
    }

    const data = await response.json();
    return data.repositories || [];
  }

  /**
   * Get a specific GitHub repository
   */
  async getGitHubRepository(owner: string, repo: string): Promise<any> {
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
  async getGitHubIssues(owner: string, repo: string): Promise<any[]> {
    const response = await fetch(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/issues`), {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub issues: ${response.statusText}`);
    }

    const data = await response.json();
    return data.issues || [];
  }

  /**
   * Get pull requests for a GitHub repository
   */
  async getGitHubPullRequests(owner: string, repo: string): Promise<any[]> {
    const response = await fetch(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/pulls`), {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub pull requests: ${response.statusText}`);
    }

    const data = await response.json();
    return data.pulls || [];
  }

  /**
   * Get commits for a GitHub repository
   */
  async getGitHubCommits(owner: string, repo: string): Promise<any[]> {
    const response = await fetch(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/commits`), {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub commits: ${response.statusText}`);
    }

    const data = await response.json();
    return data.commits || [];
  }
}

export const integrationService = new IntegrationService();
