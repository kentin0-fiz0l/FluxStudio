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

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/templates/DashboardLayout';
import { useMetMap, Section } from '../../contexts/MetMapContext';
import { useNotification } from '@/store/slices/notificationSlice';
import { useProjectContext } from '@/store';
import { MetMapPlaybackBar } from './MetMapPlaybackBar';
import { MetMapAudioRegion } from './MetMapAudioRegion';
import { OfflineIndicator } from '../../components/pwa/OfflineIndicator';
import { usePWA } from '../../hooks/usePWA';
import { useFirstTimeExperience } from '../../hooks/useFirstTimeExperience';
import { useAuth } from '@/store/slices/authSlice';

// MetMap components
import { type PracticeStartInfo } from '../../components/metmap/PracticeMode';
import { usePlayback, useMetMapCore, usePractice } from '../../contexts/metmap';
import { useMetronomeAudio, ClickSound } from '../../components/metmap/MetronomeAudio';
import { useMetMapHistory } from '../../hooks/metmap/useMetMapHistory';
import { useMetMapCollaboration } from '../../hooks/collaboration/useMetMapCollaboration';
import { useMetMapPresence } from '../../hooks/collaboration/useMetMapPresence';
import { useMetMapUndo } from '../../hooks/metmap/useMetMapUndo';
import { useConflictDetection } from '../../hooks/collaboration/useConflictDetection';
import { useMetMapComments } from '../../hooks/collaboration/useMetMapComments';
import { useMetMapSnapshots } from '../../hooks/collaboration/useMetMapSnapshots';
import { useMetMapBranches } from '../../hooks/metmap/useMetMapBranches';
import { ConnectionStatus } from '../../components/metmap/ConnectionStatus';

