/**
 * Analytics API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export interface IngestEventInput {
  eventName: string;
  properties?: Record<string, unknown>;
  sessionId?: string;
}

export interface FunnelQueryParams {
  start?: string;
  end?: string;
}

export function analyticsApi(service: ApiService) {
  return {
    getProjectHealth(projectId: string) {
      return service.makeRequest(buildApiUrl(`/analytics/project/${projectId}/health`));
    },

    getProjectBurndown(projectId: string) {
      return service.makeRequest(buildApiUrl(`/analytics/project/${projectId}/burndown`));
    },

    getProjectVelocity(projectId: string) {
      return service.makeRequest(buildApiUrl(`/analytics/project/${projectId}/velocity`));
    },

    getTeamWorkload(teamId: string) {
      return service.makeRequest(buildApiUrl(`/analytics/team/${teamId}/workload`));
    },

    getProjectRisks(projectId: string) {
      return service.makeRequest(buildApiUrl(`/analytics/project/${projectId}/risks`));
    },

    ingestEvent(input: IngestEventInput) {
      return service.makeRequest(buildApiUrl('/analytics/events'), {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    queryFunnel(params: FunnelQueryParams = {}) {
      const query = new URLSearchParams();
      if (params.start) query.set('start', params.start);
      if (params.end) query.set('end', params.end);
      const qs = query.toString();
      return service.makeRequest(buildApiUrl(`/analytics/funnel${qs ? `?${qs}` : ''}`));
    },
  };
}
