import type { NavigateFunction } from 'react-router-dom';
import type { Song, Section, Animation } from '../../contexts/metmap/types';
import type { Chord } from '../../contexts/metmap/types';
import type { NotificationType } from '@/store/slices/notificationSlice';
import type { SectionTemplate } from '../../components/metmap/SectionTemplates';
import type { MetMapAction } from '../../contexts/metmap/types';
import { detectBeatsWithCache } from '../../services/beatDetection';
import { apiService } from '@/services/apiService';
import { announceToScreenReader } from '../../utils/accessibility';
import { useMetMapKeyboardShortcuts } from '../../hooks/metmap/useMetMapKeyboardShortcuts';
import { confirmDialog } from '@/lib/confirm';

interface UseMetMapPageHandlersConfig {
  navigate: NavigateFunction;
  projectId: string | null | undefined;
  isMobile: boolean;
  showNotification: (notification: { type: NotificationType; title: string; message: string }) => void;
  token: string | null | undefined;

  // MetMap context
  currentSong: Song | null;
  editedSections: Section[];
  hasUnsavedChanges: boolean;
  playback: {
    isPlaying: boolean;
    currentSectionIndex: number;
    currentBar: number;
    currentBeat: number;
    currentTimeSeconds: number;
  };
  createSong: (data: Partial<Song>) => Promise<Song | null>;
  updateSong: (songId: string, changes: Partial<Song>) => Promise<Song | null>;
  deleteSong: (songId: string) => Promise<boolean>;
  addSection: (data: Partial<Section>) => void;
  updateSection: (index: number, changes: Partial<Section>) => void;
  removeSection: (index: number) => void;
  reorderSections: (from: number, to: number) => void;
  updateSectionChords: (sectionIndex: number, chords: Chord[]) => void;
  saveSections: () => Promise<boolean>;
  play: (options?: { tempoOverride?: number; countoffBars?: number; loopSection?: number | null }) => void;
  pause: () => void;
  stop: () => void;
  seekToBar: (bar: number) => void;
  seekToTime: (seconds: number) => void;
  setPlaybackMode: (mode: import('../../contexts/metmap/types').PlaybackMode) => void;
  metmapDispatch: React.Dispatch<MetMapAction>;

  // Local state values
  tempoOverride: number | null;
  practiceMode: boolean;
  tempoPercent: number;
  countoffBars: number;
  loopSection: number | null;
  audioBuffer: AudioBuffer | null;

  // Local state setters
  setShowSongList: (v: boolean) => void;
  setTempoOverride: React.Dispatch<React.SetStateAction<number | null>>;
  setUseClick: React.Dispatch<React.SetStateAction<boolean>>;
  setLoopSection: React.Dispatch<React.SetStateAction<number | null>>;
  setAudioBuffer: React.Dispatch<React.SetStateAction<AudioBuffer | null>>;

  // Undo systems
  snapshotHistory: {
    saveSnapshot: (sections: Section[]) => void;
    undo: (current: Section[]) => Section[] | null;
    redo: (current: Section[]) => Section[] | null;
    canUndo: boolean;
    canRedo: boolean;
  };
  isCollabActive: boolean;
  yjsUndo: {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
  };
}

