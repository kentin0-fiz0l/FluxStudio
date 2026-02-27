/**
 * MetMap Page - FluxStudio
 *
 * Musical timeline tool for creating songs with sections, tempo changes,
 * and chord progressions. Includes a programmable metronome.
 *
 * Decomposed: helpers in MetMapHelpers.tsx, sub-components in MetMapComponents.tsx
 *
 * WCAG 2.1 Level A Compliant
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/templates/DashboardLayout';
import { useMetMap, Song, Section } from '../../contexts/MetMapContext';
import { useNotification } from '@/store/slices/notificationSlice';
import { useProjectContext } from '@/store';
import { MobilePlaybackControls } from '../../components/metmap/MobilePlaybackControls';
import { OfflineIndicator, NetworkStatusBadge } from '../../components/pwa/OfflineIndicator';
import { usePWA } from '../../hooks/usePWA';
import { ONBOARDING_STORAGE_KEYS, useFirstTimeExperience } from '../../hooks/useFirstTimeExperience';
import { useAuth } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';

// MetMap components
import { TapTempo } from '../../components/metmap/TapTempo';
import { SectionTemplates, SectionTemplate } from '../../components/metmap/SectionTemplates';
import { VisualTimeline } from '../../components/metmap/VisualTimeline';
import { PracticeMode, type PracticeStartInfo } from '../../components/metmap/PracticeMode';
import { PracticeAnalytics } from '../../components/metmap/PracticeAnalytics';
import { ExportImport } from '../../components/metmap/ExportImport';
import { WaveformTimeline } from '../../components/metmap/WaveformTimeline';
import { TimelineCanvas } from '../../components/metmap/TimelineCanvas';
import { BeatMarkers } from '../../components/metmap/BeatMarkers';
import { AudioTrackPanel } from '../../components/metmap/AudioTrackPanel';
import { AudioTrackMixer } from '../../components/metmap/AudioTrackMixer';
import { KeyframeEditor } from '../../components/metmap/KeyframeEditor';
import { detectBeatsWithCache } from '../../services/beatDetection';
import { usePlayback, useMetMapCore, usePractice } from '../../contexts/metmap';
import { useMetronomeAudio, ClickSound } from '../../components/metmap/MetronomeAudio';
import { useMetMapKeyboardShortcuts, ShortcutsHelp } from '../../hooks/useMetMapKeyboardShortcuts';
import { useMetMapHistory } from '../../hooks/useMetMapHistory';
import { useMetMapCollaboration } from '../../hooks/useMetMapCollaboration';
import { useMetMapPresence } from '../../hooks/useMetMapPresence';
import { useMetMapUndo } from '../../hooks/useMetMapUndo';
import { useConflictDetection } from '../../hooks/useConflictDetection';
import { useMetMapComments } from '../../hooks/useMetMapComments';
import { useMetMapSnapshots } from '../../hooks/useMetMapSnapshots';
import { useMetMapBranches } from '../../hooks/useMetMapBranches';
import { PresenceAvatars } from '../../components/metmap/PresenceAvatars';
import { ConnectionStatus } from '../../components/metmap/ConnectionStatus';
import { CanvasCommentLayer } from '../../components/metmap/CanvasCommentLayer';
import { SnapshotPanel } from '../../components/metmap/SnapshotPanel';
import { BranchSwitcher } from '../../components/metmap/BranchSwitcher';
import { MetMapAIPanel } from '../../components/metmap/MetMapAIPanel';
import { announceToScreenReader } from '../../utils/accessibility';

// Drawer for mobile panels
import { Drawer, DrawerContent } from '../../components/ui/drawer';

// Decomposed sub-components
import { useIsMobile, formatDuration, SongListItem, NewSongModal } from './MetMapHelpers';
import { SectionRow, ChordGrid, PlaybackControls } from './MetMapComponents';

export default function ToolsMetMap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotification();
  const projectContext = useProjectContext();
  const { token, user } = useAuth();
  const isMobile = useIsMobile();
  const { isOnline: _isOnline } = usePWA();
  const { markStepComplete } = useFirstTimeExperience({
    projectCount: 0,
    conversationCount: 0,
    fileCount: 0,
  });

  const currentProject = projectContext?.currentProject;
  const projectId = searchParams.get('projectId') || currentProject?.id;

  useEffect(() => {
    markStepComplete('metmap');
  }, [markStepComplete]);

  const {
    songs,
    songsLoading,
    filters: _filters,
    setFilters,
    currentSong,
    currentSongLoading,
    editedSections,
    hasUnsavedChanges,
    playback,
    stats,
    createSong,
    loadSong,
    updateSong,
    deleteSong,
    closeSong: _closeSong,
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
    loadStats
  } = useMetMap();

  // Local state
  const [showNewSongModal, setShowNewSongModal] = useState(false);
  const [showSongList, setShowSongList] = useState(!isMobile);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempoOverride, setTempoOverride] = useState<number | null>(null);
  const [useClick, setUseClick] = useState(true);
  const [countoffBars, setCountoffBars] = useState(0);
  const [showChords, setShowChords] = useState(false);

  // New feature state
  const [showVisualTimeline, setShowVisualTimeline] = useState(true);
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceStartInfo, setPracticeStartInfo] = useState<PracticeStartInfo | null>(null);
  const [loopSection, setLoopSection] = useState<number | null>(null);
  const [tempoPercent, setTempoPercent] = useState(100);
  const [repetitionCount, setRepetitionCount] = useState(0);
  const [clickSound, _setClickSound] = useState<ClickSound>('classic');
  const [clickVolume, _setClickVolume] = useState(80);
  const [accentFirstBeat, _setAccentFirstBeat] = useState(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showPracticeStats, setShowPracticeStats] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showSnapshotDrawer, setShowSnapshotDrawer] = useState(false);
  const [showBranchDrawer, setShowBranchDrawer] = useState(false);

  // Audio timeline state
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [timelineZoom, setTimelineZoom] = useState(50);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const { state: metmapState, dispatch: metmapDispatch } = useMetMapCore();
  const { seekToTime, setPlaybackMode } = usePlayback();
  const { loadPracticeHistory } = usePractice();

  // Metronome audio hook
  const { playClick } = useMetronomeAudio();

  // Snapshot undo (fallback for non-collab mode)
  const snapshotHistory = useMetMapHistory();

  // Active branch state (null = main)
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);

  // Collaboration (Yjs real-time sync)
  const handleRemoteSectionsChange = useCallback((remoteSections: Section[]) => {
    metmapDispatch({ type: 'SET_EDITED_SECTIONS', payload: remoteSections });
  }, [metmapDispatch]);

  const {
    status: collabStatus,
    peerCount: collabPeerCount,
    doc: collabDoc,
    awareness: collabAwareness,
    reconnectAttempts: collabReconnectAttempts,
    forceReconnect: collabForceReconnect,
  } = useMetMapCollaboration(currentSong?.id, handleRemoteSectionsChange, { branchId: activeBranchId });

  // Y.UndoManager (collaborative undo — only undoes your changes)
  const yjsUndo = useMetMapUndo(collabDoc);

  // Choose active undo system: Yjs when collab is active, snapshot otherwise
  const isCollabActive = collabStatus === 'synced' && collabDoc !== null;
  const canUndo = isCollabActive ? yjsUndo.canUndo : snapshotHistory.canUndo;
  const canRedo = isCollabActive ? yjsUndo.canRedo : snapshotHistory.canRedo;

  // Presence (awareness-based live indicators)
  const {
    peers: collabPeers,
    remotePeers,
    setEditingSection: setPresenceEditingSection,
    setCursorBarFast,
  } = useMetMapPresence(
    collabAwareness,
    {
      userId: user?.id || '',
      username: user?.displayName || user?.name || 'You',
      avatar: user?.avatar,
    }
  );

  // Canvas comments (Yjs-synced, Sprint 32)
  const {
    comments: canvasComments,
    addComment: addCanvasComment,
    replyToComment: replyCanvasComment,
    resolveComment: resolveCanvasComment,
    deleteComment: deleteCanvasComment,
    toggleReaction: toggleCanvasReaction,
  } = useMetMapComments(collabDoc);

  // Conflict detection toasts (Sprint 32)
  const [currentEditingSection, setCurrentEditingSection] = useState<string | null>(null);
  useConflictDetection(currentEditingSection, selectedKeyframeId, remotePeers, editedSections);

  const totalBars = useMemo(() =>
    editedSections.reduce((sum, s) => sum + s.bars, 0),
    [editedSections]
  );

  // Snapshots (Sprint 33)
  const {
    snapshots,
    isLoading: snapshotsLoading,
    createSnapshot: createSnapshotMutation,
    deleteSnapshot: deleteSnapshotMutation,
    restoreSnapshot: restoreSnapshotMutation,
    isCreating: isSnapshotCreating,
    isRestoring: isSnapshotRestoring,
  } = useMetMapSnapshots(currentSong?.id);

  // Branches (Sprint 33)
  const {
    branches,
    isLoading: _branchesLoading,
    createBranch: createBranchMutation,
    deleteBranch: deleteBranchMutation,
    mergeBranch: mergeBranchMutation,
    isCreating: isBranchCreating,
    isMerging: isBranchMerging,
  } = useMetMapBranches(currentSong?.id);

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
      setRepetitionCount((prev) => prev + 1);
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
            projectId
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

  const handleSelectSong = (song: Song) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
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
    if (!confirm(`Delete "${currentSong.title}"? This cannot be undone.`)) return;

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

  const snapshotAndUpdateChords = (index: number, chords: import('../../contexts/metmap/types').Chord[]) => {
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

  const handleUpdateAnimations = (sectionIndex: number, animations: import('../../contexts/metmap/types').Animation[]) => {
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

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Tools', path: '/tools' },
        { label: 'MetMap' }
      ]}
    >
      {/* Offline Indicator */}
      <OfflineIndicator position="top" />

      {/* Breadcrumb Navigation */}
      <div className="px-4 py-2 bg-white border-b border-gray-100">
        <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
          <Link to="/tools" className="text-indigo-600 hover:text-indigo-700 transition-colors">
            Tools
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-700 font-medium">MetMap</span>
          {currentProject && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-indigo-600 font-medium">{currentProject.name}</span>
            </>
          )}
        </nav>
      </div>

      {/* Project selection prompt */}
      {!projectId && (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a project to use MetMap</h2>
            <p className="text-gray-500 mb-6">
              MetMap sessions are project-scoped. Choose a project to start mapping your musical timeline with tempo changes, time signatures, and chord progressions.
            </p>
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Go to Projects
            </Link>
          </div>
        </div>
      )}

      {projectId && <div className="h-full flex">
        {/* Mobile header with sidebar toggle */}
        {isMobile && (
          <div className="absolute top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
            <button
              onClick={() => setShowSongList(!showSongList)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              aria-label={showSongList ? 'Hide song list' : 'Show song list'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="font-medium text-gray-900">
              {currentSong?.title || 'MetMap'}
            </div>
            <div className="flex items-center gap-2">
              <NetworkStatusBadge />
              <button
                onClick={() => setShowNewSongModal(true)}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                aria-label="New song"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Left sidebar - Song list */}
        {isMobile ? (
          <Drawer direction="left" open={showSongList} onOpenChange={setShowSongList}>
            <DrawerContent className="w-72 h-full">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold text-gray-900">MetMap</h2>
                    <button
                      onClick={() => setShowNewSongModal(true)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      aria-label="New song"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Rehearse tempo + meter changes and map chord progressions — great for complex pieces.
                  </p>
                  <a
                    href="/projects"
                    className="inline-block text-xs text-indigo-600 hover:text-indigo-700 mb-3"
                  >
                    Organize this work in a project →
                  </a>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search songs..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Stats */}
                {stats && (
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 flex gap-3">
                    <span>{stats.songCount} songs</span>
                    <span>{stats.practiceCount} sessions</span>
                    <span>{formatDuration(stats.totalPracticeMinutes)} practiced</span>
                  </div>
                )}

                {/* Song list */}
                <div className="flex-1 overflow-y-auto">
                  {songsLoading && songs.length === 0 ? (
                    <div className="p-6 flex flex-col items-center justify-center text-gray-500">
                      <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mb-3" />
                      <span className="text-sm">Loading songs...</span>
                    </div>
                  ) : songs.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">No songs yet</h3>
                      <p className="text-xs text-gray-500 mb-4">
                        Map out tempo changes, time signatures, and chord progressions for practice.
                      </p>
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            const quickStartSections: Section[] = [
                              { id: crypto.randomUUID(), name: 'Intro', bars: 4, timeSignature: '4/4', tempoStart: 120, orderIndex: 0, startBar: 1 },
                              { id: crypto.randomUUID(), name: 'Verse', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 1, startBar: 5 },
                              { id: crypto.randomUUID(), name: 'Chorus', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 2, startBar: 13 },
                              { id: crypto.randomUUID(), name: 'Verse', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 3, startBar: 21 },
                              { id: crypto.randomUUID(), name: 'Chorus', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 4, startBar: 29 },
                              { id: crypto.randomUUID(), name: 'Bridge', bars: 4, timeSignature: '4/4', tempoStart: 100, orderIndex: 5, startBar: 37 },
                              { id: crypto.randomUUID(), name: 'Chorus', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 6, startBar: 41 },
                              { id: crypto.randomUUID(), name: 'Outro', bars: 4, timeSignature: '4/4', tempoStart: 120, orderIndex: 7, startBar: 49 },
                            ];
                            const quickStartSong: Partial<Song> = {
                              title: 'My Song',
                              projectId: undefined,
                              bpmDefault: 120,
                              timeSignatureDefault: '4/4',
                              sectionCount: quickStartSections.length,
                              totalBars: quickStartSections.reduce((sum, s) => sum + s.bars, 0),
                              practiceCount: 0,
                              sections: quickStartSections,
                            };
                            createSong(quickStartSong);
                          }}
                          className="w-full px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Quick Start (with template)
                        </button>
                        <button
                          onClick={() => setShowNewSongModal(true)}
                          className="w-full px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Start from scratch
                        </button>
                      </div>
                    </div>
                  ) : (
                    songs.map((song) => (
                      <SongListItem
                        key={song.id}
                        song={song}
                        isSelected={currentSong?.id === song.id}
                        onClick={() => handleSelectSong(song)}
                      />
                    ))
                  )}
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <div className="w-72 border-r border-gray-200 bg-white flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900">MetMap</h2>
                <button
                  onClick={() => setShowNewSongModal(true)}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  aria-label="New song"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Rehearse tempo + meter changes and map chord progressions — great for complex pieces.
              </p>
              <a
                href="/projects"
                className="inline-block text-xs text-indigo-600 hover:text-indigo-700 mb-3"
              >
                Organize this work in a project →
              </a>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Stats */}
            {stats && (
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 flex gap-3">
                <span>{stats.songCount} songs</span>
                <span>{stats.practiceCount} sessions</span>
                <span>{formatDuration(stats.totalPracticeMinutes)} practiced</span>
              </div>
            )}

            {/* Song list */}
            <div className="flex-1 overflow-y-auto">
              {songsLoading && songs.length === 0 ? (
                <div className="p-6 flex flex-col items-center justify-center text-gray-500">
                  <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mb-3" />
                  <span className="text-sm">Loading songs...</span>
                </div>
              ) : songs.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No songs yet</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Map out tempo changes, time signatures, and chord progressions for practice.
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const quickStartSections: Section[] = [
                          { id: crypto.randomUUID(), name: 'Intro', bars: 4, timeSignature: '4/4', tempoStart: 120, orderIndex: 0, startBar: 1 },
                          { id: crypto.randomUUID(), name: 'Verse', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 1, startBar: 5 },
                          { id: crypto.randomUUID(), name: 'Chorus', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 2, startBar: 13 },
                          { id: crypto.randomUUID(), name: 'Verse', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 3, startBar: 21 },
                          { id: crypto.randomUUID(), name: 'Chorus', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 4, startBar: 29 },
                          { id: crypto.randomUUID(), name: 'Bridge', bars: 4, timeSignature: '4/4', tempoStart: 100, orderIndex: 5, startBar: 37 },
                          { id: crypto.randomUUID(), name: 'Chorus', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 6, startBar: 41 },
                          { id: crypto.randomUUID(), name: 'Outro', bars: 4, timeSignature: '4/4', tempoStart: 120, orderIndex: 7, startBar: 49 },
                        ];
                        const quickStartSong: Partial<Song> = {
                          title: 'My Song',
                          projectId: undefined,
                          bpmDefault: 120,
                          timeSignatureDefault: '4/4',
                          sectionCount: quickStartSections.length,
                          totalBars: quickStartSections.reduce((sum, s) => sum + s.bars, 0),
                          practiceCount: 0,
                          sections: quickStartSections,
                        };
                        createSong(quickStartSong);
                      }}
                      className="w-full px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Quick Start (with template)
                    </button>
                    <button
                      onClick={() => setShowNewSongModal(true)}
                      className="w-full px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Start from scratch
                    </button>
                  </div>
                </div>
              ) : (
                songs.map((song) => (
                  <SongListItem
                    key={song.id}
                    song={song}
                    isSelected={currentSong?.id === song.id}
                    onClick={() => handleSelectSong(song)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Main content + AI panel */}
        <div className="flex-1 flex min-w-0">
        <div className={`flex-1 flex flex-col min-w-0 ${isMobile ? 'pt-12 snap-y snap-proximity overflow-y-auto overflow-x-hidden' : ''}`}>
          {currentSongLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-gray-500">Loading song...</div>
            </div>
          ) : currentSong ? (
            <>
              {/* Song header */}
              <div className={`p-3 sm:p-4 border-b border-gray-200 bg-white ${isMobile ? 'snap-start' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <input
                      type="text"
                      value={currentSong.title}
                      onChange={(e) => updateSong(currentSong.id, { title: e.target.value })}
                      className="text-lg sm:text-xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-1 -ml-1 w-full"
                    />
                    <div className="text-xs sm:text-sm text-gray-500 mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span>{currentSong.bpmDefault} BPM</span>
                      <span>{currentSong.timeSignatureDefault}</span>
                      <span>{currentSong.totalBars} bars total</span>
                      {currentSong.projectName && (
                        <span className="text-indigo-600">Project: {currentSong.projectName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {/* Collaboration status + presence */}
                    {collabStatus !== 'disconnected' && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-50 border border-neutral-200" title={`Collaboration: ${collabStatus}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            collabStatus === 'synced' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'
                          }`} />
                          <span className="text-[10px] text-neutral-600">
                            {collabPeerCount <= 1 ? 'Solo' : `${collabPeerCount} editing`}
                          </span>
                        </div>
                        {collabPeers.length > 1 && (
                          <PresenceAvatars
                            peers={collabPeers}
                            currentUserId={user?.id || ''}
                          />
                        )}
                      </div>
                    )}
                    {/* Branch switcher (Sprint 33) */}
                    {isMobile ? (
                      <>
                        <button
                          onClick={() => setShowBranchDrawer(true)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                          aria-label="Branches"
                          title="Branches"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </button>
                        <Drawer direction="bottom" open={showBranchDrawer} onOpenChange={setShowBranchDrawer}>
                          <DrawerContent className="max-h-[80vh] p-4">
                            <BranchSwitcher
                              branches={branches}
                              snapshots={snapshots}
                              activeBranchId={activeBranchId}
                              currentUserId={user?.id || ''}
                              onSwitchBranch={setActiveBranchId}
                              onCreateBranch={createBranchMutation}
                              onDeleteBranch={deleteBranchMutation}
                              onMergeBranch={mergeBranchMutation}
                              isCreating={isBranchCreating}
                              isMerging={isBranchMerging}
                            />
                          </DrawerContent>
                        </Drawer>
                      </>
                    ) : (
                      <BranchSwitcher
                        branches={branches}
                        snapshots={snapshots}
                        activeBranchId={activeBranchId}
                        currentUserId={user?.id || ''}
                        onSwitchBranch={setActiveBranchId}
                        onCreateBranch={createBranchMutation}
                        onDeleteBranch={deleteBranchMutation}
                        onMergeBranch={mergeBranchMutation}
                        isCreating={isBranchCreating}
                        isMerging={isBranchMerging}
                      />
                    )}
                    {/* Snapshot drawer trigger (mobile only) */}
                    {isMobile && isCollabActive && (
                      <button
                        onClick={() => setShowSnapshotDrawer(true)}
                        className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                        aria-label="Snapshots"
                        title="Snapshots"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    )}
                    {hasUnsavedChanges && (
                      <span className="text-xs text-orange-500">Unsaved changes</span>
                    )}
                    <TapTempo onTempoDetected={handleTapTempo} />
                    <button
                      onClick={handleUndo}
                      disabled={!canUndo}
                      className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Undo"
                      title="Undo (Ctrl+Z)"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={!canRedo}
                      className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Redo"
                      title="Redo (Ctrl+Shift+Z)"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                      </svg>
                    </button>
                    <button
                      onClick={saveSections}
                      disabled={!hasUnsavedChanges}
                      className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isMobile ? 'Save' : 'Save Timeline'}
                    </button>
                    <ExportImport
                      currentSong={currentSong}
                      sections={editedSections}
                      onImportSong={handleImportSong}
                      projectId={projectId}
                      token={token || undefined}
                      onAssetCreated={handleAssetCreated}
                      onShareToChat={handleShareToChat}
                    />
                    <button
                      onClick={() => setShowAIPanel(!showAIPanel)}
                      className={`p-1.5 transition-colors ${
                        showAIPanel ? 'text-violet-600 bg-violet-50 rounded' : 'text-gray-400 hover:text-violet-600'
                      }`}
                      aria-label="AI Co-Pilot"
                      title="AI Co-Pilot"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Keyboard shortcuts"
                      title="Keyboard shortcuts"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={handleDeleteSong}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Delete song"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {showShortcutsHelp && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <ShortcutsHelp />
                  </div>
                )}
              </div>

              {/* Connection status banner */}
              <ConnectionStatus
                status={collabStatus}
                reconnectAttempts={collabReconnectAttempts}
                onRetry={collabForceReconnect}
              />

              {/* Visual Timeline */}
              {showVisualTimeline && editedSections.length > 0 && (
                <div className={`px-3 sm:px-4 py-2 border-b border-gray-200 bg-white overflow-x-auto scroll-smooth snap-x snap-mandatory [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full touch-pan-x ${isMobile ? 'snap-start' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">Timeline</span>
                    <div className="flex items-center gap-2">
                      {currentSong?.audioFileUrl && (
                        <label className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span>Zoom</span>
                          <input
                            type="range"
                            min={20}
                            max={120}
                            value={timelineZoom}
                            onChange={(e) => setTimelineZoom(Number(e.target.value))}
                            className="w-16 h-1 accent-indigo-500"
                          />
                        </label>
                      )}
                      <button
                        onClick={() => setShowVisualTimeline(false)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Hide
                      </button>
                    </div>
                  </div>

                  {/* Canvas timeline (shown when audio present for richer rendering) */}
                  {currentSong?.audioFileUrl ? (
                    <div className="space-y-1">
                      <div className="relative">
                        <TimelineCanvas
                          sections={editedSections}
                          currentBar={playback.currentBar}
                          currentTimeSeconds={playback.currentTimeSeconds ?? 0}
                          isPlaying={playback.isPlaying}
                          beatMap={currentSong.beatMap}
                          audioDuration={currentSong.audioDurationSeconds}
                          loopSection={practiceMode ? loopSection : null}
                          pixelsPerBar={timelineZoom}
                          height={100}
                          selectedKeyframeId={selectedKeyframeId}
                          onBarClick={handleTimelineBarClick}
                          onTimeClick={handleTimelineTimeClick}
                          remotePeers={remotePeers}
                          onCursorMove={setCursorBarFast}
                          onCursorLeave={() => setCursorBarFast(null)}
                          comments={canvasComments.filter(c => !c.resolved).map(c => ({
                            id: c.id,
                            color: c.color,
                            barStart: c.barStart,
                            barEnd: c.barEnd,
                            resolved: c.resolved,
                          }))}
                        />
                        {isCollabActive && (
                          <CanvasCommentLayer
                            comments={canvasComments}
                            pixelsPerBar={timelineZoom}
                            canvasHeight={100}
                            currentUserId={user?.id || ''}
                            onAddComment={(barStart, text) => {
                              const presence = collabAwareness?.getLocalState();
                              addCanvasComment(
                                barStart,
                                text,
                                user?.id || '',
                                user?.displayName || user?.name || 'You',
                                (presence as Record<string, unknown>)?.color as string || '#6366f1'
                              );
                            }}
                            onReplyToComment={(parentId, text) => {
                              const presence = collabAwareness?.getLocalState();
                              replyCanvasComment(
                                parentId,
                                text,
                                user?.id || '',
                                user?.displayName || user?.name || 'You',
                                (presence as Record<string, unknown>)?.color as string || '#6366f1'
                              );
                            }}
                            onResolveComment={resolveCanvasComment}
                            onDeleteComment={deleteCanvasComment}
                            onToggleReaction={(commentId, emoji) => toggleCanvasReaction(commentId, emoji, user?.id || '')}
                          />
                        )}
                      </div>

                      {/* Waveform + beat markers overlay */}
                      <div className="relative">
                        <WaveformTimeline
                          audioUrl={currentSong.audioFileUrl}
                          currentTime={playback.currentTimeSeconds ?? 0}
                          zoom={timelineZoom}
                          onSeek={handleWaveformSeek}
                          onReady={handleWaveformReady}
                          onDecode={handleWaveformDecode}
                        />
                        {currentSong.beatMap && currentSong.audioDurationSeconds && (
                          <div className="absolute inset-0">
                            <BeatMarkers
                              beatMap={currentSong.beatMap}
                              duration={currentSong.audioDurationSeconds}
                              containerWidth={editedSections.reduce((sum, s) => sum + s.bars, 0) * timelineZoom}
                              height={96}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <VisualTimeline
                      sections={editedSections}
                      currentBar={playback.currentBar}
                      isPlaying={playback.isPlaying}
                      onSectionClick={handleTimelineSectionClick}
                      loopSection={practiceMode ? loopSection : null}
                    />
                  )}

                  {/* Snapshot Panel (Sprint 33) */}
                  {isCollabActive && (isMobile ? (
                    <Drawer direction="bottom" open={showSnapshotDrawer} onOpenChange={setShowSnapshotDrawer}>
                      <DrawerContent className="max-h-[80vh] p-4">
                        <SnapshotPanel
                          snapshots={snapshots}
                          isLoading={snapshotsLoading}
                          currentUserId={user?.id || ''}
                          sectionCount={editedSections.length}
                          totalBars={totalBars}
                          onCreateSnapshot={createSnapshotMutation}
                          onDeleteSnapshot={deleteSnapshotMutation}
                          onRestoreSnapshot={restoreSnapshotMutation}
                          isCreating={isSnapshotCreating}
                          isRestoring={isSnapshotRestoring}
                        />
                      </DrawerContent>
                    </Drawer>
                  ) : (
                    <SnapshotPanel
                      snapshots={snapshots}
                      isLoading={snapshotsLoading}
                      currentUserId={user?.id || ''}
                      sectionCount={editedSections.length}
                      totalBars={totalBars}
                      onCreateSnapshot={createSnapshotMutation}
                      onDeleteSnapshot={deleteSnapshotMutation}
                      onRestoreSnapshot={restoreSnapshotMutation}
                      isCreating={isSnapshotCreating}
                      isRestoring={isSnapshotRestoring}
                    />
                  ))}

                  {/* Keyframe Editor */}
                  {editedSections.length > 0 && (
                    <KeyframeEditor
                      sections={editedSections}
                      activeSectionIndex={playback.currentSectionIndex}
                      pixelsPerBar={timelineZoom}
                      selectedKeyframeId={selectedKeyframeId}
                      onSelectKeyframe={setSelectedKeyframeId}
                      onUpdateAnimations={handleUpdateAnimations}
                    />
                  )}
                </div>
              )}

              {/* Practice Mode */}
              <div className={`px-4 py-2 border-b border-gray-200 bg-white ${isMobile ? 'snap-start' : ''}`}>
                <PracticeMode
                  sections={editedSections}
                  loopSection={loopSection}
                  onLoopSectionChange={setLoopSection}
                  tempoPercent={tempoPercent}
                  onTempoPercentChange={setTempoPercent}
                  repetitionCount={repetitionCount}
                  isActive={practiceMode}
                  onPracticeStart={(info) => setPracticeStartInfo(info)}
                  onToggleActive={() => {
                    if (practiceMode && practiceStartInfo) {
                      // Ending practice — record end tempo
                      setPracticeStartInfo(prev => prev ? { ...prev, endTempoPercent: tempoPercent } as PracticeStartInfo & { endTempoPercent: number } : null);
                    }
                    setPracticeMode(!practiceMode);
                    if (!practiceMode) setRepetitionCount(0);
                  }}
                />
                {/* Stats toggle */}
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => setShowPracticeStats(!showPracticeStats)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      showPracticeStats
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                    }`}
                  >
                    {showPracticeStats ? 'Hide Stats' : 'Stats'}
                  </button>
                </div>
                {showPracticeStats && (
                  <PracticeAnalytics
                    sessions={metmapState.practiceHistory}
                    stats={metmapState.stats}
                    sections={editedSections}
                    loading={metmapState.practiceHistoryLoading}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Audio Tracks — Multi-track mixer + legacy single-track fallback */}
              {currentSong && (
                <div className={`px-4 py-2 border-b border-gray-200 bg-white ${isMobile ? 'snap-start' : ''}`}>
                  <AudioTrackMixer
                    song={currentSong}
                    playbackMode={playback.playbackMode ?? 'metronome'}
                    onPlaybackModeChange={setPlaybackMode}
                  />
                  {/* Legacy single-track for songs with existing audio attachment */}
                  {currentSong.audioFileUrl && (
                    <AudioTrackPanel
                      song={currentSong}
                      playbackMode={playback.playbackMode ?? 'metronome'}
                      beatDetectionLoading={metmapState.beatDetectionLoading}
                      audioLoading={metmapState.audioLoading}
                      audioError={metmapState.audioError}
                      onUploadAudio={handleUploadAudio}
                      onRemoveAudio={handleRemoveAudio}
                      onDetectBeats={handleDetectBeats}
                      onAlignBpm={handleAlignBpm}
                      onPlaybackModeChange={setPlaybackMode}
                      className="mt-2"
                    />
                  )}
                </div>
              )}

              {/* Section timeline — swipe left/right to navigate sections on mobile */}
              <div
                className={`flex-1 p-3 sm:p-4 bg-gray-50 ${isMobile ? 'snap-start pb-48 overflow-visible' : 'overflow-y-auto'}`}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  (e.currentTarget as HTMLElement).dataset.swipeX = String(touch.clientX);
                }}
                onTouchEnd={(e) => {
                  const startX = Number((e.currentTarget as HTMLElement).dataset.swipeX || 0);
                  const endX = e.changedTouches[0].clientX;
                  const dx = endX - startX;
                  if (Math.abs(dx) > 80) {
                    // Swipe left → next section, swipe right → previous section
                    if (dx < 0) {
                      const nextIndex = Math.min(playback.currentSectionIndex + 1, editedSections.length - 1);
                      const startBar = editedSections.slice(0, nextIndex).reduce((sum, s) => sum + s.bars, 0) + 1;
                      seekToBar(startBar);
                    } else {
                      const prevIndex = Math.max(playback.currentSectionIndex - 1, 0);
                      const startBar = editedSections.slice(0, prevIndex).reduce((sum, s) => sum + s.bars, 0) + 1;
                      seekToBar(startBar);
                    }
                  }
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Sections</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setShowChords(!showChords)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        showChords ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {showChords ? 'Hide' : 'Show'} Chords
                    </button>
                    {!showVisualTimeline && (
                      <button
                        onClick={() => setShowVisualTimeline(true)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        Show Timeline
                      </button>
                    )}
                    <SectionTemplates
                      onAddSection={handleAddSectionTemplate}
                      compact
                    />
                  </div>
                </div>

                {editedSections.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="mb-2">No sections yet</div>
                    <button
                      onClick={() => snapshotAndAddSection({})}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      Add your first section
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editedSections.map((section, index) => {
                      const editingPeer = remotePeers.find(p => p.editingSection === section.id);
                      return (
                      <div
                        key={section.id || index}
                        role="button"
                        tabIndex={0}
                        className="relative"
                        onFocus={() => { setPresenceEditingSection(section.id || null); setCurrentEditingSection(section.id || null); }}
                        onClick={() => { setPresenceEditingSection(section.id || null); setCurrentEditingSection(section.id || null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPresenceEditingSection(section.id || null); setCurrentEditingSection(section.id || null); } }}
                      >
                        {/* Presence: colored left border when a remote peer is editing */}
                        {editingPeer && (
                          <div
                            className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full transition-all duration-300 z-10"
                            style={{ backgroundColor: editingPeer.color }}
                            title={`${editingPeer.username} is editing`}
                          >
                            <span
                              className="absolute -top-4 left-1 text-[9px] font-medium whitespace-nowrap px-1 rounded"
                              style={{ color: editingPeer.color }}
                            >
                              {editingPeer.username}
                            </span>
                          </div>
                        )}
                        <SectionRow
                          section={section}
                          index={index}
                          isPlaying={playback.isPlaying}
                          isCurrentSection={playback.currentSectionIndex === index}
                          onUpdate={(changes) => snapshotAndUpdateSection(index, changes)}
                          onRemove={() => snapshotAndRemoveSection(index)}
                          onMoveUp={() => snapshotAndReorderSections(index, index - 1)}
                          onMoveDown={() => snapshotAndReorderSections(index, index + 1)}
                          canMoveUp={index > 0}
                          canMoveDown={index < editedSections.length - 1}
                        />
                        {showChords && (
                          <ChordGrid
                            section={section}
                            sectionIndex={index}
                            chords={section.chords || []}
                            onChordsChange={(chords) => snapshotAndUpdateChords(index, chords)}
                            beatMap={currentSong?.beatMap}
                            onCrossSectionDrop={(chord, direction) => {
                              const targetIndex = direction === 'prev' ? index - 1 : index + 1;
                              if (targetIndex < 0 || targetIndex >= editedSections.length) return;
                              // Remove from source section
                              const srcChords = (section.chords || []).filter(
                                c => !(c.bar === chord.bar && c.beat === chord.beat)
                              );
                              snapshotAndUpdateChords(index, srcChords);
                              // Add to target section (bar 1, beat 1 or last bar)
                              const target = editedSections[targetIndex];
                              const destBar = direction === 'prev' ? target.bars : 1;
                              const destChords = [...(target.chords || []), { ...chord, bar: destBar, beat: 1 }];
                              snapshotAndUpdateChords(targetIndex, destChords);
                            }}
                          />
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Playback controls - sticky on mobile for field-side use */}
              <div className={`p-3 sm:p-4 border-t border-gray-200 bg-white ${isMobile ? 'sticky bottom-0 z-20 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]' : ''}`}>
                {isMobile ? (
                  <MobilePlaybackControls
                    isPlaying={playback.isPlaying}
                    isPaused={playback.isPaused}
                    currentBar={playback.currentBar}
                    currentBeat={playback.currentBeat}
                    currentTempo={playback.currentTempo}
                    totalBars={totalBars}
                    countingOff={playback.countingOff}
                    countoffBeatsRemaining={playback.countoffBeatsRemaining}
                    onPlay={handlePlay}
                    onPause={pause}
                    onStop={stop}
                    onSeekToBar={seekToBar}
                    defaultTempo={currentSong?.bpmDefault || 120}
                  />
                ) : (
                  <PlaybackControls
                    isPlaying={playback.isPlaying}
                    isPaused={playback.isPaused}
                    currentBar={playback.currentBar}
                    currentBeat={playback.currentBeat}
                    currentTempo={playback.currentTempo}
                    countingOff={playback.countingOff}
                    countoffBeatsRemaining={playback.countoffBeatsRemaining}
                    onPlay={handlePlay}
                    onPause={pause}
                    onStop={stop}
                    tempoOverride={tempoOverride}
                    setTempoOverride={setTempoOverride}
                    useClick={useClick}
                    setUseClick={setUseClick}
                    countoffBars={countoffBars}
                    setCountoffBars={setCountoffBars}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Select or create a song</h3>
                <p className="text-gray-500 mb-4">Choose a song from the list or create a new one</p>
                <button
                  onClick={() => setShowNewSongModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Create New Song
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Co-Pilot Panel (Sprint 34) */}
        {currentSong && token && (isMobile ? (
          <Drawer direction="bottom" open={showAIPanel} onOpenChange={setShowAIPanel}>
            <DrawerContent className="max-h-[80vh]">
              <MetMapAIPanel
                songId={currentSong.id}
                token={token}
                sections={editedSections}
                onClose={() => setShowAIPanel(false)}
                onApplyChords={(sectionIndex, chords) => {
                  snapshotAndUpdateChords(sectionIndex, chords);
                  showNotification({ type: 'success', title: 'Chords Applied', message: `Applied AI chord suggestion to ${editedSections[sectionIndex]?.name || 'section'}` });
                }}
              />
            </DrawerContent>
          </Drawer>
        ) : showAIPanel && (
          <MetMapAIPanel
            songId={currentSong.id}
            token={token}
            sections={editedSections}
            onClose={() => setShowAIPanel(false)}
            onApplyChords={(sectionIndex, chords) => {
              snapshotAndUpdateChords(sectionIndex, chords);
              showNotification({ type: 'success', title: 'Chords Applied', message: `Applied AI chord suggestion to ${editedSections[sectionIndex]?.name || 'section'}` });
            }}
          />
        ))}
        </div>
      </div>}

      {/* Modals */}
      <NewSongModal
        isOpen={showNewSongModal}
        onClose={() => setShowNewSongModal(false)}
        onCreate={handleCreateSong}
      />
    </DashboardLayout>
  );
}
