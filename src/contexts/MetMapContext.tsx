/**
 * MetMap Context - FluxStudio
 *
 * REFACTORED: This file now re-exports from the modular metmap/ directory.
 * The context has been split into focused modules for better maintainability:
 *
 * - metmap/types.ts - Type definitions and reducer
 * - metmap/MetMapCoreContext.tsx - Shared state and dispatch
 * - metmap/SongListContext.tsx - Song CRUD, filtering, pagination
 * - metmap/SectionEditorContext.tsx - Section and chord editing
 * - metmap/PlaybackContext.tsx - Timer-based playback engine
 * - metmap/PracticeContext.tsx - Practice session tracking
 * - metmap/index.tsx - Combined provider and backwards-compatible hook
 *
 * For new code, import from './metmap' and use specific hooks.
 * For existing code, this re-export maintains backwards compatibility.
 */

// Re-export everything for backwards compatibility
export {
  // Combined provider and hook
  MetMapProvider,
  useMetMap,

  // Individual hooks for new code
  useMetMapCore,
  useSongList,
  useSectionEditor,
  usePlayback,
  usePractice,

  // Types
  type Song,
  type Section,
  type Chord,
  type PracticeSession,
  type PracticeSettings,
  type MetMapStats,
  type SongsFilter,
  type SongsPagination,
  type PlaybackState,
  type MetMapState,
  type MetMapAction,
  type MetMapCoreContextValue,
  type SongListContextValue,
  type SectionEditorContextValue,
  type PlaybackContextValue,
  type PracticeContextValue,

  // Constants and helpers
  initialPlaybackState,
  initialMetMapState,
  metmapReducer,
  calculateNextStartBar,
  recalculateStartBars,
  calculateGlobalBeat,
  getBeatsPerBar
} from './metmap';

// Default export for backwards compatibility
export { default } from './metmap';
