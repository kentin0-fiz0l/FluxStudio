/* eslint-disable react-refresh/only-export-components */
/**
 * MetMap Context Module - FluxStudio
 *
 * Modular MetMap management with focused contexts:
 * - MetMapCoreContext: Shared state and reducer
 * - SongListContext: Song CRUD, filtering, pagination
 * - SectionEditorContext: Section and chord editing
 * - PlaybackContext: Timer-based playback engine
 * - PracticeContext: Practice session tracking
 *
 * For backwards compatibility, MetMapProvider and useMetMap()
 * combine all functionality into a single API.
 */

import * as React from 'react';

// Context providers
import { MetMapCoreProvider, useMetMapCore } from './MetMapCoreContext';
import { SongListProvider, useSongList } from './SongListContext';
import { SectionEditorProvider, useSectionEditor } from './SectionEditorContext';
import { PlaybackProvider, usePlayback } from './PlaybackContext';
import { PracticeProvider, usePractice } from './PracticeContext';

// Re-export types
export * from './types';

// Re-export individual context hooks
export { useMetMapCore } from './MetMapCoreContext';
export { useSongList } from './SongListContext';
export { useSectionEditor } from './SectionEditorContext';
export { usePlayback } from './PlaybackContext';
export { usePractice } from './PracticeContext';

/**
 * Combined MetMapProvider that wraps all MetMap contexts.
 * Use this for full functionality or individual providers for specific needs.
 */
export function MetMapProvider({ children }: { children: React.ReactNode }) {
  return (
    <MetMapCoreProvider>
      <SongListProvider>
        <SectionEditorProvider>
          <PlaybackProvider>
            <PracticeProvider>
              {children}
            </PracticeProvider>
          </PlaybackProvider>
        </SectionEditorProvider>
      </SongListProvider>
    </MetMapCoreProvider>
  );
}

/**
 * Combined useMetMap hook for backwards compatibility.
 * Returns all MetMap functionality from all contexts.
 *
 * For new code, prefer using specific hooks:
 * - useMetMapCore() - state and dispatch
 * - useSongList() - song CRUD and filtering
 * - useSectionEditor() - section/chord editing
 * - usePlayback() - playback controls
 * - usePractice() - practice sessions and stats
 */
export function useMetMap() {
  const { state } = useMetMapCore();
  const songList = useSongList();
  const sectionEditor = useSectionEditor();
  const playback = usePlayback();
  const practice = usePractice();

  return {
    // State (spread for backwards compatibility)
    ...state,

    // Song operations
    loadSongs: songList.loadSongs,
    loadMoreSongs: songList.loadMoreSongs,
    setFilters: songList.setFilters,
    createSong: songList.createSong,
    loadSong: songList.loadSong,
    updateSong: songList.updateSong,
    deleteSong: songList.deleteSong,
    closeSong: songList.closeSong,

    // Section operations
    updateEditedSections: sectionEditor.updateEditedSections,
    saveSections: sectionEditor.saveSections,
    addSection: sectionEditor.addSection,
    updateSection: sectionEditor.updateSection,
    removeSection: sectionEditor.removeSection,
    reorderSections: sectionEditor.reorderSections,
    updateSectionChords: sectionEditor.updateSectionChords,
    saveChords: sectionEditor.saveChords,

    // Playback operations
    play: playback.play,
    pause: playback.pause,
    stop: playback.stop,
    seekToBar: playback.seekToBar,

    // Practice operations
    startPracticeSession: practice.startPracticeSession,
    endPracticeSession: practice.endPracticeSession,
    loadPracticeHistory: practice.loadPracticeHistory,
    loadStats: practice.loadStats
  };
}

export default MetMapProvider;
