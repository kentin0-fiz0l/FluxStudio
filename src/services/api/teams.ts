/**
 * Teams API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function teamsApi(service: ApiService) {
  return {
    getTeams() {
      return service.makeRequest(buildApiUrl('/teams'));
    },

    getTeam(teamId: string) {
      return service.makeRequest(buildApiUrl(`/teams/${teamId}`));
    },

    createTeam(data: { name: string; description?: string }) {
      return service.makeRequest(buildApiUrl('/teams'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateTeam(teamId: string, data: { name?: string; description?: string }) {
      return service.makeRequest(buildApiUrl(`/teams/${teamId}`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    deleteTeam(teamId: string) {
      return service.makeRequest(buildApiUrl(`/teams/${teamId}`), {
        method: 'DELETE',
      });
    },

    getTeamMembers(teamId: string) {
      return service.makeRequest(buildApiUrl(`/teams/${teamId}`));
    },

    addTeamMember(teamId: string, data: { email: string; role?: string }) {
      return service.makeRequest(buildApiUrl(`/teams/${teamId}/invite`), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    removeTeamMember(teamId: string, userId: string) {
      return service.makeRequest(buildApiUrl(`/teams/${teamId}/members/${userId}`), {
        method: 'DELETE',
      });
    },

    updateTeamMemberRole(teamId: string, userId: string, data: { role: string }) {
      return service.makeRequest(buildApiUrl(`/teams/${teamId}/members/${userId}`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    acceptInvite(teamId: string) {
      return service.makeRequest(buildApiUrl(`/teams/${teamId}/accept-invite`), {
        method: 'POST',
      });
    },

    getInvites(teamId: string) {
      return service.makeRequest(buildApiUrl(`/teams/${teamId}/invites`));
    },

    cancelInvite(teamId: string, inviteId: string) {
      return service.makeRequest(buildApiUrl(`/teams/${teamId}/invites/${inviteId}`), {
        method: 'DELETE',
      });
    },
  };
}
