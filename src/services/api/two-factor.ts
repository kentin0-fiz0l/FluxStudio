/**
 * Two-Factor Authentication API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function twoFactorApi(service: ApiService) {
  return {
    setup() {
      return service.makeRequest(buildApiUrl('/2fa/setup'), {
        method: 'POST',
      });
    },

    verifySetup(code: string) {
      return service.makeRequest(buildApiUrl('/2fa/verify-setup'), {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
    },

    disable(code: string) {
      return service.makeRequest(buildApiUrl('/2fa/disable'), {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
    },

    verify(tempToken: string, code: string) {
      return service.makeRequest(buildApiUrl('/2fa/verify'), {
        method: 'POST',
        requireAuth: false,
        body: JSON.stringify({ tempToken, code }),
      });
    },
  };
}
