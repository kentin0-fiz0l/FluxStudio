/**
 * Feedback API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function feedbackApi(service: ApiService) {
  return {
    submitFeedback(data: { type: string; message: string; pageUrl?: string }) {
      return service.makeRequest(buildApiUrl('/feedback'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    listFeedback(params?: { page?: number; limit?: number }) {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      const qs = query.toString();
      return service.makeRequest(buildApiUrl(`/feedback/admin${qs ? `?${qs}` : ''}`));
    },
  };
}
