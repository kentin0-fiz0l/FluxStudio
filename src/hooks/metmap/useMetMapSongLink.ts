/**
 * useMetMapSongLink - Hook for linking a Formation to a MetMap song
 *
 * Manages the connection between a formation and a MetMap song,
 * loading song data (sections, chords, beat map) and building
 * a TempoMap for variable-tempo drill design.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Formation } from '../../services/formationTypes';
import type { Song, Section, Chord, BeatMap } from '../../contexts/metmap/types';
import type { TempoMap } from '../../services/tempoMap';
import { buildTempoMapFromSections } from '../../services/tempoMap';
import { buildApiUrl } from '../../config/environment';

interface MetMapSongLinkState {
  linkedSong: Song | null;
  sections: Section[];
  chords: Chord[];
  beatMap: BeatMap | null;
  tempoMap: TempoMap | null;
  loading: boolean;
  error: string | null;
}

interface MetMapSongLinkActions {
  linkSong: (songId: string) => Promise<void>;
  unlinkSong: () => void;
  refreshSongData: () => Promise<void>;
}

export type MetMapSongLinkReturn = MetMapSongLinkState & MetMapSongLinkActions;

/**
 * Fetch helper — uses JWT from localStorage.
 */
async function fetchMetMap<T>(endpoint: string): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(buildApiUrl(endpoint), {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`MetMap API error: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

export function useMetMapSongLink(
  formation: Formation | null,
  onFormationUpdate?: (updates: Partial<Formation>) => void,
): MetMapSongLinkReturn {
  const [state, setState] = useState<MetMapSongLinkState>({
    linkedSong: null,
    sections: [],
    chords: [],
    beatMap: null,
    tempoMap: null,
    loading: false,
    error: null,
  });

  const currentSongId = formation?.metmapSongId ?? null;
  const prevSongIdRef = useRef<string | null>(null);

  /**
   * Load all song data: song metadata, sections, chords.
   */
  const loadSongData = useCallback(async (songId: string) => {
    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const [songData, sectionsData, chordsData] = await Promise.all([
        fetchMetMap<{ song: Song }>(`/metmap/songs/${songId}`),
        fetchMetMap<{ sections: Section[] }>(`/metmap/songs/${songId}/sections`),
        fetchMetMap<{ chords: Chord[] }>(`/metmap/songs/${songId}/chords`),
      ]);

      const song = songData.song ?? songData;
      const sections = (sectionsData.sections ?? sectionsData) as Section[];
      const chords = (chordsData.chords ?? chordsData) as Chord[];
      const beatMap = (song as Song).beatMap ?? null;
      const tempoMap = sections.length > 0 ? buildTempoMapFromSections(sections) : null;

      setState({
        linkedSong: song as Song,
        sections,
        chords,
        beatMap,
        tempoMap,
        loading: false,
        error: null,
      });

      // Propagate tempo map to formation
      if (tempoMap && onFormationUpdate) {
        onFormationUpdate({ tempoMap });
      }
    } catch (err) {
      setState(s => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load song data',
      }));
    }
  }, [onFormationUpdate]);

  /**
   * Link a MetMap song to the formation.
   */
  const linkSong = useCallback(async (songId: string) => {
    if (onFormationUpdate) {
      onFormationUpdate({ metmapSongId: songId, useConstantTempo: false });
    }
    await loadSongData(songId);
  }, [loadSongData, onFormationUpdate]);

  /**
   * Unlink the MetMap song from the formation.
   */
  const unlinkSong = useCallback(() => {
    setState({
      linkedSong: null,
      sections: [],
      chords: [],
      beatMap: null,
      tempoMap: null,
      loading: false,
      error: null,
    });
    if (onFormationUpdate) {
      onFormationUpdate({
        metmapSongId: undefined,
        tempoMap: undefined,
        useConstantTempo: undefined,
      });
    }
  }, [onFormationUpdate]);

  /**
   * Refresh song data (e.g., after MetMap edits).
   */
  const refreshSongData = useCallback(async () => {
    if (currentSongId) {
      await loadSongData(currentSongId);
    }
  }, [currentSongId, loadSongData]);

  // Auto-load song data when the formation's metmapSongId changes
  useEffect(() => {
    if (currentSongId && currentSongId !== prevSongIdRef.current) {
      loadSongData(currentSongId);
    } else if (!currentSongId && prevSongIdRef.current) {
      // Song was unlinked externally
      setState({
        linkedSong: null,
        sections: [],
        chords: [],
        beatMap: null,
        tempoMap: null,
        loading: false,
        error: null,
      });
    }
    prevSongIdRef.current = currentSongId;
  }, [currentSongId, loadSongData]);

  return {
    ...state,
    linkSong,
    unlinkSong,
    refreshSongData,
  };
}
