/**
 * Account API endpoints — GDPR Data Export & Deletion
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function accountApi(service: ApiService) {
  return {
    exportData() {
      return service.makeRequest(buildApiUrl('/account/export'));
    },

    requestDeletion(data: { reason?: string }) {
      return service.makeRequest(buildApiUrl('/account/delete'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    cancelDeletion() {
      return service.makeRequest(buildApiUrl('/account/delete'), {
        method: 'DELETE',
      });
    },

    getDeletionStatus() {
      return service.makeRequest(buildApiUrl('/account/delete/status'));
    },
  };
}
