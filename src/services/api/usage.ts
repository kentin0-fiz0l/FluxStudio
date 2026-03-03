/**
 * Usage API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function usageApi(service: ApiService) {
  return {
    getPlanUsage() {
      return service.makeRequest(buildApiUrl('/usage'));
    },

    getPlanLimits() {
      return service.makeRequest(buildApiUrl('/usage/limits'));
    },
  };
}
