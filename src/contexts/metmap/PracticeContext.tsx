/* eslint-disable react-refresh/only-export-components */
/**
 * Practice Context - FluxStudio
 *
 * Provides practice session tracking and stats.
 */

import * as React from 'react';
import { useAuth } from '../AuthContext';
import { useNotification } from '../NotificationContext';
import { useMetMapCore } from './MetMapCoreContext';
import type { PracticeContextValue, PracticeSession, PracticeSettings, MetMapStats } from './types';

interface PracticeSessionResponse {
  session: PracticeSession;
}

interface PracticeHistoryResponse {
  sessions: PracticeSession[];
}

const PracticeContext = React.createContext<PracticeContextValue | null>(null);

export function PracticeProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { showNotification } = useNotification();
  const { state, dispatch, apiCall } = useMetMapCore();

  const startPracticeSession = React.useCallback(async (settings?: PracticeSettings): Promise<PracticeSession | null> => {
    if (!token || !state.currentSong) return null;

    try {
      const result = await apiCall<PracticeSessionResponse>(`/api/metmap/songs/${state.currentSong.id}/practice`, {
        method: 'POST',
        body: JSON.stringify({ settings: settings || {} })
      });

      dispatch({ type: 'SET_ACTIVE_PRACTICE_SESSION', payload: result.session });
      return result.session;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start practice session';
      showNotification({ type: 'error', title: 'Error', message });
      return null;
    }
  }, [token, state.currentSong, apiCall, showNotification, dispatch]);

  const endPracticeSession = React.useCallback(async (notes?: string) => {
    if (!token || !state.activePracticeSession) return;

    try {
      await apiCall(`/api/metmap/practice/${state.activePracticeSession.id}/end`, {
        method: 'POST',
        body: JSON.stringify({ notes })
      });

      dispatch({ type: 'SET_ACTIVE_PRACTICE_SESSION', payload: null });
      showNotification({ type: 'success', title: 'Practice Complete', message: 'Session recorded' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to end practice session';
      showNotification({ type: 'error', title: 'Error', message });
    }
  }, [token, state.activePracticeSession, apiCall, showNotification, dispatch]);

  const loadPracticeHistory = React.useCallback(async () => {
    if (!token || !state.currentSong) return;
    dispatch({ type: 'SET_PRACTICE_HISTORY_LOADING', payload: true });

    try {
      const data = await apiCall<PracticeHistoryResponse>(`/api/metmap/songs/${state.currentSong.id}/practice-history`);
      dispatch({ type: 'SET_PRACTICE_HISTORY', payload: data.sessions });
    } catch (_error) {
      dispatch({ type: 'SET_PRACTICE_HISTORY', payload: [] });
    }
  }, [token, state.currentSong, apiCall, dispatch]);

  const loadStats = React.useCallback(async () => {
    if (!token) return;

    try {
      const stats = await apiCall<MetMapStats>('/api/metmap/stats');
      dispatch({ type: 'SET_STATS', payload: stats });
    } catch (_error) {
      // Silently fail for stats
    }
  }, [token, apiCall, dispatch]);

  const value: PracticeContextValue = {
    startPracticeSession,
    endPracticeSession,
    loadPracticeHistory,
    loadStats
  };

  return (
    <PracticeContext.Provider value={value}>
      {children}
    </PracticeContext.Provider>
  );
}

export function usePractice(): PracticeContextValue {
  const context = React.useContext(PracticeContext);

  if (!context) {
    throw new Error('usePractice must be used within a PracticeProvider');
  }

  return context;
}

export default PracticeContext;
