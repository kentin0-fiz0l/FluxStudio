/**
 * Integrations API endpoints (Figma, Slack, GitHub)
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function integrationsApi(service: ApiService) {
  return {
    // General OAuth
    getAuthUrl(provider: string) {
      return service.makeRequest(buildApiUrl(`/integrations/${provider}/auth`));
    },

    handleCallback(provider: string, data: { code: string; state: string }) {
      return service.makeRequest(buildApiUrl(`/integrations/${provider}/callback`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    listIntegrations() {
      return service.makeRequest(buildApiUrl('/integrations'));
    },

    disconnectIntegration(provider: string) {
      return service.makeRequest(buildApiUrl(`/integrations/${provider}`), {
        method: 'DELETE',
      });
    },

    // Figma
    figma: {
      getFiles() {
        return service.makeRequest(buildApiUrl('/integrations/figma/files'));
      },

      getFile(fileKey: string) {
        return service.makeRequest(buildApiUrl(`/integrations/figma/files/${fileKey}`));
      },

      getComments(fileKey: string) {
        return service.makeRequest(buildApiUrl(`/integrations/figma/comments/${fileKey}`));
      },
    },

    // Slack
    slack: {
      getChannels() {
        return service.makeRequest(buildApiUrl('/integrations/slack/channels'));
      },

      sendMessage(data: { channel: string; text: string; blocks?: unknown[] }) {
        return service.makeRequest(buildApiUrl('/integrations/slack/message'), {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      sendProjectUpdate(data: { channel: string; projectName: string; updateType: string; details?: string }) {
        return service.makeRequest(buildApiUrl('/integrations/slack/project-update'), {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
    },

    // GitHub
    github: {
      getUser() {
        return service.makeRequest(buildApiUrl('/integrations/github/user'));
      },

      getRepositories(params?: { type?: string; sort?: string; direction?: string; per_page?: number }) {
        const query = params ? '?' + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
        ).toString() : '';
        return service.makeRequest(buildApiUrl(`/integrations/github/repositories${query}`));
      },

      getRepository(owner: string, repo: string) {
        return service.makeRequest(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}`));
      },

      getIssues(owner: string, repo: string, params?: { state?: string; labels?: string; sort?: string; direction?: string; per_page?: number }) {
        const query = params ? '?' + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
        ).toString() : '';
        return service.makeRequest(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/issues${query}`));
      },

      getIssue(owner: string, repo: string, issueNumber: number) {
        return service.makeRequest(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/issues/${issueNumber}`));
      },

      createIssue(owner: string, repo: string, data: { title: string; body?: string; labels?: string[]; assignees?: string[] }) {
        return service.makeRequest(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/issues`), {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      updateIssue(owner: string, repo: string, issueNumber: number, data: { title?: string; body?: string; state?: string; labels?: string[]; assignees?: string[] }) {
        return service.makeRequest(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/issues/${issueNumber}`), {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },

      addIssueComment(owner: string, repo: string, issueNumber: number, data: { body: string }) {
        return service.makeRequest(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/issues/${issueNumber}/comments`), {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      getPullRequests(owner: string, repo: string, params?: { state?: string; sort?: string; direction?: string; per_page?: number }) {
        const query = params ? '?' + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
        ).toString() : '';
        return service.makeRequest(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/pulls${query}`));
      },

      getCommits(owner: string, repo: string, params?: { sha?: string; path?: string; per_page?: number }) {
        const query = params ? '?' + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
        ).toString() : '';
        return service.makeRequest(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/commits${query}`));
      },

      getBranches(owner: string, repo: string) {
        return service.makeRequest(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/branches`));
      },

      getCollaborators(owner: string, repo: string) {
        return service.makeRequest(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/collaborators`));
      },

      linkRepository(owner: string, repo: string, data: { projectId: string }) {
        return service.makeRequest(buildApiUrl(`/integrations/github/repositories/${owner}/${repo}/link`), {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      syncRepository(linkId: string) {
        return service.makeRequest(buildApiUrl(`/integrations/github/sync/${linkId}`), {
          method: 'POST',
        });
      },

      startAutoSync() {
        return service.makeRequest(buildApiUrl('/integrations/github/sync/start'), {
          method: 'POST',
        });
      },

      stopAutoSync() {
        return service.makeRequest(buildApiUrl('/integrations/github/sync/stop'), {
          method: 'POST',
        });
      },

      getSyncStatus(linkId: string) {
        return service.makeRequest(buildApiUrl(`/integrations/github/sync/status/${linkId}`));
      },
    },
  };
}
