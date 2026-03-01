/**
 * Assets API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export interface ListAssetsParams {
  search?: string;
  kind?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CreateAssetInput {
  fileId: string;
  name?: string;
  kind?: string;
  description?: string;
  tags?: string[];
}

export interface UpdateAssetInput {
  name?: string;
  description?: string;
  tags?: string[];
  status?: string;
  kind?: string;
}

export interface CreateAssetVersionInput {
  fileId: string;
  label?: string;
  makePrimary?: boolean;
}

export interface AttachProjectAssetInput {
  assetId: string;
  role?: string;
  sortOrder?: number;
}

export function assetsApi(service: ApiService) {
  return {
    listAssets(params: ListAssetsParams = {}) {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.kind) query.set('kind', params.kind);
      if (params.status) query.set('status', params.status);
      if (params.limit != null) query.set('limit', String(params.limit));
      if (params.offset != null) query.set('offset', String(params.offset));
      const qs = query.toString();
      return service.makeRequest(buildApiUrl(`/assets${qs ? `?${qs}` : ''}`));
    },

    getAssetStats() {
      return service.makeRequest(buildApiUrl('/assets/stats'));
    },

    createAsset(input: CreateAssetInput) {
      return service.makeRequest(buildApiUrl('/assets'), {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    getAsset(assetId: string) {
      return service.makeRequest(buildApiUrl(`/assets/${assetId}`));
    },

    updateAsset(assetId: string, input: UpdateAssetInput) {
      return service.makeRequest(buildApiUrl(`/assets/${assetId}`), {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    },

    deleteAsset(assetId: string) {
      return service.makeRequest(buildApiUrl(`/assets/${assetId}`), {
        method: 'DELETE',
      });
    },

    createAssetVersion(assetId: string, input: CreateAssetVersionInput) {
      return service.makeRequest(buildApiUrl(`/assets/${assetId}/versions`), {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    getAssetVersions(assetId: string) {
      return service.makeRequest(buildApiUrl(`/assets/${assetId}/versions`));
    },

    setPrimaryVersion(assetId: string, versionId: string) {
      return service.makeRequest(buildApiUrl(`/assets/${assetId}/primary`), {
        method: 'POST',
        body: JSON.stringify({ versionId }),
      });
    },

    getAssetProjects(assetId: string) {
      return service.makeRequest(buildApiUrl(`/assets/${assetId}/projects`));
    },

    attachProjectAsset(projectId: string, input: AttachProjectAssetInput) {
      return service.makeRequest(buildApiUrl(`/assets/projects/${projectId}/assets`), {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    detachProjectAsset(projectId: string, assetId: string) {
      return service.makeRequest(buildApiUrl(`/assets/projects/${projectId}/assets/${assetId}`), {
        method: 'DELETE',
      });
    },
  };
}
