/**
 * Plugins API endpoints — CRUD for plugin installations + marketplace
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function pluginsApi(service: ApiService) {
  return {
    listPlugins() {
      return service.makeRequest(buildApiUrl('/plugins'));
    },

    installPlugin(data: { manifest: Record<string, unknown> }) {
      return service.makeRequest(buildApiUrl('/plugins/install'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    activatePlugin(pluginId: string) {
      return service.makeRequest(buildApiUrl(`/plugins/${pluginId}/activate`), {
        method: 'POST',
      });
    },

    deactivatePlugin(pluginId: string) {
      return service.makeRequest(buildApiUrl(`/plugins/${pluginId}/deactivate`), {
        method: 'POST',
      });
    },

    uninstallPlugin(pluginId: string) {
      return service.makeRequest(buildApiUrl(`/plugins/${pluginId}`), {
        method: 'DELETE',
      });
    },

    getPluginSettings(pluginId: string) {
      return service.makeRequest(buildApiUrl(`/plugins/${pluginId}/settings`));
    },

    updatePluginSettings(pluginId: string, data: { settings: Record<string, unknown> }) {
      return service.makeRequest(buildApiUrl(`/plugins/${pluginId}/settings`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    searchMarketplace(params?: {
      query?: string;
      category?: string;
      sortBy?: string;
      page?: number;
      limit?: number;
      featured?: boolean;
      verified?: boolean;
    }) {
      const searchParams = new URLSearchParams();
      if (params?.query) searchParams.set('query', params.query);
      if (params?.category) searchParams.set('category', params.category);
      if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.featured !== undefined) searchParams.set('featured', String(params.featured));
      if (params?.verified !== undefined) searchParams.set('verified', String(params.verified));
      const qs = searchParams.toString();
      return service.makeRequest(buildApiUrl(`/plugins/marketplace${qs ? `?${qs}` : ''}`));
    },
  };
}