// Decomposed sub-components
import { useIsMobile, NewSongModal } from './MetMapHelpers';
import { useMetMapPageHandlers } from './useMetMapPageHandlers';
import { MetMapSongSidebar } from './MetMapSongSidebar';
import { MetMapSongHeader } from './MetMapSongHeader';
import { MetMapTimelineRegion } from './MetMapTimelineRegion';
import { MetMapSectionList } from './MetMapSectionList';
import { MetMapPracticeRegion } from './MetMapPracticeRegion';
import { MetMapAIRegion } from './MetMapAIRegion';
import { useMetMapPageEffects } from './useMetMapPageEffects';

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

  // Side-effects: metronome clicks, practice tracking, routing, asset loading, search
  useMetMapPageEffects({
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
  });

  const {
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
  } = useMetMapPageHandlers({
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
    setPlaybackMode,
    metmapDispatch: metmapDispatch,
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
  });

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
        <MetMapSongSidebar
          isMobile={isMobile}
          showSongList={showSongList}
          setShowSongList={setShowSongList}
          showNewSongModal={showNewSongModal}
          setShowNewSongModal={setShowNewSongModal}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          songs={songs}
          songsLoading={songsLoading}
          stats={stats}
          currentSong={currentSong}
          createSong={createSong}
          onSelectSong={handleSelectSong}
        />

        {/* Main content + AI panel */}
        <div className="flex-1 flex min-w-0">
        <div className={`flex-1 flex flex-col min-w-0 ${isMobile ? 'pt-12 snap-y snap-proximity overflow-y-auto overflow-x-hidden' : ''}`}>
          {currentSongLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-gray-500">Loading song...</div>
            </div>
          ) : currentSong ? (
            <>
              <MetMapSongHeader
                isMobile={isMobile}
                currentSong={currentSong}
                editedSections={editedSections}
                hasUnsavedChanges={hasUnsavedChanges}
                canUndo={canUndo}
                canRedo={canRedo}
                showShortcutsHelp={showShortcutsHelp}
                showAIPanel={showAIPanel}
                showBranchDrawer={showBranchDrawer}
                showSnapshotDrawer={showSnapshotDrawer}
                isCollabActive={isCollabActive}
                collabStatus={collabStatus}
                collabPeerCount={collabPeerCount}
                collabPeers={collabPeers}
                userId={user?.id || ''}
                projectId={projectId}
                token={token}
                branches={branches}
                snapshots={snapshots}
                activeBranchId={activeBranchId}
                isBranchCreating={isBranchCreating}
                isBranchMerging={isBranchMerging}
                onUpdateSongTitle={(title) => updateSong(currentSong.id, { title })}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onSave={saveSections}
                onDeleteSong={handleDeleteSong}
                onTapTempo={handleTapTempo}
                onImportSong={handleImportSong}
                onAssetCreated={handleAssetCreated}
                onShareToChat={handleShareToChat}
                setShowShortcutsHelp={setShowShortcutsHelp}
                setShowAIPanel={setShowAIPanel}
                setShowBranchDrawer={setShowBranchDrawer}
                setShowSnapshotDrawer={setShowSnapshotDrawer}
                setActiveBranchId={setActiveBranchId}
                createBranchMutation={createBranchMutation}
                deleteBranchMutation={deleteBranchMutation}
                mergeBranchMutation={mergeBranchMutation}
              />

              {/* Connection status banner */}
              <ConnectionStatus
                status={collabStatus}
                reconnectAttempts={collabReconnectAttempts}
                onRetry={collabForceReconnect}
              />

              <MetMapTimelineRegion
                isMobile={isMobile}
                showVisualTimeline={showVisualTimeline}
                setShowVisualTimeline={setShowVisualTimeline}
                currentSong={currentSong}
                editedSections={editedSections}
                playback={playback}
                practiceMode={practiceMode}
                loopSection={loopSection}
                timelineZoom={timelineZoom}
                setTimelineZoom={setTimelineZoom}
                selectedKeyframeId={selectedKeyframeId}
                setSelectedKeyframeId={setSelectedKeyframeId}
                totalBars={totalBars}
                isCollabActive={isCollabActive}
                remotePeers={remotePeers}
                setCursorBarFast={setCursorBarFast}
                canvasComments={canvasComments}
                userId={user?.id || ''}
                userDisplayName={user?.displayName || user?.name || 'You'}
                collabAwareness={collabAwareness}
                addCanvasComment={addCanvasComment}
                replyCanvasComment={replyCanvasComment}
                resolveCanvasComment={resolveCanvasComment}
                deleteCanvasComment={deleteCanvasComment}
                toggleCanvasReaction={toggleCanvasReaction}
                snapshots={snapshots}
                snapshotsLoading={snapshotsLoading}
                showSnapshotDrawer={showSnapshotDrawer}
                setShowSnapshotDrawer={setShowSnapshotDrawer}
                createSnapshotMutation={createSnapshotMutation}
                deleteSnapshotMutation={deleteSnapshotMutation}
                restoreSnapshotMutation={restoreSnapshotMutation}
                isSnapshotCreating={isSnapshotCreating}
                isSnapshotRestoring={isSnapshotRestoring}
                onTimelineBarClick={handleTimelineBarClick}
                onTimelineTimeClick={handleTimelineTimeClick}
                onTimelineSectionClick={handleTimelineSectionClick}
                onWaveformSeek={handleWaveformSeek}
                onWaveformReady={handleWaveformReady}
                onWaveformDecode={handleWaveformDecode}
                onUpdateAnimations={handleUpdateAnimations}
              />

              {/* Practice Mode */}
              <MetMapPracticeRegion
                isMobile={isMobile}
                editedSections={editedSections}
                loopSection={loopSection}
                setLoopSection={setLoopSection}
                tempoPercent={tempoPercent}
                setTempoPercent={setTempoPercent}
                repetitionCount={repetitionCount}
                practiceMode={practiceMode}
                practiceStartInfo={practiceStartInfo}
                setPracticeStartInfo={setPracticeStartInfo}
                setPracticeMode={setPracticeMode}
                setRepetitionCount={setRepetitionCount}
                showPracticeStats={showPracticeStats}
                setShowPracticeStats={setShowPracticeStats}
                practiceHistory={metmapState.practiceHistory}
                practiceStats={metmapState.stats}
                practiceHistoryLoading={metmapState.practiceHistoryLoading}
              />

              {/* Audio Tracks — Multi-track mixer + legacy single-track fallback */}
              {currentSong && (
                <MetMapAudioRegion
                  isMobile={isMobile}
                  song={currentSong}
                  playbackMode={playback.playbackMode ?? 'metronome'}
                  beatDetectionLoading={metmapState.beatDetectionLoading}
                  audioLoading={metmapState.audioLoading}
                  audioError={metmapState.audioError}
                  onPlaybackModeChange={setPlaybackMode}
                  onUploadAudio={handleUploadAudio}
                  onRemoveAudio={handleRemoveAudio}
                  onDetectBeats={handleDetectBeats}
                  onAlignBpm={handleAlignBpm}
                />
              )}

              <MetMapSectionList
                isMobile={isMobile}
                editedSections={editedSections}
                playback={playback}
                showChords={showChords}
                setShowChords={setShowChords}
                showVisualTimeline={showVisualTimeline}
                setShowVisualTimeline={setShowVisualTimeline}
                beatMap={currentSong?.beatMap}
                remotePeers={remotePeers}
                seekToBar={seekToBar}
                setPresenceEditingSection={setPresenceEditingSection}
                setCurrentEditingSection={setCurrentEditingSection}
                snapshotAndAddSection={snapshotAndAddSection}
                snapshotAndUpdateSection={snapshotAndUpdateSection}
                snapshotAndRemoveSection={snapshotAndRemoveSection}
                snapshotAndReorderSections={snapshotAndReorderSections}
                snapshotAndUpdateChords={snapshotAndUpdateChords}
                handleAddSectionTemplate={handleAddSectionTemplate}
              />

              {/* Playback controls - sticky on mobile for field-side use */}
              <MetMapPlaybackBar
                isMobile={isMobile}
                playback={playback}
                totalBars={totalBars}
                defaultTempo={currentSong?.bpmDefault || 120}
                tempoOverride={tempoOverride}
                setTempoOverride={setTempoOverride}
                useClick={useClick}
                setUseClick={setUseClick}
                countoffBars={countoffBars}
                setCountoffBars={setCountoffBars}
                onPlay={handlePlay}
                onPause={pause}
                onStop={stop}
                onSeekToBar={seekToBar}
              />
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
        {currentSong && token && (
          <MetMapAIRegion
            isMobile={isMobile}
            songId={currentSong.id}
            token={token}
            sections={editedSections}
            showAIPanel={showAIPanel}
            setShowAIPanel={setShowAIPanel}
            onApplyChords={(sectionIndex, chords) => {
              snapshotAndUpdateChords(sectionIndex, chords);
              showNotification({ type: 'success', title: 'Chords Applied', message: `Applied AI chord suggestion to ${editedSections[sectionIndex]?.name || 'section'}` });
            }}
          />
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
