/**
 * Auth API endpoints — with Zod response validation
 */

import { buildAuthUrl } from '../../config/environment';
import type { ApiResponse, ApiService, UserSettings } from './base';
import {
  authResponseSchema,
  userResponseSchema,
  type AuthResponse,
  type UserResponse,
} from '../apiValidation';

export function authApi(service: ApiService) {
  return {
    login(email: string, password: string) {
      return service.makeValidatedRequest<AuthResponse>(
        buildAuthUrl('/login'),
        authResponseSchema,
        { method: 'POST', requireAuth: false, body: JSON.stringify({ email, password }) },
      );
    },

    signup(email: string, password: string, name: string, userType: string, referralCode?: string, inviteCode?: string) {
      return service.makeValidatedRequest<AuthResponse>(
        buildAuthUrl('/signup'),
        authResponseSchema,
        { method: 'POST', requireAuth: false, body: JSON.stringify({ email, password, name, userType, referralCode, inviteCode }) },
      );
    },

    loginWithGoogle(credential: string) {
      return service.makeValidatedRequest<AuthResponse>(
        buildAuthUrl('/google'),
        authResponseSchema,
        { method: 'POST', requireAuth: false, body: JSON.stringify({ credential }) },
      );
    },

    logout() {
      return service.makeRequest(buildAuthUrl('/logout'), { method: 'POST' });
    },

    getMe() {
      return service.makeValidatedRequest<UserResponse>(
        buildAuthUrl('/me'),
        userResponseSchema,
      );
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
