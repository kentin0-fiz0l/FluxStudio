/**
 * Song List Context - FluxStudio
 *
 * Provides song list operations: CRUD, filtering, pagination.
 */

import * as React from 'react';
import { useAuth } from '../AuthContext';
import { useNotification } from '../NotificationContext';
import { useMetMapCore } from './MetMapCoreContext';
import type { SongListContextValue, Song, SongsFilter, Section } from './types';

interface SongsListResponse {
  songs: Song[];
  total: number;
  hasMore: boolean;
}

interface SongResponse {
  song: Song;
}

interface SongDetailResponse {
  song: Song & { sections?: Section[] };
}

const SongListContext = React.createContext<SongListContextValue | null>(null);

export function SongListProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { showNotification } = useNotification();
  const { state, dispatch, apiCall } = useMetMapCore();

  const loadSongs = React.useCallback(async () => {
    if (!token) return;
    dispatch({ type: 'SET_SONGS_LOADING', payload: true });

    try {
      const params = new URLSearchParams();
      if (state.filters.search) params.set('search', state.filters.search);
      if (state.filters.projectId) params.set('projectId', state.filters.projectId);
      params.set('orderBy', state.filters.orderBy);
      params.set('orderDir', state.filters.orderDir);
      params.set('limit', String(state.pagination.limit));
      params.set('offset', '0');

      const data = await apiCall<SongsListResponse>(`/api/metmap/songs?${params}`);
      dispatch({
        type: 'SET_SONGS',
        payload: { songs: data.songs, total: data.total, hasMore: data.hasMore }
      });
      dispatch({ type: 'SET_PAGINATION', payload: { offset: 0 } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load songs';
      dispatch({ type: 'SET_SONGS_ERROR', payload: message });
      showNotification({ type: 'error', title: 'Error', message });
    }
  }, [token, state.filters, state.pagination.limit, apiCall, showNotification, dispatch]);

  const loadMoreSongs = React.useCallback(async () => {
    if (!token || !state.pagination.hasMore || state.songsLoading) return;
    dispatch({ type: 'SET_SONGS_LOADING', payload: true });

    try {
      const newOffset = state.pagination.offset + state.pagination.limit;
      const params = new URLSearchParams();
      if (state.filters.search) params.set('search', state.filters.search);
      if (state.filters.projectId) params.set('projectId', state.filters.projectId);
      params.set('orderBy', state.filters.orderBy);
      params.set('orderDir', state.filters.orderDir);
      params.set('limit', String(state.pagination.limit));
      params.set('offset', String(newOffset));

      const data = await apiCall<SongsListResponse>(`/api/metmap/songs?${params}`);
      dispatch({
        type: 'SET_SONGS',
        payload: {
          songs: [...state.songs, ...data.songs],
          total: data.total,
          hasMore: data.hasMore
        }
      });
      dispatch({ type: 'SET_PAGINATION', payload: { offset: newOffset } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load more songs';
      dispatch({ type: 'SET_SONGS_ERROR', payload: message });
    }
  }, [token, state.pagination, state.filters, state.songs, state.songsLoading, apiCall, dispatch]);

  const setFilters = React.useCallback((filters: Partial<SongsFilter>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, [dispatch]);

  const createSong = React.useCallback(async (data: Partial<Song>): Promise<Song | null> => {
    if (!token) return null;

    try {
      const result = await apiCall<SongResponse>('/api/metmap/songs', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      dispatch({ type: 'ADD_SONG', payload: result.song });
      showNotification({ type: 'success', title: 'Success', message: 'Song created' });
      return result.song;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create song';
      showNotification({ type: 'error', title: 'Error', message });
      return null;
    }
  }, [token, apiCall, showNotification, dispatch]);

  const loadSong = React.useCallback(async (songId: string) => {
    if (!token) return;
    dispatch({ type: 'SET_CURRENT_SONG_LOADING', payload: true });

    try {
      const data = await apiCall<SongDetailResponse>(`/api/metmap/songs/${songId}`);
      dispatch({ type: 'SET_CURRENT_SONG', payload: data.song });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load song';
      dispatch({ type: 'SET_CURRENT_SONG_ERROR', payload: message });
      showNotification({ type: 'error', title: 'Error', message });
    }
  }, [token, apiCall, showNotification, dispatch]);

  const updateSong = React.useCallback(async (songId: string, changes: Partial<Song>): Promise<Song | null> => {
    if (!token) return null;

    try {
      const result = await apiCall<SongResponse>(`/api/metmap/songs/${songId}`, {
        method: 'PUT',
        body: JSON.stringify(changes)
      });

      dispatch({ type: 'UPDATE_SONG_IN_LIST', payload: result.song });
      if (state.currentSong?.id === songId) {
        dispatch({ type: 'SET_CURRENT_SONG', payload: { ...state.currentSong, ...result.song } });
      }
      return result.song;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update song';
      showNotification({ type: 'error', title: 'Error', message });
      return null;
    }
  }, [token, state.currentSong, apiCall, showNotification, dispatch]);

  const deleteSong = React.useCallback(async (songId: string): Promise<boolean> => {
    if (!token) return false;

    try {
      await apiCall(`/api/metmap/songs/${songId}`, { method: 'DELETE' });
      dispatch({ type: 'REMOVE_SONG', payload: songId });
      if (state.currentSong?.id === songId) {
        dispatch({ type: 'SET_CURRENT_SONG', payload: null });
      }
      showNotification({ type: 'success', title: 'Success', message: 'Song deleted' });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete song';
      showNotification({ type: 'error', title: 'Error', message });
      return false;
    }
  }, [token, state.currentSong, apiCall, showNotification, dispatch]);

  const closeSong = React.useCallback(() => {
    dispatch({ type: 'RESET_PLAYBACK' });
    dispatch({ type: 'SET_CURRENT_SONG', payload: null });
  }, [dispatch]);

  // Load songs when filters change
  React.useEffect(() => {
    if (token) {
      const debounceTimer = setTimeout(() => {
        loadSongs();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [token, state.filters.search, state.filters.projectId, state.filters.orderBy, state.filters.orderDir, loadSongs]);

  const value: SongListContextValue = {
    loadSongs,
    loadMoreSongs,
    setFilters,
    createSong,
    loadSong,
    updateSong,
    deleteSong,
    closeSong
  };

  return (
    <SongListContext.Provider value={value}>
      {children}
    </SongListContext.Provider>
  );
}

export function useSongList(): SongListContextValue {
  const context = React.useContext(SongListContext);

  if (!context) {
    throw new Error('useSongList must be used within a SongListProvider');
  }

  return context;
}

export default SongListContext;
