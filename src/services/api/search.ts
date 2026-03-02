/**
 * Search API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function searchApi(service: ApiService) {
  return {
    search(params: { q: string; types?: string; limit?: number; offset?: number; sortBy?: string; sortOrder?: string }) {
      const searchParams = new URLSearchParams();
      searchParams.set('q', params.q);
      if (params.types) searchParams.set('types', params.types);
      if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
      if (params.offset !== undefined) searchParams.set('offset', String(params.offset));
      if (params.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
      return service.makeRequest(buildApiUrl(`/search?${searchParams.toString()}`));
    },
  };
}
