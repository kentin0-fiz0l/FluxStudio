/**
 * Custom Roles API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function rolesApi(service: ApiService) {
  return {
    listRoles(orgId: string) {
      return service.makeRequest(buildApiUrl(`/organizations/${orgId}/roles`));
    },

    createRole(orgId: string, data: { name: string; slug: string; permissions?: string[] }) {
      return service.makeRequest(buildApiUrl(`/organizations/${orgId}/roles`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateRole(orgId: string, slug: string, data: { name?: string; permissions?: string[] }) {
      return service.makeRequest(buildApiUrl(`/organizations/${orgId}/roles/${slug}`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    deleteRole(orgId: string, slug: string) {
      return service.makeRequest(buildApiUrl(`/organizations/${orgId}/roles/${slug}`), {
        method: 'DELETE',
      });
    },
  };
}
