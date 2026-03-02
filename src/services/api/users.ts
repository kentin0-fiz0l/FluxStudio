/**
 * Users API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function usersApi(service: ApiService) {
  return {
    listUsers(params?: { search?: string; limit?: number; excludeSelf?: boolean; status?: string; role?: string; page?: number }) {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
      if (params?.excludeSelf !== undefined) searchParams.set('excludeSelf', String(params.excludeSelf));
      if (params?.status) searchParams.set('status', params.status);
      if (params?.role) searchParams.set('role', params.role);
      if (params?.page !== undefined) searchParams.set('page', String(params.page));
      const qs = searchParams.toString();
      return service.makeRequest(buildApiUrl(`/users${qs ? `?${qs}` : ''}`));
    },

    getUser(userId: string) {
      return service.makeRequest(buildApiUrl(`/users/${encodeURIComponent(userId)}`));
    },

    updateUser(id: string, data: { status?: string; role?: string; name?: string }) {
      return service.makeRequest(buildApiUrl(`/users/${encodeURIComponent(id)}`), {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    deleteUser(id: string) {
      return service.makeRequest(buildApiUrl(`/users/${encodeURIComponent(id)}`), {
        method: 'DELETE',
      });
    },
  };
}
