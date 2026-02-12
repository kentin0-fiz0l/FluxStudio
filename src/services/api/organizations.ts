/**
 * Organization & Team API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';
import {
  validate,
  createOrganizationSchema,
  updateOrganizationSchema,
  createTeamSchema,
  updateTeamSchema,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  CreateTeamInput,
  UpdateTeamInput,
} from '../apiValidation';

export function organizationsApi(service: ApiService) {
  return {
    getOrganizations() {
      return service.makeRequest(buildApiUrl('/organizations'));
    },

    createOrganization(data: CreateOrganizationInput) {
      const validated = validate(createOrganizationSchema, data);
      return service.makeRequest(buildApiUrl('/organizations'), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    updateOrganization(id: string, data: UpdateOrganizationInput) {
      const validated = validate(updateOrganizationSchema, data);
      return service.makeRequest(buildApiUrl(`/organizations/${id}`), {
        method: 'PUT',
        body: JSON.stringify(validated),
      });
    },

    deleteOrganization(id: string) {
      return service.makeRequest(buildApiUrl(`/organizations/${id}`), { method: 'DELETE' });
    },

    getTeams(organizationId: string) {
      return service.makeRequest(buildApiUrl(`/organizations/${organizationId}/teams`));
    },

    createTeam(organizationId: string, data: CreateTeamInput) {
      const validated = validate(createTeamSchema, data);
      return service.makeRequest(buildApiUrl(`/organizations/${organizationId}/teams`), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },

    updateTeam(id: string, data: UpdateTeamInput) {
      const validated = validate(updateTeamSchema, data);
      return service.makeRequest(buildApiUrl(`/teams/${id}`), {
        method: 'PUT',
        body: JSON.stringify(validated),
      });
    },

    deleteTeam(id: string) {
      return service.makeRequest(buildApiUrl(`/teams/${id}`), { method: 'DELETE' });
    },
  };
}
