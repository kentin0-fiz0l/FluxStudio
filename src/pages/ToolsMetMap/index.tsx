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

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/templates/DashboardLayout';
import { useMetMap, Song, Section } from '../../contexts/MetMapContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useProjectContext } from '@/store';
import { MobilePlaybackControls } from '../../components/metmap/MobilePlaybackControls';
import { OfflineIndicator, NetworkStatusBadge } from '../../components/pwa/OfflineIndicator';
import { usePWA } from '../../hooks/usePWA';
import { ONBOARDING_STORAGE_KEYS, useFirstTimeExperience } from '../../hooks/useFirstTimeExperience';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '../../utils/apiHelpers';

// MetMap components
import { TapTempo } from '../../components/metmap/TapTempo';
import { SectionTemplates, SectionTemplate } from '../../components/metmap/SectionTemplates';
import { VisualTimeline } from '../../components/metmap/VisualTimeline';
import { PracticeMode } from '../../components/metmap/PracticeMode';
import { ExportImport } from '../../components/metmap/ExportImport';
import { useMetronomeAudio, ClickSound } from '../../components/metmap/MetronomeAudio';
import { useMetMapKeyboardShortcuts, ShortcutsHelp } from '../../hooks/useMetMapKeyboardShortcuts';
import { announceToScreenReader } from '../../utils/accessibility';

// Decomposed sub-components
import { useIsMobile, formatDuration, SongListItem, NewSongModal } from './MetMapHelpers';
import { SectionRow, ChordGrid, PlaybackControls } from './MetMapComponents';

export default function ToolsMetMap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotification();
  const projectContext = useProjectContext();
  const { token } = useAuth();
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
  const [loopSection, setLoopSection] = useState<number | null>(null);
  const [tempoPercent, setTempoPercent] = useState(100);
  const [repetitionCount, setRepetitionCount] = useState(0);
  const [clickSound, _setClickSound] = useState<ClickSound>('classic');
  const [clickVolume, _setClickVolume] = useState(80);
  const [accentFirstBeat, _setAccentFirstBeat] = useState(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Metronome audio hook
  const { playClick } = useMetronomeAudio();

  const totalBars = useMemo(() =>
    editedSections.reduce((sum, s) => sum + s.bars, 0),
    [editedSections]
  );

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
        const response = await fetch(
          getApiUrl(`/assets/${assetId}/file`),
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (!response.ok) {
          showNotification({ type: 'error', title: 'Load Failed', message: 'Could not load MetMap session from asset' });
          return;
        }

        const data = await response.json();

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

  const handleAddSectionTemplate = (template: SectionTemplate) => {
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
      const conversationsResponse = await fetch(
        getApiUrl(`/api/messaging/conversations?projectId=${projectId}&limit=1`),
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!conversationsResponse.ok) {
        throw new Error('Could not find project chat');
      }

      const convData = await conversationsResponse.json();
      const conversation = convData.conversations?.[0];

      if (!conversation) {
        showNotification({ type: 'warning', title: 'No Project Chat', message: 'Create a conversation in this project first to share MetMap sessions' });
        return;
      }

      const messageContent = `🎵 Shared MetMap: **${currentSong?.title}**\n\n` +
        `${editedSections.length} sections • ${editedSections.reduce((sum, s) => sum + s.bars, 0)} bars • ${currentSong?.bpmDefault} BPM`;

      const messageResponse = await fetch(
        getApiUrl(`/api/messaging/conversations/${conversation.id}/messages`),
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: messageContent,
            attachments: [{ type: 'asset', assetId: asset.id, name: asset.name, mimeType: 'application/json' }]
          })
        }
      );

      if (!messageResponse.ok) {
        throw new Error('Failed to send message');
      }

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
    onNewSection: () => addSection({})
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
        <div className={`${
          isMobile
            ? `fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-in-out ${
                showSongList ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'w-72'
        } border-r border-gray-200 bg-white flex flex-col`}>
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

        {/* Mobile sidebar backdrop */}
        {isMobile && showSongList && (
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={() => setShowSongList(false)}
            aria-hidden="true"
          />
        )}

        {/* Main content */}
        <div className={`flex-1 flex flex-col min-w-0 ${isMobile ? 'pt-12' : ''}`}>
          {currentSongLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-gray-500">Loading song...</div>
            </div>
          ) : currentSong ? (
            <>
              {/* Song header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <input
                      type="text"
                      value={currentSong.title}
                      onChange={(e) => updateSong(currentSong.id, { title: e.target.value })}
                      className="text-xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-1 -ml-1"
                    />
                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                      <span>{currentSong.bpmDefault} BPM</span>
                      <span>{currentSong.timeSignatureDefault}</span>
                      <span>{currentSong.totalBars} bars total</span>
                      {currentSong.projectName && (
                        <span className="text-indigo-600">Project: {currentSong.projectName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasUnsavedChanges && (
                      <span className="text-xs text-orange-500">Unsaved changes</span>
                    )}
                    <TapTempo onTempoDetected={handleTapTempo} />
                    <button
                      onClick={saveSections}
                      disabled={!hasUnsavedChanges}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Save Timeline
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

              {/* Visual Timeline */}
              {showVisualTimeline && editedSections.length > 0 && (
                <div className="px-4 py-2 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">Timeline</span>
                    <button
                      onClick={() => setShowVisualTimeline(false)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Hide
                    </button>
                  </div>
                  <VisualTimeline
                    sections={editedSections}
                    currentBar={playback.currentBar}
                    isPlaying={playback.isPlaying}
                    onSectionClick={handleTimelineSectionClick}
                    loopSection={practiceMode ? loopSection : null}
                  />
                </div>
              )}

              {/* Practice Mode */}
              <div className="px-4 py-2 border-b border-gray-200 bg-white">
                <PracticeMode
                  sections={editedSections}
                  loopSection={loopSection}
                  onLoopSectionChange={setLoopSection}
                  tempoPercent={tempoPercent}
                  onTempoPercentChange={setTempoPercent}
                  repetitionCount={repetitionCount}
                  isActive={practiceMode}
                  onToggleActive={() => {
                    setPracticeMode(!practiceMode);
                    if (!practiceMode) setRepetitionCount(0);
                  }}
                />
              </div>

              {/* Section timeline */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Sections</h3>
                  <div className="flex items-center gap-2">
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
                      onClick={() => addSection({})}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      Add your first section
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editedSections.map((section, index) => (
                      <div key={section.id || index}>
                        <SectionRow
                          section={section}
                          index={index}
                          isPlaying={playback.isPlaying}
                          isCurrentSection={playback.currentSectionIndex === index}
                          onUpdate={(changes) => updateSection(index, changes)}
                          onRemove={() => removeSection(index)}
                          onMoveUp={() => reorderSections(index, index - 1)}
                          onMoveDown={() => reorderSections(index, index + 1)}
                          canMoveUp={index > 0}
                          canMoveDown={index < editedSections.length - 1}
                        />
                        {showChords && (
                          <ChordGrid
                            section={section}
                            sectionIndex={index}
                            chords={section.chords || []}
                            onChordsChange={(chords) => updateSectionChords(index, chords)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Playback controls - responsive */}
              <div className="p-4 border-t border-gray-200 bg-white">
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
