/**
 * Formation Library Slice - Saved formation memory / style library
 *
 * Stores user-saved formations with names, tags, and thumbnail snapshots.
 * Follows the same pattern as ghostPreviewSlice.ts.
 */

import { StateCreator } from 'zustand';
import type { FluxStore } from '../store';
import type { Position } from '../../services/formationTypes';

// ============================================================================
// Types
// ============================================================================

export interface SavedFormation {
  id: string;
  name: string;
  /** Serializable positions (Map doesn't serialize to JSON) */
  positions: [string, Position][];
  performerCount: number;
  tags: string[];
  /** Base64 data URL of a mini canvas snapshot */
  thumbnail?: string;
  dateCreated: number;
}

interface FormationLibraryState {
  savedFormations: SavedFormation[];
}

interface FormationLibraryActions {
  saveFormation: (formation: Omit<SavedFormation, 'id' | 'dateCreated'>) => void;
  deleteFormation: (id: string) => void;
  renameFormation: (id: string, name: string) => void;
  updateTags: (id: string, tags: string[]) => void;
  importLibrary: (formations: SavedFormation[]) => void;
  exportLibrary: () => SavedFormation[];
}

export interface FormationLibrarySlice {
  formationLibrary: FormationLibraryState & FormationLibraryActions;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: FormationLibraryState = {
  savedFormations: [],
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createFormationLibrarySlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  FormationLibrarySlice
> = (set, get) => ({
  formationLibrary: {
    ...initialState,

    saveFormation: (formation) => {
      set((state) => {
        state.formationLibrary.savedFormations.push({
          ...formation,
          id: `fl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          dateCreated: Date.now(),
        } as SavedFormation);
      });
    },

    deleteFormation: (id) => {
      set((state) => {
        state.formationLibrary.savedFormations =
          state.formationLibrary.savedFormations.filter((f) => f.id !== id);
      });
    },

    renameFormation: (id, name) => {
      set((state) => {
        const f = state.formationLibrary.savedFormations.find((f) => f.id === id);
        if (f) f.name = name;
      });
    },

    updateTags: (id, tags) => {
      set((state) => {
        const f = state.formationLibrary.savedFormations.find((f) => f.id === id);
        if (f) f.tags = tags;
      });
    },

    importLibrary: (formations) => {
      set((state) => {
        // Merge, avoiding duplicate IDs
        const existingIds = new Set(state.formationLibrary.savedFormations.map((f) => f.id));
        for (const f of formations) {
          if (!existingIds.has(f.id)) {
            state.formationLibrary.savedFormations.push(f as SavedFormation);
          }
        }
      });
    },

    exportLibrary: () => {
      return get().formationLibrary.savedFormations;
    },
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

export const useFormationLibrary = () => useStore((state) => state.formationLibrary);
