/* eslint-disable react-refresh/only-export-components */
/**
 * Section Editor Context - FluxStudio
 *
 * Provides section and chord editing operations.
 */

import * as React from 'react';
import { useAuth } from '@/store/slices/authSlice';
import { useNotification } from '../NotificationContext';
import { useMetMapCore } from './MetMapCoreContext';
import type { SectionEditorContextValue, Section, Chord } from './types';
import { calculateNextStartBar, recalculateStartBars } from './types';

interface SaveSectionsResponse {
  sections: Section[];
}

const SectionEditorContext = React.createContext<SectionEditorContextValue | null>(null);

export function SectionEditorProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { showNotification } = useNotification();
  const { state, dispatch, apiCall } = useMetMapCore();

  const updateEditedSections = React.useCallback((sections: Section[]) => {
    dispatch({ type: 'SET_EDITED_SECTIONS', payload: sections });
  }, [dispatch]);

  const saveSections = React.useCallback(async (): Promise<boolean> => {
    if (!token || !state.currentSong) return false;

    try {
      const result = await apiCall<SaveSectionsResponse>(`/api/metmap/songs/${state.currentSong.id}/sections`, {
        method: 'PUT',
        body: JSON.stringify({ sections: state.editedSections })
      });

      const updatedSong = { ...state.currentSong, sections: result.sections };
      dispatch({ type: 'SET_CURRENT_SONG', payload: updatedSong });
      dispatch({ type: 'SET_HAS_UNSAVED_CHANGES', payload: false });
      showNotification({ type: 'success', title: 'Success', message: 'Timeline saved' });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save sections';
      showNotification({ type: 'error', title: 'Error', message });
      return false;
    }
  }, [token, state.currentSong, state.editedSections, apiCall, showNotification, dispatch]);

  const addSection = React.useCallback((section: Partial<Section>) => {
    const newSection: Section = {
      name: section.name || `Section ${state.editedSections.length + 1}`,
      orderIndex: state.editedSections.length,
      startBar: calculateNextStartBar(state.editedSections),
      bars: section.bars || 4,
      timeSignature: section.timeSignature || state.currentSong?.timeSignatureDefault || '4/4',
      tempoStart: section.tempoStart || state.currentSong?.bpmDefault || 120,
      tempoEnd: section.tempoEnd,
      tempoCurve: section.tempoCurve,
      chords: []
    };

    dispatch({ type: 'SET_EDITED_SECTIONS', payload: [...state.editedSections, newSection] });
  }, [state.editedSections, state.currentSong, dispatch]);

  const updateSection = React.useCallback((index: number, changes: Partial<Section>) => {
    const updated = state.editedSections.map((s, i) =>
      i === index ? { ...s, ...changes } : s
    );
    dispatch({ type: 'SET_EDITED_SECTIONS', payload: recalculateStartBars(updated) });
  }, [state.editedSections, dispatch]);

  const removeSection = React.useCallback((index: number) => {
    const updated = state.editedSections.filter((_, i) => i !== index);
    dispatch({ type: 'SET_EDITED_SECTIONS', payload: recalculateStartBars(updated) });
  }, [state.editedSections, dispatch]);

  const reorderSections = React.useCallback((fromIndex: number, toIndex: number) => {
    const sections = [...state.editedSections];
    const [removed] = sections.splice(fromIndex, 1);
    sections.splice(toIndex, 0, removed);

    const reordered = sections.map((s, i) => ({ ...s, orderIndex: i }));
    dispatch({ type: 'SET_EDITED_SECTIONS', payload: recalculateStartBars(reordered) });
  }, [state.editedSections, dispatch]);

  const updateSectionChords = React.useCallback((sectionIndex: number, chords: Chord[]) => {
    const updated = state.editedSections.map((s, i) =>
      i === sectionIndex ? { ...s, chords } : s
    );
    dispatch({ type: 'SET_EDITED_SECTIONS', payload: updated });
  }, [state.editedSections, dispatch]);

  const saveChords = React.useCallback(async (sectionId: string, chords: Chord[]): Promise<boolean> => {
    if (!token) return false;

    try {
      await apiCall(`/api/metmap/sections/${sectionId}/chords`, {
        method: 'PUT',
        body: JSON.stringify({ chords })
      });

      showNotification({ type: 'success', title: 'Success', message: 'Chords saved' });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save chords';
      showNotification({ type: 'error', title: 'Error', message });
      return false;
    }
  }, [token, apiCall, showNotification]);

  const value: SectionEditorContextValue = {
    updateEditedSections,
    saveSections,
    addSection,
    updateSection,
    removeSection,
    reorderSections,
    updateSectionChords,
    saveChords
  };

  return (
    <SectionEditorContext.Provider value={value}>
      {children}
    </SectionEditorContext.Provider>
  );
}

export function useSectionEditor(): SectionEditorContextValue {
  const context = React.useContext(SectionEditorContext);

  if (!context) {
    throw new Error('useSectionEditor must be used within a SectionEditorProvider');
  }

  return context;
}

export default SectionEditorContext;
