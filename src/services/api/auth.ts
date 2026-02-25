/**
 * Auth API endpoints
 */

import { buildAuthUrl } from '../../config/environment';
import type { ApiResponse, ApiService, UserSettings } from './base';

export function authApi(service: ApiService) {
  return {
    login(email: string, password: string) {
      return service.makeRequest(buildAuthUrl('/login'), {
        method: 'POST',
        requireAuth: false,
        body: JSON.stringify({ email, password }),
      });
    },

    signup(email: string, password: string, name: string, userType: string, referralCode?: string, inviteCode?: string) {
      return service.makeRequest(buildAuthUrl('/signup'), {
        method: 'POST',
        requireAuth: false,
        body: JSON.stringify({ email, password, name, userType, referralCode, inviteCode }),
      });
    },

    loginWithGoogle(credential: string) {
      return service.makeRequest(buildAuthUrl('/google'), {
        method: 'POST',
        requireAuth: false,
        body: JSON.stringify({ credential }),
      });
    },

    logout() {
      return service.makeRequest(buildAuthUrl('/logout'), { method: 'POST' });
    },

    getMe() {
      return service.makeRequest(buildAuthUrl('/me'));
    },

    getSettings(): Promise<ApiResponse<{ success: boolean; settings: UserSettings }>> {
      return service.makeRequest(buildAuthUrl('/settings'));
    },

    saveSettings(settings: UserSettings): Promise<ApiResponse<{ success: boolean; settings: UserSettings; message: string }>> {
      return service.makeRequest(buildAuthUrl('/settings'), {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      });
    },
  };
}
