/**
 * Support API endpoints — Ticket submission and categories
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function supportApi(service: ApiService) {
  return {
    submitTicket(data: {
      name: string;
      email: string;
      category?: string;
      subject: string;
      message: string;
    }) {
      return service.makeRequest(buildApiUrl('/support/ticket'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getCategories() {
      return service.makeRequest(buildApiUrl('/support/categories'));
    },
  };
}
