/**
 * Channels API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function channelsApi(service: ApiService) {
  return {
    createChannel(data: { name: string; teamId: string; description?: string }) {
      return service.makeRequest(buildApiUrl('/channels'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getChannelsByTeam(teamId: string) {
      return service.makeRequest(buildApiUrl(`/channels/${encodeURIComponent(teamId)}`));
    },
  };
}
