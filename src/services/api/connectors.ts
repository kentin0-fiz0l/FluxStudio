/**
 * Connectors API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function connectorsApi(service: ApiService) {
  return {
    getConnectors() {
      return service.makeRequest(buildApiUrl('/connectors/list'));
    },

    connectProvider(provider: string) {
      return service.makeRequest(buildApiUrl(`/connectors/${provider}/auth-url`));
    },

    disconnectProvider(provider: string) {
      return service.makeRequest(buildApiUrl(`/connectors/${provider}`), {
        method: 'DELETE',
      });
    },

    getConnectorStatus(provider: string) {
      return service.makeRequest(buildApiUrl(`/connectors/${provider}/status`));
    },

    getConnectorFiles(provider: string, params?: {
      path?: string;
      folderId?: string;
      owner?: string;
      repo?: string;
    }) {
      const query = new URLSearchParams();
      if (params?.path) query.set('path', params.path);
      if (params?.folderId) query.set('folderId', params.folderId);
      if (params?.owner) query.set('owner', params.owner);
      if (params?.repo) query.set('repo', params.repo);
      const qs = query.toString();
      return service.makeRequest(buildApiUrl(`/connectors/${provider}/files${qs ? `?${qs}` : ''}`));
    },

    importFile(provider: string, data: {
      fileId: string;
      projectId?: string;
      organizationId?: string;
    }) {
      return service.makeRequest(buildApiUrl(`/connectors/${provider}/import`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getImportedFiles(params?: {
      provider?: string;
      projectId?: string;
      limit?: number;
      offset?: number;
    }) {
      const query = new URLSearchParams();
      if (params?.provider) query.set('provider', params.provider);
      if (params?.projectId) query.set('projectId', params.projectId);
      if (params?.limit !== undefined) query.set('limit', String(params.limit));
      if (params?.offset !== undefined) query.set('offset', String(params.offset));
      const qs = query.toString();
      return service.makeRequest(buildApiUrl(`/connectors/files${qs ? `?${qs}` : ''}`));
    },

    linkFileToProject(fileId: string, data: { projectId: string }) {
      return service.makeRequest(buildApiUrl(`/connectors/files/${fileId}/link`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    deleteImportedFile(fileId: string) {
      return service.makeRequest(buildApiUrl(`/connectors/files/${fileId}`), {
        method: 'DELETE',
      });
    },

    getSyncJobs(params?: { provider?: string; limit?: number }) {
      const query = new URLSearchParams();
      if (params?.provider) query.set('provider', params.provider);
      if (params?.limit !== undefined) query.set('limit', String(params.limit));
      const qs = query.toString();
      return service.makeRequest(buildApiUrl(`/connectors/sync-jobs${qs ? `?${qs}` : ''}`));
    },

    triggerSync(provider: string) {
      return service.makeRequest(buildApiUrl(`/connectors/${provider}/sync`), {
        method: 'POST',
      });
    },

    refreshToken(provider: string) {
      return service.makeRequest(buildApiUrl(`/connectors/${provider}/refresh`), {
        method: 'POST',
      });
    },
  };
}
