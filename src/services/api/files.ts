/**
 * Files API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function filesApi(service: ApiService) {
  return {
    getFiles(params?: {
      projectId?: string;
      type?: string;
      source?: string;
      search?: string;
      limit?: number;
      offset?: number;
      sort?: string;
    }) {
      const query = new URLSearchParams();
      if (params?.projectId) query.set('projectId', params.projectId);
      if (params?.type) query.set('type', params.type);
      if (params?.source) query.set('source', params.source);
      if (params?.search) query.set('search', params.search);
      if (params?.limit !== undefined) query.set('limit', String(params.limit));
      if (params?.offset !== undefined) query.set('offset', String(params.offset));
      if (params?.sort) query.set('sort', params.sort);
      const qs = query.toString();
      return service.makeRequest(buildApiUrl(`/files${qs ? `?${qs}` : ''}`));
    },

    getFile(fileId: string) {
      return service.makeRequest(buildApiUrl(`/files/${fileId}`));
    },

    uploadFile(formData: FormData) {
      return service.makeRequest(buildApiUrl('/files/upload'), {
        method: 'POST',
        body: formData,
      });
    },

    deleteFile(fileId: string) {
      return service.makeRequest(buildApiUrl(`/files/${fileId}`), {
        method: 'DELETE',
      });
    },

    updateFile(fileId: string, data: { projectId: string; role?: string; notes?: string }) {
      return service.makeRequest(buildApiUrl(`/files/${fileId}/attach`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getFileProjects(fileId: string) {
      return service.makeRequest(buildApiUrl(`/files/${fileId}/projects`));
    },

    detachFileFromProject(fileId: string, projectId: string) {
      return service.makeRequest(buildApiUrl(`/files/${fileId}/attach/${projectId}`), {
        method: 'DELETE',
      });
    },

    getProjectFiles(projectId: string, params?: { limit?: number; offset?: number }) {
      const query = new URLSearchParams();
      if (params?.limit !== undefined) query.set('limit', String(params.limit));
      if (params?.offset !== undefined) query.set('offset', String(params.offset));
      const qs = query.toString();
      return service.makeRequest(buildApiUrl(`/files/project-files/${projectId}${qs ? `?${qs}` : ''}`));
    },
  };
}
