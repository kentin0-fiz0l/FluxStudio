/**
 * TimelineEditor - Main timeline editing component
 *
 * A professional-grade timeline editor for creative projects.
 * Features:
 * - Multi-track support (video, audio, text, effects)
 * - Drag and drop clip manipulation
 * - Zoom and scroll
 * - Playhead with scrubbing
 * - Keyboard shortcuts
 */

import * as React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
} from 'lucide-react';
import {
  useTimeline,
  usePlayback,
  useTimelineProject,
  useTimelineSelection,
  useTimelineView,
} from '@/store';
import { TimeRuler } from './TimeRuler';
import { TrackList } from './TrackList';
import { TimelineCanvas } from './TimelineCanvas';
import { PlaybackControls } from './PlaybackControls';
import { useTimelineKeyboardShortcuts } from './useTimelineKeyboardShortcuts';

interface TimelineEditorProps {
  className?: string;
  projectId?: string;
}

export function TimelineEditor({ className = '' }: TimelineEditorProps) {
  const timeline = useTimeline();
  const project = useTimelineProject();
  const playback = usePlayback();
  const selection = useTimelineSelection();
  const view = useTimelineView();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useTimelineKeyboardShortcuts({
    enabled: true,
    onPlayPause: () => (playback.isPlaying ? playback.pause() : playback.play()),
    onStop: playback.stop,
    onUndo: timeline.undo,
    onRedo: timeline.redo,
    onDelete: () => {
      selection.selectedClipIds.forEach((id) => timeline.deleteClip(id));
    },
    onCopy: timeline.copy,
    onCut: timeline.cut,
    onPaste: timeline.paste,
    onSelectAll: () => {
      if (project) {
        const allClipIds = Object.keys(project.clips);
        timeline.selectClips(allClipIds);
      }
    },
  });

  // Playback timer
  React.useEffect(() => {
    if (!playback.isPlaying || !project) return;

    const startTime = Date.now();
    const startPosition = playback.currentTime;

    const tick = () => {
      const elapsed = (Date.now() - startTime) * playback.playbackRate;
      let newTime = startPosition + elapsed;

      // Handle loop
      if (playback.loop && newTime >= playback.loopEnd) {
        newTime = playback.loopStart + ((newTime - playback.loopStart) % (playback.loopEnd - playback.loopStart));
      }

      // Stop at end
      if (newTime >= project.duration) {
        if (playback.loop) {
          playback.seek(playback.loopStart);
        } else {
          playback.pause();
          playback.seek(project.duration);
          return;
        }
      }

      playback.seek(newTime);
    };

    const intervalId = setInterval(tick, 1000 / 60); // 60 fps
    return () => clearInterval(intervalId);
  }, [playback.isPlaying, playback.playbackRate, playback.loop, project?.duration]);

  // Handle scroll sync
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    view.scroll(target.scrollLeft, target.scrollTop);
  }, [view]);

  // Handle wheel zoom
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      view.setZoom(view.zoom * delta);
    }
  }, [view]);

  if (!project) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-900 text-gray-400 ${className}`}>
        <div className="text-center">
          <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No timeline loaded</p>
          <p className="text-sm mt-1">Create or load a project to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-gray-900 text-white ${className}`}
      onWheel={handleWheel}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <PlaybackControls />

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-gray-700 rounded-md px-2 py-1">
            <button
              onClick={view.zoomOut}
              className="p-1 hover:bg-gray-600 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs w-12 text-center">{Math.round(view.zoom)}%</span>
            <button
              onClick={view.zoomIn}
              className="p-1 hover:bg-gray-600 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={timeline.zoomToFit}
              className="p-1 hover:bg-gray-600 rounded ml-1"
              title="Fit to View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Time display */}
          <div className="flex items-center gap-2 bg-gray-700 rounded-md px-3 py-1">
            <span className="text-sm font-mono">{formatTime(playback.currentTime)}</span>
            <span className="text-gray-500">/</span>
            <span className="text-sm font-mono text-gray-400">{formatTime(project.duration)}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track list panel */}
        <TrackList
          tracks={project.tracks}
          style={{ width: view.trackPanelWidth }}
        />

        {/* Timeline canvas */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-auto"
          onScroll={handleScroll}
        >
          {/* Time ruler */}
          <TimeRuler
            duration={project.duration}
            zoom={view.zoom}
            scrollX={view.scrollX}
            currentTime={playback.currentTime}
            loopStart={playback.loopStart}
            loopEnd={playback.loopEnd}
            loopEnabled={playback.loop}
            onSeek={playback.seek}
          />

          {/* Canvas */}
          <TimelineCanvas
            project={project}
            currentTime={playback.currentTime}
            zoom={view.zoom}
            scrollX={view.scrollX}
            selectedClipIds={selection.selectedClipIds}
          />
        </div>
      </div>
    </div>
  );
}

// Format time as MM:SS:FF (minutes:seconds:frames)
function formatTime(ms: number, fps: number = 30): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const frames = Math.floor((ms % 1000) / (1000 / fps));

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

export default TimelineEditor;
