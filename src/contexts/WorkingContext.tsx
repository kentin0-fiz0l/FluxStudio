/**
 * WorkingContext - Deprecated Wrapper
 *
 * Sprint 24: Migrated to Zustand uiSlice.
 * All state now lives in src/store/slices/uiSlice.ts.
 *
 * New code should import from '@/store' instead:
 *   import { useWorkingContext } from '@/store';
 */

import * as React from 'react';
import { useStore } from '../store/store';

// ============================================================================
// Types (kept for backward compat imports)
// ============================================================================

export interface LastEntity {
  conversationId?: string;
  messageId?: string;
  fileId?: string;
  assetId?: string;
  boardId?: string;
}

export interface WorkingContextData {
  projectId: string;
  lastRoute: string;
  lastEntity: LastEntity;
  lastSeenAt: string;
  intentNote?: string;
  version: number;
}

// ============================================================================
// Deprecated Provider (no-op passthrough)
// ============================================================================

/** @deprecated Use Zustand store directly. This is a no-op passthrough. */
export function WorkingContextProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ============================================================================
// Deprecated Hooks (delegate to Zustand)
// ============================================================================

/** @deprecated Import useWorkingContext from '@/store' instead. */
export function useWorkingContext() {
  const ui = useStore((s) => s.ui);

  return {
    workingContext: ui.workingContext,
    updateWorkingContext: ui.updateWorkingContext,
    setIntentNote: ui.setIntentNote,
    clearIntentNote: ui.clearIntentNote,
    isStale: (thresholdMs: number = 7 * 24 * 60 * 60 * 1000) => {
      if (!ui.workingContext) return true;
      const lastSeen = new Date(ui.workingContext.lastSeenAt).getTime();
      return Date.now() - lastSeen > thresholdMs;
    },
    clearWorkingContext: ui.clearWorkingContext,
    getWorkingContextForProject: ui.getWorkingContextForProject,
    hasResumableContext: ui.hasResumableContext,
  };
}

/** @deprecated Import useWorkingContext from '@/store' instead. */
export function useWorkingContextOptional() {
  return useWorkingContext();
}

export default null;
