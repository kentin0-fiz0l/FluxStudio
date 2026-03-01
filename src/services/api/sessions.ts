/**
 * Sessions API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function sessionsApi(service: ApiService) {
  return {
    listSessions() {
      return service.makeRequest(buildApiUrl('/sessions'));
    },

    revokeSession(sessionId: string) {
      return service.makeRequest(buildApiUrl(`/sessions/${sessionId}`), {
        method: 'DELETE',
      });
    },

    revokeAllSessions() {
      return service.makeRequest(buildApiUrl('/sessions'), {
        method: 'DELETE',
      });
    },
  };
}
