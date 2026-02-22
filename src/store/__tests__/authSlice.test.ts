import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Mock the combined store to break circular dependency
vi.mock('../store', () => ({ useStore: vi.fn() }));

// Mock apiService dynamic import
const mockApiService = {
  login: vi.fn(),
  signup: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
};

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

describe('authSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with null user and isLoading false when no token', () => {
      const { auth } = store.getState();
      expect(auth.user).toBeNull();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.isLoading).toBe(false); // false when no auth_token in localStorage
      expect(auth.error).toBeNull();
      expect(auth.token).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set user and mark as authenticated', () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      store.getState().auth.setUser(user);

      const { auth } = store.getState();
      expect(auth.user).toEqual(user);
      expect(auth.isAuthenticated).toBe(true);
    });

    it('should clear user when null', () => {
      store.getState().auth.setUser({ id: '1', email: 'a@b.com' });
      store.getState().auth.setUser(null);

      expect(store.getState().auth.user).toBeNull();
      expect(store.getState().auth.isAuthenticated).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('should update loading state', () => {
      store.getState().auth.setLoading(false);
      expect(store.getState().auth.isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should update error state', () => {
      store.getState().auth.setError('Something went wrong');
      expect(store.getState().auth.error).toBe('Something went wrong');

      store.getState().auth.setError(null);
      expect(store.getState().auth.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should authenticate on success', async () => {
      const mockUser = { id: '1', email: 'test@test.com', name: 'Test' };
      mockApiService.login.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser, token: 'tok-123' },
      });

      const result = await store.getState().auth.login('test@test.com', 'pass');

      expect(result).toEqual(mockUser);
      const { auth } = store.getState();
      expect(auth.user).toEqual(mockUser);
      expect(auth.isAuthenticated).toBe(true);
      expect(auth.isLoading).toBe(false);
      expect(localStorage.getItem('auth_token')).toBe('tok-123');
    });

    it('should set error and throw on failure', async () => {
      mockApiService.login.mockResolvedValueOnce({
        success: false,
        error: 'Invalid credentials',
      });

      await expect(store.getState().auth.login('bad@test.com', 'wrong')).rejects.toThrow('Invalid credentials');

      const { auth } = store.getState();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.isLoading).toBe(false);
      expect(auth.error).toBe('Invalid credentials');
    });

    it('should set error on network failure', async () => {
      mockApiService.login.mockRejectedValueOnce(new Error('Network error'));

      await expect(store.getState().auth.login('test@test.com', 'pass')).rejects.toThrow('Network error');
      expect(store.getState().auth.error).toBe('Network error');
      expect(store.getState().auth.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear user, auth state, and tokens', async () => {
      store.getState().auth.setUser({ id: '1', email: 'a@b.com' });
      localStorage.setItem('auth_token', 'tok');
      localStorage.setItem('refresh_token', 'rtok');

      mockApiService.logout.mockResolvedValueOnce({ success: true });

      await store.getState().auth.logout();

      const { auth } = store.getState();
      expect(auth.user).toBeNull();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.error).toBeNull();
      expect(auth.token).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });
  });

  describe('getUserDashboardPath', () => {
    it('should return correct path for each user type', () => {
      expect(store.getState().auth.getUserDashboardPath('client')).toBe('/dashboard/client');
      expect(store.getState().auth.getUserDashboardPath('designer')).toBe('/dashboard/designer');
      expect(store.getState().auth.getUserDashboardPath('admin')).toBe('/dashboard/admin');
    });
  });

  describe('session actions', () => {
    it('updateSession should merge updates', () => {
      store.getState().auth.updateSession({ lastRoute: '/projects', lastProjectTab: 'files' });
      const session = store.getState().auth.session;
      expect(session.lastRoute).toBe('/projects');
      expect(session.lastProjectTab).toBe('files');
    });

    it('markAsSeen should set lastSeenTimestamp', () => {
      store.getState().auth.markAsSeen();
      expect(store.getState().auth.session.lastSeenTimestamp).toBeTruthy();
    });

    it('recordActivity should set lastActivityTimestamp and clear isReturningSession', () => {
      store.getState().auth.recordActivity();
      expect(store.getState().auth.session.lastActivityTimestamp).toBeTruthy();
      expect(store.getState().auth.isReturningSession).toBe(false);
    });

    it('clearSession should reset session state', () => {
      store.getState().auth.updateSession({ lastRoute: '/test' });
      store.getState().auth.clearSession();
      expect(store.getState().auth.session.lastRoute).toBeNull();
    });

    it('getTimeSinceLastSeen should return null when no timestamp', () => {
      expect(store.getState().auth.getTimeSinceLastSeen()).toBeNull();
    });

    it('getTimeSinceLastSeen should return time in ms', () => {
      store.getState().auth.markAsSeen();
      const elapsed = store.getState().auth.getTimeSinceLastSeen();
      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(elapsed).toBeLessThan(1000);
    });
  });
});
