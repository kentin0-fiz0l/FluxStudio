/* eslint-disable react-refresh/only-export-components */
/**
 * OrganizationContext - Backward compatibility wrapper
 *
 * Organization state has been migrated to Zustand (store/slices/orgSlice.ts).
 * This file re-exports the Zustand hook so existing imports continue to work.
 */

import { useEffect, type ReactNode } from 'react';
import { useStore } from '../store';

// Re-export the hook from Zustand
export { useOrganization } from '../store/slices/orgSlice';

/**
 * OrganizationProvider - initializes org data when auth changes.
 * Kept for RootProviders compatibility during migration.
 */
export function OrganizationProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useStore((state) => state.auth.isAuthenticated);
  const user = useStore((state) => state.auth.user);
  const fetchOrganizations = useStore((state) => state.org.fetchOrganizations);
  const resetOrg = useStore((state) => state.org.resetOrg);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchOrganizations();
    } else {
      resetOrg();
    }
  }, [isAuthenticated, user, fetchOrganizations, resetOrg]);

  return <>{children}</>;
}
