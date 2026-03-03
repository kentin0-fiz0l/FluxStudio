/**
 * Push Notification API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function pushApi(service: ApiService) {
  return {
    pushSubscribe(data: { endpoint: string; keys: { p256dh: string; auth: string } }) {
      return service.makeRequest(buildApiUrl('/push/subscribe'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    pushUnsubscribe(data: { endpoint: string }) {
      return service.makeRequest(buildApiUrl('/push/unsubscribe'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getPushPreferences() {
      return service.makeRequest(buildApiUrl('/push/preferences'));
    },

    updatePushPreferences(data: {
      pushEnabled?: boolean;
      pushMessages?: boolean;
      pushProjectUpdates?: boolean;
      pushMentions?: boolean;
      pushComments?: boolean;
      quietHoursStart?: string | null;
      quietHoursEnd?: string | null;
    }) {
      return service.makeRequest(buildApiUrl('/push/preferences'), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    getPushStatus() {
      return service.makeRequest(buildApiUrl('/push/status'));
    },
  };
}
