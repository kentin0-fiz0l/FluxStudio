/* eslint-disable react-refresh/only-export-components */
/**
 * AuthContext - Backward compatibility wrapper
 *
 * Auth state has been migrated to Zustand (store/slices/authSlice.ts).
 * This file re-exports the Zustand hook so existing imports continue to work.
 *
 * The AuthProvider now just runs checkAuth on mount and sets up
 * the unauthorized event listener.
 */

import { useEffect, type ReactNode } from 'react';
import { useStore } from '../store';

// Re-export types from the Zustand slice
export type { UserType, User } from '../store/slices/authSlice';

// Re-export the hook from Zustand - this is what 108+ files import
export { useAuth } from '../store/slices/authSlice';

/**
 * AuthProvider - thin wrapper that initializes auth on mount.
 * Kept for RootProviders compatibility during migration.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const checkAuth = useStore((state) => state.auth.checkAuth);
  const logout = useStore((state) => state.auth.logout);

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = async () => {
      // The Zustand slice handles token refresh internally via checkAuth
      // If we get here, session is truly expired
      const publicAuthPaths = ['/login', '/signup', '/forgot-password', '/reset-password'];
      const isPublicAuthPage = publicAuthPaths.some(path => window.location.pathname.includes(path));
      if (!isPublicAuthPage) {
        await logout();
        window.location.href = '/login?reason=session_expired';
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [checkAuth, logout]);

  return <>{children}</>;
}
