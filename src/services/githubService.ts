/**
 * GitHub Service
 * GitHub API integration for repository management and issue sync
 */

import { Octokit } from '@octokit/rest';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  labels: Array<{
    name: string;
    color: string;
  }>;
  assignees: Array<{
    login: string;
    avatar_url: string;
  }>;
  user: {
    login: string;
    avatar_url: string;
  };
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  draft: boolean;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  html_url: string;
  author: {
    login: string;
    avatar_url: string;
  } | null;
}

class GitHubService {
  private octokit: Octokit | null = null;

  /**
   * Initialize GitHub client with access token
   */
  initialize(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  /**
   * Get authenticated user's repositories
   */
  async getRepositories(options?: {
    type?: 'all' | 'owner' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
  }): Promise<GitHubRepository[]> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      type: options?.type || 'owner',
      sort: options?.sort || 'updated',
      direction: options?.direction || 'desc',
      per_page: options?.per_page || 30,
    });

    return data as GitHubRepository[];
  }

  /**
   * Get repository details
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    const { data } = await this.octokit.repos.get({ owner, repo });
    return data as GitHubRepository;
  }

  /**
   * Get repository issues
   */
  async getIssues(owner: string, repo: string, options?: {
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
    per_page?: number;
  }): Promise<GitHubIssue[]> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    const { data } = await this.octokit.issues.listForRepo({
      owner,
      repo,
      state: options?.state || 'open',
      labels: options?.labels,
      sort: options?.sort || 'created',
      direction: options?.direction || 'desc',
      per_page: options?.per_page || 30,
    });

    return data as GitHubIssue[];
  }

  /**
   * Get single issue
   */
  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    const { data } = await this.octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    return data as GitHubIssue;
  }

  /**
   * Create a new issue
   */
  async createIssue(
    owner: string,
    repo: string,
    issue: {
      title: string;
      body?: string;
      labels?: string[];
      assignees?: string[];
    }
  ): Promise<GitHubIssue> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    const { data } = await this.octokit.issues.create({
      owner,
      repo,
      title: issue.title,
      body: issue.body,
      labels: issue.labels,
      assignees: issue.assignees,
    });

    return data as GitHubIssue;
  }

  /**
   * Update an issue
   */
  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    updates: {
      title?: string;
      body?: string;
      state?: 'open' | 'closed';
      labels?: string[];
      assignees?: string[];
    }
  ): Promise<GitHubIssue> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    const { data } = await this.octokit.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      ...updates,
    });

    return data as GitHubIssue;
  }

  /**
   * Get pull requests
   */
  async getPullRequests(owner: string, repo: string, options?: {
    state?: 'open' | 'closed' | 'all';
    sort?: 'created' | 'updated' | 'popularity' | 'long-running';
    direction?: 'asc' | 'desc';
    per_page?: number;
  }): Promise<GitHubPullRequest[]> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    const { data } = await this.octokit.pulls.list({
      owner,
      repo,
      state: options?.state || 'open',
      sort: options?.sort || 'created',
      direction: options?.direction || 'desc',
      per_page: options?.per_page || 30,
    });

    return data as GitHubPullRequest[];
  }

  /**
   * Get commits for a repository
   */
  async getCommits(owner: string, repo: string, options?: {
    sha?: string;
    path?: string;
    per_page?: number;
  }): Promise<GitHubCommit[]> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    const { data } = await this.octokit.repos.listCommits({
      owner,
      repo,
      sha: options?.sha,
      path: options?.path,
      per_page: options?.per_page || 30,
    });

    return data as GitHubCommit[];
  }

  /**
   * Get branches for a repository
   */
  async getBranches(owner: string, repo: string): Promise<Array<{ name: string; protected: boolean }>> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    const { data } = await this.octokit.repos.listBranches({ owner, repo });
    return data.map(branch => ({
      name: branch.name,
      protected: branch.protected,
    }));
  }

  /**
   * Search repositories
   */
  async searchRepositories(query: string, options?: {
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
  }): Promise<GitHubRepository[]> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    const { data } = await this.octokit.search.repos({
      q: query,
      sort: options?.sort,
      order: options?.order || 'desc',
      per_page: options?.per_page || 30,
    });

    return data.items as GitHubRepository[];
  }

  /**
   * Get repository collaborators
   */
  async getCollaborators(owner: string, repo: string): Promise<Array<{
    login: string;
    avatar_url: string;
    permissions: {
      admin: boolean;
      push: boolean;
      pull: boolean;
    };
  }>> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    const { data } = await this.octokit.repos.listCollaborators({ owner, repo });
    return data.map(collab => ({
      login: collab.login,
      avatar_url: collab.avatar_url,
      permissions: collab.permissions || { admin: false, push: false, pull: false },
    }));
  }

  /**
   * Add comment to issue
   */
  async addIssueComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<void> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
  }

  /**
   * Get authenticated user info
   */
  async getAuthenticatedUser(): Promise<{
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string;
    bio: string | null;
    public_repos: number;
  }> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    const { data } = await this.octokit.users.getAuthenticated();
    return {
      login: data.login,
      name: data.name,
      email: data.email,
      avatar_url: data.avatar_url,
      bio: data.bio,
      public_repos: data.public_repos,
    };
  }
}

// Export singleton instance
export const githubService = new GitHubService();

// Export types
export type {
  GitHubRepository,
  GitHubIssue,
  GitHubPullRequest,
  GitHubCommit,
};