export function useMetMapPageHandlers(config: UseMetMapPageHandlersConfig) {
  const {
    navigate,
    projectId,
    isMobile,
    showNotification,
    token,
    currentSong,
    editedSections,
    hasUnsavedChanges,
    playback,
    createSong,
    updateSong,
    deleteSong,
    addSection,
    updateSection,
    removeSection,
    reorderSections,
    updateSectionChords,
    saveSections,
    play,
    pause,
    stop,
    seekToBar,
    seekToTime,
    metmapDispatch,
    tempoOverride,
    practiceMode,
    tempoPercent,
    countoffBars,
    loopSection,
    audioBuffer,
    setShowSongList,
    setTempoOverride,
    setUseClick,
    setAudioBuffer,
    setLoopSection,
    snapshotHistory,
    isCollabActive,
    yjsUndo,
  } = config;

  const handleCreateSong = async (data: Partial<Song>) => {
    const songData = projectId ? { ...data, projectId } : data;
    const song = await createSong(songData);
    if (song) {
      const params = new URLSearchParams();
      params.set('song', song.id);
      if (projectId) if (projectId) params.set('projectId', projectId);
      navigate(`/tools/metmap?${params.toString()}`);
    }
  };

  const handleSelectSong = async (song: Song) => {
    if (hasUnsavedChanges) {
      if (!(await confirmDialog('You have unsaved changes. Discard them?', { destructive: true }))) return;
    }
    const params = new URLSearchParams();
    params.set('song', song.id);
    if (projectId) if (projectId) params.set('projectId', projectId);
    navigate(`/tools/metmap?${params.toString()}`);
    if (isMobile) {
      setShowSongList(false);
    }
    announceToScreenReader(`Selected song: ${song.title}. ${song.sectionCount} sections, ${song.bpmDefault} BPM.`);
  };

  const handleDeleteSong = async () => {
    if (!currentSong) return;
    if (!(await confirmDialog(`Delete "${currentSong.title}"? This cannot be undone.`, { destructive: true, confirmText: 'Delete' }))) return;

    const success = await deleteSong(currentSong.id);
    if (success) {
      const params = new URLSearchParams();
      if (projectId) if (projectId) params.set('projectId', projectId);
      navigate(`/tools/metmap?${params.toString()}`);
    }
  };

  const handlePlay = () => {
    const effectiveTempo = practiceMode && tempoPercent !== 100
      ? Math.round((tempoOverride || currentSong?.bpmDefault || 120) * (tempoPercent / 100))
      : tempoOverride || undefined;

    play({
      tempoOverride: effectiveTempo,
      countoffBars,
      loopSection: practiceMode ? loopSection : undefined
    });
  };

  const handleTapTempo = (bpm: number) => {
    setTempoOverride(bpm);
  };

  // Undo/redo-aware mutation wrappers
  const snapshotAndAddSection = (data: Partial<Section>) => {
    snapshotHistory.saveSnapshot(editedSections);
    addSection(data);
  };

  const snapshotAndRemoveSection = (index: number) => {
    snapshotHistory.saveSnapshot(editedSections);
    removeSection(index);
  };

  const snapshotAndUpdateSection = (index: number, changes: Partial<Section>) => {
    snapshotHistory.saveSnapshot(editedSections);
    updateSection(index, changes);
  };

  const snapshotAndReorderSections = (from: number, to: number) => {
    snapshotHistory.saveSnapshot(editedSections);
    reorderSections(from, to);
  };

  const snapshotAndUpdateChords = (index: number, chords: Chord[]) => {
    snapshotHistory.saveSnapshot(editedSections);
    updateSectionChords(index, chords);
  };

  const handleUndo = () => {
    if (isCollabActive) {
      yjsUndo.undo();
    } else {
      const restored = snapshotHistory.undo(editedSections);
      if (restored) {
        for (let i = editedSections.length - 1; i >= 0; i--) {
          removeSection(i);
        }
        for (const section of restored) {
          addSection(section);
        }
      }
    }
  };

  const handleRedo = () => {
    if (isCollabActive) {
      yjsUndo.redo();
    } else {
      const restored = snapshotHistory.redo(editedSections);
      if (restored) {
        for (let i = editedSections.length - 1; i >= 0; i--) {
          removeSection(i);
        }
        for (const section of restored) {
          addSection(section);
        }
      }
    }
  };

  const handleAddSectionTemplate = (template: SectionTemplate) => {
    snapshotHistory.saveSnapshot(editedSections);
    addSection({
      name: template.name,
      bars: template.bars,
      tempoStart: currentSong?.bpmDefault || 120,
      timeSignature: currentSong?.timeSignatureDefault || '4/4'
    });
  };

  const handleImportSong = async (data: Partial<Song> & { sections?: Partial<Section>[] }) => {
    const song = await createSong({
      title: data.title || 'Imported Song',
      bpmDefault: data.bpmDefault || 120,
      timeSignatureDefault: data.timeSignatureDefault || '4/4',
      projectId: projectId || undefined
    });
    if (song && data.sections) {
      for (const sectionData of data.sections) {
        addSection(sectionData);
      }
      const params = new URLSearchParams();
      params.set('song', song.id);
      if (projectId) if (projectId) params.set('projectId', projectId);
      navigate(`/tools/metmap?${params.toString()}`);
    }
  };

  const handleAssetCreated = (_asset: { id: string; name: string }) => {
    showNotification({
      type: 'success',
      title: 'Asset Saved',
      message: `MetMap session "${currentSong?.title}" saved to project assets`
    });
  };

  const handleShareToChat = async (asset: { id: string; name: string }) => {
    if (!projectId || !token) return;

    try {
      const convResult = await apiService.get<{ conversations: Array<{ id: string }> }>('/api/messaging/conversations', { params: { projectId, limit: '1' } });
      const conversation = convResult.data?.conversations?.[0];

      if (!conversation) {
        showNotification({ type: 'warning', title: 'No Project Chat', message: 'Create a conversation in this project first to share MetMap sessions' });
        return;
      }

      const messageContent = `🎵 Shared MetMap: **${currentSong?.title}**\n\n` +
        `${editedSections.length} sections • ${editedSections.reduce((sum, s) => sum + s.bars, 0)} bars • ${currentSong?.bpmDefault} BPM`;

      await apiService.post(`/api/messaging/conversations/${conversation.id}/messages`, {
        content: messageContent,
        attachments: [{ type: 'asset', assetId: asset.id, name: asset.name, mimeType: 'application/json' }]
      });

      showNotification({ type: 'success', title: 'Shared to Chat', message: `MetMap session shared to project chat` });
      navigate(`/messages?projectId=${projectId}&conversationId=${conversation.id}`);
    } catch (error) {
      console.error('Share to chat failed:', error);
      showNotification({
        type: 'error',
        title: 'Share Failed',
        message: error instanceof Error ? error.message : 'Could not share to chat'
      });
    }
  };

  const handleTimelineSectionClick = (sectionIndex: number) => {
    if (practiceMode) {
      setLoopSection(loopSection === sectionIndex ? null : sectionIndex);
    } else {
      const startBar = editedSections.slice(0, sectionIndex).reduce((sum, s) => sum + s.bars, 0) + 1;
      seekToBar(startBar);
    }
  };

  // Audio handlers
  const handleUploadAudio = async (file: File) => {
    if (!currentSong) return;
    metmapDispatch({ type: 'SET_AUDIO_LOADING', payload: true });
    try {
      const formData = new FormData();
      formData.append('audio', file);
      const result = await apiService.post<{ audioFileUrl: string }>(`/api/metmap/songs/${currentSong.id}/audio`, formData);
      const data = result.data!;
      metmapDispatch({
        type: 'SET_SONG_AUDIO',
        payload: {
          songId: currentSong.id,
          audioFileUrl: data.audioFileUrl,
          audioDurationSeconds: 0,
        },
      });
      showNotification({ type: 'success', title: 'Audio uploaded', message: 'Audio file attached to song' });
    } catch {
      metmapDispatch({ type: 'SET_AUDIO_ERROR', payload: 'Failed to upload audio' });
    }
  };

  const handleRemoveAudio = async () => {
    if (!currentSong) return;
    try {
      await apiService.delete(`/api/metmap/songs/${currentSong.id}/audio`);
      metmapDispatch({ type: 'CLEAR_SONG_AUDIO', payload: currentSong.id });
      setAudioBuffer(null);
      showNotification({ type: 'success', title: 'Audio removed', message: 'Audio file removed from song' });
    } catch {
      showNotification({ type: 'error', title: 'Error', message: 'Failed to remove audio' });
    }
  };

  const handleDetectBeats = async () => {
    if (!currentSong || !audioBuffer) return;
    metmapDispatch({ type: 'SET_BEAT_DETECTION_LOADING', payload: true });
    try {
      const beatMap = await detectBeatsWithCache(audioBuffer);
      // Save to backend
      await apiService.patch(`/api/metmap/songs/${currentSong.id}/beat-map`, { beatMap, detectedBpm: beatMap.bpm, audioDurationSeconds: audioBuffer.duration });
      metmapDispatch({
        type: 'SET_SONG_BEAT_MAP',
        payload: { songId: currentSong.id, beatMap, detectedBpm: beatMap.bpm },
      });
      showNotification({ type: 'success', title: 'Beat detection complete', message: `Detected ${beatMap.bpm} BPM` });
    } catch {
      metmapDispatch({ type: 'SET_BEAT_DETECTION_LOADING', payload: false });
      showNotification({ type: 'error', title: 'Error', message: 'Beat detection failed' });
    }
  };

  const handleAlignBpm = () => {
    if (!currentSong?.detectedBpm) return;
    updateSong(currentSong.id, { bpmDefault: Math.round(currentSong.detectedBpm) });
  };

  const handleWaveformReady = (duration: number) => {
    if (!currentSong) return;
    metmapDispatch({
      type: 'SET_SONG_AUDIO',
      payload: { songId: currentSong.id, audioFileUrl: currentSong.audioFileUrl!, audioDurationSeconds: duration },
    });
  };

  const handleWaveformDecode = (buffer: AudioBuffer) => {
    setAudioBuffer(buffer);
  };

  const handleWaveformSeek = (time: number) => {
    seekToTime(time);
  };

  const handleTimelineBarClick = (bar: number) => {
    seekToBar(bar);
  };

  const handleTimelineTimeClick = (time: number) => {
    seekToTime(time);
  };

  const handleUpdateAnimations = (sectionIndex: number, animations: Animation[]) => {
    snapshotHistory.saveSnapshot(editedSections);
    updateSection(sectionIndex, { animations });
  };

  // Keyboard shortcuts
  useMetMapKeyboardShortcuts({
    onPlayPause: () => {
      if (playback.isPlaying) {
        pause();
      } else {
        handlePlay();
      }
    },
    onStop: stop,
    onNextSection: () => {
      const nextIndex = Math.min(playback.currentSectionIndex + 1, editedSections.length - 1);
      const startBar = editedSections.slice(0, nextIndex).reduce((sum, s) => sum + s.bars, 0) + 1;
      seekToBar(startBar);
    },
    onPrevSection: () => {
      const prevIndex = Math.max(playback.currentSectionIndex - 1, 0);
      const startBar = editedSections.slice(0, prevIndex).reduce((sum, s) => sum + s.bars, 0) + 1;
      seekToBar(startBar);
    },
    onTempoUp: () => {
      setTempoOverride((prev) => Math.min(300, (prev || currentSong?.bpmDefault || 120) + 5));
    },
    onTempoDown: () => {
      setTempoOverride((prev) => Math.max(20, (prev || currentSong?.bpmDefault || 120) - 5));
    },
    onToggleClick: () => setUseClick((prev) => !prev),
    onSave: saveSections,
    onNewSection: () => snapshotAndAddSection({}),
    onUndo: handleUndo,
    onRedo: handleRedo,
  }, !!currentSong);

  return {
    handleCreateSong,
    handleSelectSong,
    handleDeleteSong,
    handlePlay,
    handleTapTempo,
    snapshotAndAddSection,
    snapshotAndRemoveSection,
    snapshotAndUpdateSection,
    snapshotAndReorderSections,
    snapshotAndUpdateChords,
    handleUndo,
    handleRedo,
    handleAddSectionTemplate,
    handleImportSong,
    handleAssetCreated,
    handleShareToChat,
    handleTimelineSectionClick,
    handleUploadAudio,
    handleRemoveAudio,
    handleDetectBeats,
    handleAlignBpm,
    handleWaveformReady,
    handleWaveformDecode,
    handleWaveformSeek,
    handleTimelineBarClick,
    handleTimelineTimeClick,
    handleUpdateAnimations,
  };
}
