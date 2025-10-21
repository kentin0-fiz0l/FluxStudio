/**
 * GitHubIntegration Component
 * GitHub-specific integration with repository linking and issue sync
 */

import React, { useState, useEffect } from 'react';
import { Github, GitBranch, GitPullRequest, GitCommit, Star, GitFork, AlertCircle } from 'lucide-react';
import { IntegrationCard } from './IntegrationCard';
import { Button } from '@/components/ui/button';
import type { Integration } from '@/types/integrations';
import { integrationService } from '@/services/integrationService';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
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
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  labels: Array<{ name: string; color: string }>;
  user: {
    login: string;
    avatar_url: string;
  };
}

export function GitHubIntegration() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [issuesError, setIssuesError] = useState<string | null>(null);

  const loadRepos = async () => {
    setIsLoadingRepos(true);
    setReposError(null);

    try {
      const response = await integrationService.getGitHubRepositories();
      setRepos(response);
    } catch (error: any) {
      console.error('Failed to load GitHub repositories:', error);
      setReposError(error.message || 'Failed to load repositories');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const loadIssues = async (repoFullName: string) => {
    setIsLoadingIssues(true);
    setIssuesError(null);

    try {
      const [owner, repo] = repoFullName.split('/');
      const response = await fetch(
        `/api/integrations/github/repos/${owner}/${repo}/issues`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load issues');
      }

      const data = await response.json();
      setIssues(data.issues || []);
    } catch (error: any) {
      console.error('Failed to load GitHub issues:', error);
      setIssuesError(error.message || 'Failed to load issues');
    } finally {
      setIsLoadingIssues(false);
    }
  };

  const handleSuccess = (integration: Integration) => {
    // Auto-load repositories when connected
    loadRepos();
  };

  const handleRepoSelect = (repoFullName: string) => {
    setSelectedRepo(repoFullName);
    loadIssues(repoFullName);
  };

  const handleOpenRepo = (htmlUrl: string) => {
    window.open(htmlUrl, '_blank');
  };

  const handleOpenIssue = (htmlUrl: string) => {
    window.open(htmlUrl, '_blank');
  };

  return (
    <IntegrationCard provider="github" onSuccess={handleSuccess}>
      {/* GitHub Repositories Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Repositories
          </h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadRepos}
            disabled={isLoadingRepos}
            icon={<Github className={`h-4 w-4 ${isLoadingRepos ? 'animate-spin' : ''}`} />}
            aria-label="Refresh repositories"
          >
            Refresh
          </Button>
        </div>

        {isLoadingRepos && (
          <div className="flex items-center justify-center py-8">
            <Github className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        )}

        {reposError && (
          <div className="p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded text-sm text-error-700 dark:text-error-300">
            {reposError}
          </div>
        )}

        {!isLoadingRepos && !reposError && repos.length === 0 && (
          <div className="text-center py-8 text-sm text-neutral-500">
            <GitBranch className="h-12 w-12 mx-auto mb-2 text-neutral-400" />
            <p>No repositories found</p>
            <p className="text-xs mt-1">Create a repository on GitHub to see it here</p>
          </div>
        )}

        {!isLoadingRepos && !reposError && repos.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {repos.slice(0, 10).map((repo) => (
              <div
                key={repo.id}
                className={`p-3 rounded-lg transition-colors cursor-pointer ${
                  selectedRepo === repo.full_name
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-600'
                    : 'bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-2 border-transparent'
                }`}
                onClick={() => handleRepoSelect(repo.full_name)}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={repo.owner.avatar_url}
                    alt={repo.owner.login}
                    className="w-8 h-8 rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {repo.name}
                      </p>
                      {repo.private && (
                        <span className="text-xs bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 rounded">
                          Private
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {repo.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {repo.stargazers_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="h-3 w-3" />
                        {repo.forks_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {repo.open_issues_count} issues
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenRepo(repo.html_url);
                    }}
                    aria-label="Open repository in GitHub"
                  >
                    <Github className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {repos.length > 10 && (
              <p className="text-xs text-center text-neutral-500 pt-2">
                and {repos.length - 10} more repositor{repos.length - 10 !== 1 ? 'ies' : 'y'}
              </p>
            )}
          </div>
        )}

        {/* Issues Section (shown when repo selected) */}
        {selectedRepo && (
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Issues for {selectedRepo.split('/')[1]}
              </h4>
            </div>

            {isLoadingIssues && (
              <div className="flex items-center justify-center py-4">
                <Github className="h-5 w-5 animate-spin text-primary-600" />
              </div>
            )}

            {issuesError && (
              <div className="p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded text-sm text-error-700 dark:text-error-300">
                {issuesError}
              </div>
            )}

            {!isLoadingIssues && !issuesError && issues.length === 0 && (
              <div className="text-center py-4 text-sm text-neutral-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-neutral-400" />
                <p>No open issues</p>
              </div>
            )}

            {!isLoadingIssues && !issuesError && issues.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {issues.slice(0, 5).map((issue) => (
                  <button
                    key={issue.id}
                    onClick={() => handleOpenIssue(issue.html_url)}
                    className="w-full flex items-start gap-2 p-2 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-left transition-colors"
                  >
                    <AlertCircle
                      className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        issue.state === 'open'
                          ? 'text-success-600'
                          : 'text-neutral-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        #{issue.number}: {issue.title}
                      </p>
                      {issue.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {issue.labels.slice(0, 3).map((label) => (
                            <span
                              key={label.name}
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: `#${label.color}20`,
                                color: `#${label.color}`,
                              }}
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
                {issues.length > 5 && (
                  <p className="text-xs text-center text-neutral-500 pt-1">
                    and {issues.length - 5} more issue{issues.length - 5 !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </IntegrationCard>
  );
}
