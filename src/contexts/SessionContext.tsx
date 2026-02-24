/* eslint-disable react-refresh/only-export-components */
/**
 * SessionContext - Backward compatibility wrapper
 *
 * Session state has been migrated to Zustand (store/slices/authSlice.ts).
 * This file re-exports the Zustand hook so existing imports continue to work.
 */

import type { ReactNode } from 'react';

// Re-export types
export type { SessionState } from '../store/slices/authSlice';

// Re-export the hook from Zustand
export { useSession } from '../store/slices/authSlice';

// Optional hook for components that may render outside providers
export const useSessionOptional = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic require to avoid hard dependency outside providers
    const { useSession: useSessionHook } = require('../store/slices/authSlice');
    return useSessionHook(); // eslint-disable-line react-hooks/rules-of-hooks -- intentionally conditional: only available inside providers
  } catch {
    return null;
  }
};

/**
 * SessionProvider - no-op wrapper for backward compatibility.
 * Session state is now managed by the Zustand auth slice.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default {};
