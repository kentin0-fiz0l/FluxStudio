/**
 * Templates API endpoints — Browse and manage project templates
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function templatesApi(service: ApiService) {
  return {
    listTemplates(params?: {
      category?: string;
      complexity?: string;
      featured?: boolean;
      search?: string;
      sortBy?: string;
    }) {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.complexity) searchParams.set('complexity', params.complexity);
      if (params?.featured !== undefined) searchParams.set('featured', String(params.featured));
      if (params?.search) searchParams.set('search', params.search);
      if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
      const qs = searchParams.toString();
      return service.makeRequest(buildApiUrl(`/templates${qs ? `?${qs}` : ''}`));
    },

    getTemplate(id: string) {
      return service.makeRequest(buildApiUrl(`/templates/${id}`));
    },

    createCustomTemplate(data: {
      name: string;
      description?: string;
      category?: string;
      structure?: Record<string, unknown>;
      variables?: Array<Record<string, unknown>>;
      sourceProjectId?: string;
    }) {
      return service.makeRequest(buildApiUrl('/templates/custom'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    deleteCustomTemplate(id: string) {
      return service.makeRequest(buildApiUrl(`/templates/custom/${id}`), {
        method: 'DELETE',
      });
    },
  };
}
