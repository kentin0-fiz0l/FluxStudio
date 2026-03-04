import type { Song, Section, Animation } from '../../contexts/metmap/types';
import type { MetMapPresence } from '../../services/metmapCollaboration';
import type { CanvasComment } from '../../hooks/useMetMapComments';
import type { MetMapSnapshot } from '../../hooks/useMetMapSnapshots';
import { VisualTimeline } from '../../components/metmap/VisualTimeline';
import { TimelineCanvas } from '../../components/metmap/TimelineCanvas';
import { WaveformTimeline } from '../../components/metmap/WaveformTimeline';
import { BeatMarkers } from '../../components/metmap/BeatMarkers';
import { KeyframeEditor } from '../../components/metmap/KeyframeEditor';
import { CanvasCommentLayer } from '../../components/metmap/CanvasCommentLayer';
import { SnapshotPanel } from '../../components/metmap/SnapshotPanel';
import { Drawer, DrawerContent } from '../../components/ui/drawer';

interface MetMapTimelineRegionProps {
  isMobile: boolean;
  showVisualTimeline: boolean;
  setShowVisualTimeline: (v: boolean) => void;
  currentSong: Song;
  editedSections: Section[];
  playback: {
    currentBar: number;
    currentTimeSeconds: number;
    isPlaying: boolean;
    currentSectionIndex: number;
  };
  practiceMode: boolean;
  loopSection: number | null;
  timelineZoom: number;
  setTimelineZoom: (v: number) => void;
  selectedKeyframeId: string | null;
  setSelectedKeyframeId: (v: string | null) => void;
  totalBars: number;
  isCollabActive: boolean;

  // Remote peers
  remotePeers: MetMapPresence[];
  setCursorBarFast: (bar: number | null) => void;

  // Canvas comments
  canvasComments: CanvasComment[];
  userId: string;
  userDisplayName: string;
  collabAwareness: { getLocalState: () => unknown } | null;
  addCanvasComment: (barStart: number, text: string, userId: string, userName: string, color: string) => void;
  replyCanvasComment: (parentId: string, text: string, userId: string, userName: string, color: string) => void;
  resolveCanvasComment: (commentId: string) => void;
  deleteCanvasComment: (commentId: string) => void;
  toggleCanvasReaction: (commentId: string, emoji: string, userId: string) => void;

  // Snapshots
  snapshots: MetMapSnapshot[];
  snapshotsLoading: boolean;
  showSnapshotDrawer: boolean;
  setShowSnapshotDrawer: (v: boolean) => void;
  createSnapshotMutation: (data: { name: string; description?: string; sectionCount?: number; totalBars?: number }) => Promise<unknown>;
  deleteSnapshotMutation: (snapshotId: string) => Promise<unknown>;
  restoreSnapshotMutation: (snapshotId: string) => Promise<unknown>;
  isSnapshotCreating: boolean;
  isSnapshotRestoring: boolean;

  // Callbacks
  onTimelineBarClick: (bar: number) => void;
  onTimelineTimeClick: (time: number) => void;
  onTimelineSectionClick: (sectionIndex: number) => void;
  onWaveformSeek: (time: number) => void;
  onWaveformReady: (duration: number) => void;
  onWaveformDecode: (buffer: AudioBuffer) => void;
  onUpdateAnimations: (sectionIndex: number, animations: Animation[]) => void;
}

export function MetMapTimelineRegion({
  isMobile,
  showVisualTimeline,
  setShowVisualTimeline,
  currentSong,
  editedSections,
  playback,
  practiceMode,
  loopSection,
  timelineZoom,
  setTimelineZoom,
  selectedKeyframeId,
  setSelectedKeyframeId,
  totalBars,
  isCollabActive,
  remotePeers,
  setCursorBarFast,
  canvasComments,
  userId,
  userDisplayName,
  collabAwareness,
  addCanvasComment,
  replyCanvasComment,
  resolveCanvasComment,
  deleteCanvasComment,
  toggleCanvasReaction,
  snapshots,
  snapshotsLoading,
  showSnapshotDrawer,
  setShowSnapshotDrawer,
  createSnapshotMutation,
  deleteSnapshotMutation,
  restoreSnapshotMutation,
  isSnapshotCreating,
  isSnapshotRestoring,
  onTimelineBarClick,
  onTimelineTimeClick,
  onTimelineSectionClick,
  onWaveformSeek,
  onWaveformReady,
  onWaveformDecode,
  onUpdateAnimations,
}: MetMapTimelineRegionProps) {
  if (!showVisualTimeline || editedSections.length === 0) return null;

  return (
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
              onBarClick={onTimelineBarClick}
              onTimeClick={onTimelineTimeClick}
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
                currentUserId={userId}
                onAddComment={(barStart, text) => {
                  const presence = collabAwareness?.getLocalState();
                  addCanvasComment(
                    barStart,
                    text,
                    userId,
                    userDisplayName,
                    (presence as Record<string, unknown>)?.color as string || '#6366f1'
                  );
                }}
                onReplyToComment={(parentId, text) => {
                  const presence = collabAwareness?.getLocalState();
                  replyCanvasComment(
                    parentId,
                    text,
                    userId,
                    userDisplayName,
                    (presence as Record<string, unknown>)?.color as string || '#6366f1'
                  );
                }}
                onResolveComment={resolveCanvasComment}
                onDeleteComment={deleteCanvasComment}
                onToggleReaction={(commentId, emoji) => toggleCanvasReaction(commentId, emoji, userId)}
              />
            )}
          </div>

          {/* Waveform + beat markers overlay */}
          <div className="relative">
            <WaveformTimeline
              audioUrl={currentSong.audioFileUrl}
              currentTime={playback.currentTimeSeconds ?? 0}
              zoom={timelineZoom}
              onSeek={onWaveformSeek}
              onReady={onWaveformReady}
              onDecode={onWaveformDecode}
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
          onSectionClick={onTimelineSectionClick}
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
              currentUserId={userId}
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
          currentUserId={userId}
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
          onUpdateAnimations={onUpdateAnimations}
        />
      )}
    </div>
  );
}
