/**
 * Compliance API endpoints (GDPR/CCPA)
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function complianceApi(service: ApiService) {
  return {
    requestDataExport() {
      return service.makeRequest(buildApiUrl('/compliance/data-export'), {
        method: 'POST',
      });
    },

    getExportStatus(exportId: string) {
      return service.makeRequest(buildApiUrl(`/compliance/data-export/${exportId}`));
    },

    downloadExport(exportId: string) {
      return service.makeRequest(buildApiUrl(`/compliance/data-export/${exportId}/download`));
    },

    requestAccountDeletion(reason?: string) {
      return service.makeRequest(buildApiUrl('/compliance/delete-account'), {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },

    cancelAccountDeletion() {
      return service.makeRequest(buildApiUrl('/compliance/cancel-deletion'), {
        method: 'POST',
      });
    },

    getConsents() {
      return service.makeRequest(buildApiUrl('/compliance/consents'));
    },

    updateConsents(consents: Record<string, boolean>) {
      return service.makeRequest(buildApiUrl('/compliance/consents'), {
        method: 'PUT',
        body: JSON.stringify({ consents }),
      });
    },
  };
}
