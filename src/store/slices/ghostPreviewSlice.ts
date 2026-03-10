/**
 * Ghost Preview Slice - Proposed position preview state for the formation canvas
 *
 * Stores a single active preview (proposed positions from AI prompt, transition
 * suggester, collision resolver, or MCP tool). Components render semi-transparent
 * performers at proposed positions with accept/reject controls.
 */

import { StateCreator } from 'zustand';
import type { FluxStore } from '../store';
import type { Position, PathCurve } from '../../services/formationTypes';

// ============================================================================
// Types
// ============================================================================

export type GhostPreviewSource = 'prompt' | 'transition' | 'collision_fix' | 'mcp_tool';

export interface GhostPreviewEntry {
  id: string;
  source: GhostPreviewSource;
  /** Human-readable label, e.g. "Spread trumpets in arc" */
  sourceLabel: string;
  /** Links to agentSlice PendingAction for MCP-originated previews */
  pendingActionId?: string;
  /** Proposed positions keyed by performer ID */
  proposedPositions: Map<string, Position>;
  /** Proposed Bezier path curves for transition previews */
  proposedPathCurves?: Map<string, PathCurve>;
  /** Which performers are affected by this preview */
  affectedPerformerIds: string[];
}

export interface GhostPreviewState {
  activePreview: GhostPreviewEntry | null;
  ghostOpacity: number;
  showMovementArrows: boolean;
}

export interface GhostPreviewActions {
  setPreview: (entry: GhostPreviewEntry) => void;
  clearPreview: () => void;
  setGhostOpacity: (opacity: number) => void;
  setShowMovementArrows: (show: boolean) => void;
}

export interface GhostPreviewSlice {
  ghostPreview: GhostPreviewState & GhostPreviewActions;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: GhostPreviewState = {
  activePreview: null,
  ghostOpacity: 0.4,
  showMovementArrows: true,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createGhostPreviewSlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  GhostPreviewSlice
> = (set) => ({
  ghostPreview: {
    ...initialState,

    setPreview: (entry: GhostPreviewEntry) => {
      set((state) => {
        state.ghostPreview.activePreview = entry as GhostPreviewEntry;
      });
    },

    clearPreview: () => {
      set((state) => {
        state.ghostPreview.activePreview = null;
      });
    },

    setGhostOpacity: (opacity: number) => {
      set((state) => {
        state.ghostPreview.ghostOpacity = Math.max(0, Math.min(1, opacity));
      });
    },

    setShowMovementArrows: (show: boolean) => {
      set((state) => {
        state.ghostPreview.showMovementArrows = show;
      });
    },
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

export const useGhostPreview = () => useStore((state) => state.ghostPreview);
