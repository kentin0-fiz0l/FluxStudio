/**
 * Referrals API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function referralsApi(service: ApiService) {
  return {
    getReferralCode() {
      return service.makeRequest(buildApiUrl('/referrals/code'));
    },

    getReferralStats() {
      return service.makeRequest(buildApiUrl('/referrals/stats'));
    },

    validateReferralCode(code: string) {
      return service.makeRequest(buildApiUrl(`/referrals/validate/${encodeURIComponent(code)}`));
    },
  };
}
