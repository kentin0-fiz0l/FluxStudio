/**
 * Formation Draft Slice - AI Formation Generation State Management
 *
 * Handles:
 * - Draft generation sessions (start, progress, completion)
 * - Show plan approval flow
 * - Real-time progress tracking (section/keyframe progress)
 * - Refinement history
 * - Token usage tracking
 *
 * Date: 2026-02-21
 */

import { StateCreator } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export type DraftStatus =
  | 'idle'
  | 'analyzing'
  | 'planning'
  | 'awaiting_approval'
  | 'generating'
  | 'smoothing'
  | 'refining'
  | 'paused'
  | 'done'
  | 'error';

export interface ShowPlanSection {
  sectionIndex: number;
  sectionName: string;
  formationConcept: string;
  energy: string;
  keyframeCount: number;
}

export interface ShowPlan {
  title: string;
  sections: ShowPlanSection[];
  totalKeyframes: number;
  estimatedTokens: number;
}

export interface MusicAnalysis {
  sections: Array<{
    name: string;
    startMs: number;
    endMs: number;
    durationMs: number;
    tempo: number;
  }>;
  totalDurationMs: number;
  hasSong: boolean;
}

export interface RefinementEntry {
  instruction: string;
  timestamp: string;
  keyframesUpdated: number;
}

export interface FormationDraftState {
  activeDraftSessionId: string | null;
  draftStatus: DraftStatus;
  showPlan: ShowPlan | null;
  musicAnalysis: MusicAnalysis | null;
  currentSectionIndex: number;
  totalSections: number;
  currentKeyframeIndex: number;
  totalKeyframes: number;
  progressPercent: number;
  refinementHistory: RefinementEntry[];
  tokensUsed: number;
  isPanelOpen: boolean;
  error: string | null;
}

export interface FormationDraftActions {
  // Session lifecycle
  startDraftSession: (sessionId: string) => void;
  endDraftSession: () => void;

  // Status updates (driven by SSE events)
  setDraftStatus: (status: DraftStatus) => void;
  setMusicAnalysis: (analysis: MusicAnalysis) => void;
  setShowPlan: (plan: ShowPlan) => void;
  setGenerationProgress: (sectionIndex: number, totalSections: number, sectionName: string) => void;
  setKeyframeProgress: (keyframeIndex: number, totalKeyframes: number) => void;
  setSmoothingResult: (adjustments: number, summary: string) => void;
  setDraftDone: (tokensUsed: number, keyframesGenerated: number) => void;
  setDraftError: (error: string) => void;

  // Refinement
  addRefinement: (instruction: string, keyframesUpdated: number) => void;

  // Token tracking
  updateTokensUsed: (tokens: number) => void;

  // UI state
  setDraftPanelOpen: (open: boolean) => void;
  toggleDraftPanel: () => void;

  // Reset
  resetDraftState: () => void;
}

export interface FormationDraftSlice {
  formationDraft: FormationDraftState & FormationDraftActions;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: FormationDraftState = {
  activeDraftSessionId: null,
  draftStatus: 'idle',
  showPlan: null,
  musicAnalysis: null,
  currentSectionIndex: 0,
  totalSections: 0,
  currentKeyframeIndex: 0,
  totalKeyframes: 0,
  progressPercent: 0,
  refinementHistory: [],
  tokensUsed: 0,
  isPanelOpen: false,
  error: null,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createFormationDraftSlice: StateCreator<
  FormationDraftSlice,
  [['zustand/immer', never]],
  [],
  FormationDraftSlice
> = (set) => ({
  formationDraft: {
    ...initialState,

    // Session lifecycle
    startDraftSession: (sessionId) => {
      set((state) => {
        state.formationDraft.activeDraftSessionId = sessionId;
        state.formationDraft.draftStatus = 'analyzing';
        state.formationDraft.showPlan = null;
        state.formationDraft.musicAnalysis = null;
        state.formationDraft.currentSectionIndex = 0;
        state.formationDraft.totalSections = 0;
        state.formationDraft.currentKeyframeIndex = 0;
        state.formationDraft.totalKeyframes = 0;
        state.formationDraft.progressPercent = 0;
        state.formationDraft.tokensUsed = 0;
        state.formationDraft.error = null;
      });
    },

    endDraftSession: () => {
      set((state) => {
        state.formationDraft.activeDraftSessionId = null;
        state.formationDraft.draftStatus = 'idle';
      });
    },

    // Status updates (driven by SSE events)
    setDraftStatus: (status) => {
      set((state) => {
        state.formationDraft.draftStatus = status;
        if (status === 'error' || status === 'done') {
          // Clear progress on terminal states
        }
      });
    },

    setMusicAnalysis: (analysis) => {
      set((state) => {
        state.formationDraft.musicAnalysis = analysis;
      });
    },

    setShowPlan: (plan) => {
      set((state) => {
        state.formationDraft.showPlan = plan;
        state.formationDraft.totalSections = plan.sections.length;
        state.formationDraft.totalKeyframes = plan.totalKeyframes;
        state.formationDraft.draftStatus = 'awaiting_approval';
      });
    },

    setGenerationProgress: (sectionIndex, totalSections, _sectionName) => {
      set((state) => {
        state.formationDraft.currentSectionIndex = sectionIndex;
        state.formationDraft.totalSections = totalSections;
        state.formationDraft.draftStatus = 'generating';
      });
    },

    setKeyframeProgress: (keyframeIndex, totalKeyframes) => {
      set((state) => {
        state.formationDraft.currentKeyframeIndex = keyframeIndex;
        state.formationDraft.totalKeyframes = totalKeyframes;
        state.formationDraft.progressPercent = totalKeyframes > 0
          ? Math.round((keyframeIndex / totalKeyframes) * 100)
          : 0;
      });
    },

    setSmoothingResult: (_adjustments, _summary) => {
      set((state) => {
        state.formationDraft.draftStatus = 'smoothing';
        state.formationDraft.progressPercent = 95;
      });
    },

    setDraftDone: (tokensUsed, _keyframesGenerated) => {
      set((state) => {
        state.formationDraft.draftStatus = 'done';
        state.formationDraft.tokensUsed = tokensUsed;
        state.formationDraft.progressPercent = 100;
      });
    },

    setDraftError: (error) => {
      set((state) => {
        state.formationDraft.draftStatus = 'error';
        state.formationDraft.error = error;
      });
    },

    // Refinement
    addRefinement: (instruction, keyframesUpdated) => {
      set((state) => {
        state.formationDraft.refinementHistory.push({
          instruction,
          timestamp: new Date().toISOString(),
          keyframesUpdated,
        });
      });
    },

    // Token tracking
    updateTokensUsed: (tokens) => {
      set((state) => {
        state.formationDraft.tokensUsed = tokens;
      });
    },

    // UI state
    setDraftPanelOpen: (open) => {
      set((state) => {
        state.formationDraft.isPanelOpen = open;
      });
    },

    toggleDraftPanel: () => {
      set((state) => {
        state.formationDraft.isPanelOpen = !state.formationDraft.isPanelOpen;
      });
    },

    // Reset
    resetDraftState: () => {
      set((state) => {
        Object.assign(state.formationDraft, initialState);
      });
    },
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

export { };
