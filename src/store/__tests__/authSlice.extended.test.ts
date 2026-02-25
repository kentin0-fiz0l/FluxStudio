import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

vi.mock('../store', () => ({ useStore: vi.fn() }));

const mockApiService = vi.hoisted(() => ({
  login: vi.fn(),
  signup: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
}));

vi.mock('../../services/apiService', () => ({
  apiService: mockApiService,
}));

import { createAuthSlice, type AuthSlice } from '../slices/authSlice';

function createTestStore() {
  return create<AuthSlice>()(
    immer((...args) => ({
      ...createAuthSlice(...(args as Parameters<typeof createAuthSlice>)),
    }))
  );
}

describe('authSlice - extended coverage', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('signup', () => {
    it('should authenticate on successful signup', async () => {
      const mockUser = { id: '2', email: 'new@test.com', name: 'New', userType: 'designer' as const };
      mockApiService.signup.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser, token: 'signup-tok', refreshToken: 'rt-1' },
      });

      const result = await store.getState().auth.signup('new@test.com', 'pass123', 'New', 'designer');

      expect(result).toEqual(mockUser);
      expect(store.getState().auth.isAuthenticated).toBe(true);
      expect(store.getState().auth.user).toEqual(mockUser);
      expect(localStorage.getItem('auth_token')).toBe('signup-tok');
      expect(localStorage.getItem('refresh_token')).toBe('rt-1');
    });

    it('should throw on failed signup', async () => {
      mockApiService.signup.mockResolvedValueOnce({
        success: false,
        error: 'Email taken',
      });

      await expect(
        store.getState().auth.signup('dup@test.com', 'pass', 'Dup', 'client')
      ).rejects.toThrow('Email taken');

      expect(store.getState().auth.error).toBe('Email taken');
      expect(store.getState().auth.isLoading).toBe(false);
    });

    it('should handle network error on signup', async () => {
      mockApiService.signup.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        store.getState().auth.signup('a@b.com', 'p', 'N', 'designer')
      ).rejects.toThrow('Connection refused');

      expect(store.getState().auth.error).toBe('Connection refused');
    });
  });

  describe('loginWithGoogle', () => {
    it('should authenticate with Google credential', async () => {
      const mockUser = { id: '3', email: 'google@test.com', name: 'Google User' };
      mockApiService.loginWithGoogle.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser, accessToken: 'goog-tok' },
      });

      const result = await store.getState().auth.loginWithGoogle('google-cred-xyz');

      expect(result).toEqual(mockUser);
      expect(store.getState().auth.isAuthenticated).toBe(true);
      expect(localStorage.getItem('auth_token')).toBe('goog-tok');
    });

    it('should throw on failed Google login', async () => {
      mockApiService.loginWithGoogle.mockResolvedValueOnce({
        success: false,
        error: 'Invalid token',
      });

      await expect(
        store.getState().auth.loginWithGoogle('bad-cred')
      ).rejects.toThrow('Invalid token');
    });
  });

  describe('checkAuth', () => {
    it('should set user when token exists and getMe succeeds', async () => {
      localStorage.setItem('auth_token', 'valid-tok');
      const mockUser = { id: '1', email: 'me@test.com', name: 'Me' };
      mockApiService.getMe.mockResolvedValueOnce({
        success: true,
        data: mockUser,
      });

      await store.getState().auth.checkAuth();

      expect(store.getState().auth.user).toEqual(mockUser);
      expect(store.getState().auth.isAuthenticated).toBe(true);
      expect(store.getState().auth.isLoading).toBe(false);
    });

    it('should clear auth when no token', async () => {
      await store.getState().auth.checkAuth();

      expect(store.getState().auth.user).toBeNull();
      expect(store.getState().auth.isAuthenticated).toBe(false);
      expect(store.getState().auth.isLoading).toBe(false);
    });

    it('should try refresh when getMe fails', async () => {
      localStorage.setItem('auth_token', 'expired-tok');
      localStorage.setItem('refresh_token', 'rt');
      mockApiService.getMe.mockResolvedValueOnce({ success: false });

      // Mock refresh fetch to fail
      global.fetch = vi.fn().mockResolvedValue({ ok: false });

      await store.getState().auth.checkAuth();

      expect(store.getState().auth.isAuthenticated).toBe(false);
      expect(store.getState().auth.isLoading).toBe(false);
    });

    it('should handle getMe throwing and attempt refresh', async () => {
      localStorage.setItem('auth_token', 'tok');
      localStorage.setItem('refresh_token', 'rt');
      mockApiService.getMe.mockRejectedValueOnce(new Error('Network'));

      // Refresh also fails
      global.fetch = vi.fn().mockResolvedValue({ ok: false });

      await store.getState().auth.checkAuth();

      expect(store.getState().auth.isAuthenticated).toBe(false);
      expect(store.getState().auth.isLoading).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('setAuthToken', () => {
    it('should store tokens and fetch user', async () => {
      const mockUser = { id: '5', email: 'tok@test.com', name: 'Token User' };
      mockApiService.getMe.mockResolvedValueOnce({
        success: true,
        data: mockUser,
      });

      await store.getState().auth.setAuthToken('new-tok', 'new-rt');

      expect(localStorage.getItem('auth_token')).toBe('new-tok');
      expect(localStorage.getItem('refresh_token')).toBe('new-rt');
      expect(store.getState().auth.user).toEqual(mockUser);
      expect(store.getState().auth.isAuthenticated).toBe(true);
    });

    it('should handle getMe failure gracefully', async () => {
      mockApiService.getMe.mockRejectedValueOnce(new Error('fail'));

      await store.getState().auth.setAuthToken('tok');
      // Should not throw, just not set user
      expect(localStorage.getItem('auth_token')).toBe('tok');
    });
  });

  describe('logout clears tokens even if API fails', () => {
    it('should clear state even when logout API throws', async () => {
      store.getState().auth.setUser({ id: '1', email: 'a@b.com' });
      localStorage.setItem('auth_token', 'tok');
      mockApiService.logout.mockRejectedValueOnce(new Error('API down'));

      await store.getState().auth.logout();

      expect(store.getState().auth.user).toBeNull();
      expect(store.getState().auth.isAuthenticated).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('session persistence', () => {
    it('updateSession should persist to localStorage', () => {
      store.getState().auth.updateSession({ lastRoute: '/test' });
      const stored = JSON.parse(localStorage.getItem('fluxstudio.session')!);
      expect(stored.lastRoute).toBe('/test');
    });

    it('clearSession should remove from localStorage', () => {
      store.getState().auth.updateSession({ lastRoute: '/x' });
      store.getState().auth.clearSession();
      expect(localStorage.getItem('fluxstudio.session')).toBeNull();
    });
  });
});
