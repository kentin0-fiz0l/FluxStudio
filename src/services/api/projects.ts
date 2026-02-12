/**
 * Project & File API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiResponse, ApiService } from './base';
import {
  validate,
  createProjectSchema,
  updateProjectSchema,
  fileMetadataSchema,
  CreateProjectInput,
  UpdateProjectInput,
  FileMetadataInput,
} from '../apiValidation';

export function projectsApi(service: ApiService) {
  return {
    getProjects(organizationId?: string, teamId?: string) {
      let url = buildApiUrl('/projects');
      const params = new URLSearchParams();
      if (organizationId) params.append('organizationId', organizationId);
      if (teamId) params.append('teamId', teamId);
      if (params.toString()) url += `?${params.toString()}`;
      return service.makeRequest(url);
    },

    createProject(data: CreateProjectInput) {
      const validated = validate(createProjectSchema, data);
      return service.makeRequest(buildApiUrl('/projects'), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    updateProject(id: string, data: UpdateProjectInput) {
      const validated = validate(updateProjectSchema, data);
      return service.makeRequest(buildApiUrl(`/projects/${id}`), {
        method: 'PUT',
        body: JSON.stringify(validated),
      });
    },

    deleteProject(id: string) {
      return service.makeRequest(buildApiUrl(`/projects/${id}`), { method: 'DELETE' });
    },

    getFiles(projectId: string) {
      return service.makeRequest(buildApiUrl(`/projects/${projectId}/files`));
    },

    uploadFile(projectId: string, file: File, metadata?: FileMetadataInput) {
      const formData = new FormData();
      formData.append('file', file);
      if (metadata) {
        const validatedMetadata = validate(fileMetadataSchema, metadata);
        formData.append('metadata', JSON.stringify(validatedMetadata));
      }
      return service.makeRequest(buildApiUrl(`/projects/${projectId}/files`), {
        method: 'POST',
        body: formData,
      });
    },

    updateFile(id: string, data: FileMetadataInput) {
      const validated = validate(fileMetadataSchema, data);
      return service.makeRequest(buildApiUrl(`/files/${id}`), {
        method: 'PUT',
        body: JSON.stringify(validated),
      });
    },

    deleteFile(id: string) {
      return service.makeRequest(buildApiUrl(`/files/${id}`), { method: 'DELETE' });
    },

    async uploadMultipleFiles(
      projectId: string,
      files: File[],
      onProgress?: (progress: number) => void
    ): Promise<ApiResponse<any>> {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const headers = await service.getDefaultHeaders(true, true, false);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = buildApiUrl(`/projects/${projectId}/files/upload`);

        if (onProgress) {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              onProgress(Math.round((event.loaded / event.total) * 100));
            }
          });
        }

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({ success: true, data, message: data.message });
            } catch (_error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.message || `Upload failed: ${xhr.statusText}`));
            } catch {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', url);
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value as string);
        });
        xhr.withCredentials = true;
        xhr.send(formData);
      });
    },
  };
}
