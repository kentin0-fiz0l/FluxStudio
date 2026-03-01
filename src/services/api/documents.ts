/**
 * Documents API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export interface ListDocumentsParams {
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateDocumentInput {
  title: string;
  documentType?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateDocumentInput {
  title?: string;
  documentType?: string;
  isArchived?: boolean;
}

export interface GetVersionsParams {
  limit?: number;
  offset?: number;
}

export function documentsApi(service: ApiService) {
  return {
    listDocuments(projectId: string, params: ListDocumentsParams = {}) {
      const query = new URLSearchParams();
      if (params.includeArchived) query.set('includeArchived', 'true');
      if (params.limit != null) query.set('limit', String(params.limit));
      if (params.offset != null) query.set('offset', String(params.offset));
      const qs = query.toString();
      return service.makeRequest(buildApiUrl(`/projects/${projectId}/documents${qs ? `?${qs}` : ''}`));
    },

    createDocument(projectId: string, input: CreateDocumentInput) {
      return service.makeRequest(buildApiUrl(`/projects/${projectId}/documents`), {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    getDocument(documentId: string) {
      return service.makeRequest(buildApiUrl(`/documents/${documentId}`));
    },

    updateDocument(documentId: string, input: UpdateDocumentInput) {
      return service.makeRequest(buildApiUrl(`/documents/${documentId}`), {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    },

    deleteDocument(documentId: string) {
      return service.makeRequest(buildApiUrl(`/documents/${documentId}`), {
        method: 'DELETE',
      });
    },

    getDocumentVersions(documentId: string, params: GetVersionsParams = {}) {
      const query = new URLSearchParams();
      if (params.limit != null) query.set('limit', String(params.limit));
      if (params.offset != null) query.set('offset', String(params.offset));
      const qs = query.toString();
      return service.makeRequest(buildApiUrl(`/documents/${documentId}/versions${qs ? `?${qs}` : ''}`));
    },

    getVersionSnapshot(documentId: string, versionNumber: number) {
      return service.makeRequest(buildApiUrl(`/documents/${documentId}/versions/${versionNumber}`));
    },

    getVersionDiff(documentId: string, v1: number, v2: number) {
      return service.makeRequest(buildApiUrl(`/documents/${documentId}/versions/${v1}/diff/${v2}`));
    },
  };
}
