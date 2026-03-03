/**
 * Admin API endpoints (Audit Logs + Feature Flags)
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export function adminApi(service: ApiService) {
  return {
    // Audit Logs
    listAuditLogs(params?: {
      action?: string;
      resource?: string;
      userId?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }) {
      const query = params ? '?' + new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
      ).toString() : '';
      return service.makeRequest(buildApiUrl(`/admin/audit-logs${query}`));
    },

    exportAuditLogs(params?: {
      action?: string;
      resource?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    }) {
      const query = params ? '?' + new URLSearchParams(
        Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
      ).toString() : '';
      return service.makeRequest(buildApiUrl(`/admin/audit-logs/export${query}`));
    },

    // Feature Flags
    listFlags() {
      return service.makeRequest(buildApiUrl('/admin/flags'));
    },

    evaluateFlags() {
      return service.makeRequest(buildApiUrl('/admin/flags/evaluate'));
    },

    createFlag(data: {
      name: string;
      description?: string;
      enabled?: boolean;
      rollout_percentage?: number;
      user_allowlist?: string[];
      metadata?: Record<string, unknown>;
    }) {
      return service.makeRequest(buildApiUrl('/admin/flags'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateFlag(id: string, data: {
      enabled?: boolean;
      description?: string;
      rollout_percentage?: number;
      user_allowlist?: string[];
      metadata?: Record<string, unknown>;
    }) {
      return service.makeRequest(buildApiUrl(`/admin/flags/${id}`), {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    deleteFlag(id: string) {
      return service.makeRequest(buildApiUrl(`/admin/flags/${id}`), {
        method: 'DELETE',
      });
    },
  };
}
