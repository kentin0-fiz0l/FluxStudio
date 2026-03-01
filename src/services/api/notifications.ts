/**
 * Notifications API endpoints
 */

import { buildApiUrl } from '../../config/environment';
import type { ApiService } from './base';

export interface ListNotificationsParams {
  limit?: number;
  offset?: number;
  onlyUnread?: boolean;
  projectId?: string;
}

export interface NotificationPreferences {
  push?: boolean;
  emailDigest?: boolean;
  frequency?: 'realtime' | 'hourly' | 'daily';
  quietHours?: {
    enabled?: boolean;
    startTime?: string;
    endTime?: string;
  };
}

export function notificationsApi(service: ApiService) {
  return {
    listNotifications(params: ListNotificationsParams = {}) {
      const query = new URLSearchParams();
      if (params.limit != null) query.set('limit', String(params.limit));
      if (params.offset != null) query.set('offset', String(params.offset));
      if (params.onlyUnread) query.set('onlyUnread', 'true');
      if (params.projectId) query.set('projectId', params.projectId);
      const qs = query.toString();
      return service.makeRequest(buildApiUrl(`/notifications${qs ? `?${qs}` : ''}`));
    },

    markAsRead(notificationId: string) {
      return service.makeRequest(buildApiUrl(`/notifications/${notificationId}/read`), {
        method: 'POST',
      });
    },

    markAllAsRead() {
      return service.makeRequest(buildApiUrl('/notifications/read-all'), {
        method: 'POST',
      });
    },

    getUnreadCount() {
      return service.makeRequest(buildApiUrl('/notifications/unread-count'));
    },

    getPreferences() {
      return service.makeRequest(buildApiUrl('/notifications/preferences'));
    },

    updatePreferences(preferences: NotificationPreferences) {
      return service.makeRequest(buildApiUrl('/notifications/preferences'), {
        method: 'PUT',
        body: JSON.stringify(preferences),
      });
    },
  };
}
