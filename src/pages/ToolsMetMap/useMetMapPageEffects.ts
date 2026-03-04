import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Song, Section } from '../../contexts/metmap/types';
import type { NotificationType } from '@/store/slices/notificationSlice';
import type { ClickSound } from '../../components/metmap/MetronomeAudio';
import { ONBOARDING_STORAGE_KEYS } from '../../hooks/useFirstTimeExperience';
import { apiService } from '@/services/apiService';

interface UseMetMapPageEffectsConfig {
  // Playback / metronome
  playback: {
    isPlaying: boolean;
    currentBeat: number;
    currentBar: number;
  };
  useClick: boolean;
  accentFirstBeat: boolean;
  clickSound: ClickSound;
  clickVolume: number;
  playClick: (isAccent: boolean, sound: ClickSound, volume: number) => void;

  // Practice
  practiceMode: boolean;
  setRepetitionCount: (v: number | ((prev: number) => number)) => void;
  showPracticeStats: boolean;
  loadPracticeHistory: () => void;

  // Filters / routing
  projectId: string | null | undefined;
  token: string | null | undefined;
  setFilters: (filters: Record<string, unknown>) => void;
  searchQuery: string;

  // Song loading
  songs: Song[];
  currentSong: Song | null;
  loadSong: (id: string) => void;
  loadStats: () => void;
  createSong: (data: Partial<Song>) => Promise<Song | null>;
  addSection: (data: Partial<Section>) => void;
  showNotification: (n: { type: NotificationType; title: string; message: string }) => void;
  navigate: ReturnType<typeof useNavigate>;
  searchParams: URLSearchParams;

  // Onboarding
  markStepComplete: (step: string) => void;
}

export function useMetMapPageEffects({
  playback,
  useClick,
  accentFirstBeat,
  clickSound,
  clickVolume,
  playClick,
  practiceMode,
  setRepetitionCount,
  showPracticeStats,
  loadPracticeHistory,
  projectId,
  token,
  setFilters,
  searchQuery,
  songs,
  currentSong,
  loadSong,
  loadStats,
  createSong,
  addSection,
  showNotification,
  navigate,
  searchParams,
  markStepComplete,
}: UseMetMapPageEffectsConfig) {
  // Mark onboarding step
  useEffect(() => {
    markStepComplete('metmap');
  }, [markStepComplete]);

  // Play metronome click on beat change
  useEffect(() => {
    if (playback.isPlaying && useClick) {
      const isAccent = accentFirstBeat && playback.currentBeat === 1;
      playClick(isAccent, clickSound, clickVolume);
    }
  }, [playback.currentBeat, playback.isPlaying, useClick, playClick, clickSound, clickVolume, accentFirstBeat]);

  // Track repetitions in practice mode
  useEffect(() => {
    if (practiceMode && playback.isPlaying && playback.currentBar === 1 && playback.currentBeat === 1) {
      setRepetitionCount((prev: number) => prev + 1);
    }
  }, [practiceMode, playback.isPlaying, playback.currentBar, playback.currentBeat]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => {
    if (showPracticeStats) loadPracticeHistory();
  }, [showPracticeStats, loadPracticeHistory]);

  useEffect(() => {
    if (projectId) {
      setFilters({ projectId });
    }
  }, [projectId, setFilters]);

  useEffect(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEYS.metmapVisited, 'true');
    } catch {
      // localStorage not available
    }
  }, []);

  // Handle URL-based song selection
  useEffect(() => {
    const songId = searchParams.get('song');
    if (songId && (!currentSong || currentSong.id !== songId)) {
      loadSong(songId);
    }
  }, [searchParams, currentSong, loadSong]);

  // Handle asset-based song loading
  useEffect(() => {
    const assetId = searchParams.get('assetId');
    if (!assetId || !projectId || !token) return;

    async function loadFromAsset() {
      try {
        const result = await apiService.get<{ song: { id: string; title: string; bpmDefault?: number; timeSignatureDefault?: string; sections?: Partial<Section>[] } }>(`/assets/${assetId}/file`);
        const data = result.data;

        if (!data) {
          showNotification({ type: 'error', title: 'Load Failed', message: 'Could not load MetMap session from asset' });
          return;
        }

        if (!data.song?.id || !data.song?.title) {
          showNotification({ type: 'error', title: 'Invalid Format', message: 'This asset does not contain a valid MetMap session' });
          return;
        }

        const songId = data.song.id;
        const existingSong = songs.find(s => s.id === songId);

        if (existingSong) {
          const params = new URLSearchParams();
          params.set('song', songId);
          if (projectId) params.set('projectId', projectId);
          navigate(`/tools/metmap?${params.toString()}`, { replace: true });
        } else {
          const newSong = await createSong({
            title: data.song.title,
            bpmDefault: data.song.bpmDefault || 120,
            timeSignatureDefault: data.song.timeSignatureDefault || '4/4',
            projectId: projectId ?? undefined
          });

          if (newSong && data.song.sections) {
            for (const sectionData of data.song.sections) {
              addSection(sectionData);
            }

            const params = new URLSearchParams();
            params.set('song', newSong.id);
            if (projectId) params.set('projectId', projectId);
            navigate(`/tools/metmap?${params.toString()}`, { replace: true });

            showNotification({
              type: 'success',
              title: 'Session Restored',
              message: `MetMap session "${data.song.title}" has been restored from the saved asset`
            });
          }
        }
      } catch (error) {
        console.error('Failed to load MetMap from asset:', error);
        showNotification({ type: 'error', title: 'Load Failed', message: 'Could not load MetMap session from asset' });
      }
    }

    loadFromAsset();
  }, [searchParams, projectId, token, songs, createSong, addSection, navigate, showNotification]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchQuery });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, setFilters]);
}
