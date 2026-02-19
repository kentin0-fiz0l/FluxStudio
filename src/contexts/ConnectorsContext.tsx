/**
 * ConnectorsContext - Deprecated Wrapper
 *
 * Sprint 24: Migrated to Zustand connectorSlice.
 * All state now lives in src/store/slices/connectorSlice.ts.
 *
 * New code should import from '@/store' instead:
 *   import { useConnectors, useConnectorList } from '@/store';
 */

import * as React from 'react';

/** @deprecated Use Zustand store directly. This is a no-op passthrough. */
export function ConnectorsProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/** @deprecated Import useConnectors from '@/store' instead. */
export function useConnectors() {
  throw new Error('useConnectors must be imported from @/store, not from ConnectorsContext');
}

export default null;
