/**
 * TimelineCanvas - Main canvas for displaying and editing clips
 *
 * Renders clips on tracks with drag-and-drop support.
 */

import * as React from 'react';
import { TimelineProject } from '@/store';
import { useTimeline } from '@/store';
import { ClipComponent } from './ClipComponent';

interface TimelineCanvasProps {
  project: TimelineProject;
  currentTime: number;
  zoom: number;
  scrollX: number;
  selectedClipIds: string[];
  className?: string;
}

export function TimelineCanvas({
  project,
  currentTime,
  zoom,
  selectedClipIds,
  className = '',
}: TimelineCanvasProps) {
  const timeline = useTimeline();
  const canvasRef = React.useRef<HTMLDivElement>(null);

  const [dragState, setDragState] = React.useState<{
    clipId: string;
    startX: number;
    startY: number;
    originalStartTime: number;
    originalTrackId: string;
    mode: 'move' | 'trim-start' | 'trim-end';
  } | null>(null);

  const pixelsPerMs = zoom / 1000;
  const totalWidth = project.duration * pixelsPerMs;

  // Calculate track positions
  const trackPositions = React.useMemo(() => {
    let y = 0;
    const positions: Record<string, { top: number; height: number }> = {};

    project.tracks.forEach((track) => {
      positions[track.id] = { top: y, height: track.height };
      y += track.height;
    });

    return positions;
  }, [project.tracks]);

  const totalHeight = Object.values(trackPositions).reduce(
    (sum, pos) => sum + pos.height,
    0
  );

  // Handle clip drag
  const handleClipDragStart = (
    clipId: string,
    e: React.MouseEvent,
    mode: 'move' | 'trim-start' | 'trim-end'
  ) => {
    const clip = project.clips[clipId];
    if (!clip) return;

    e.preventDefault();
    e.stopPropagation();

    // Save snapshot for undo
    timeline.saveSnapshot();

    setDragState({
      clipId,
      startX: e.clientX,
      startY: e.clientY,
      originalStartTime: clip.startTime,
      originalTrackId: clip.trackId,
      mode,
    });
  };

  // Handle mouse move during drag
  React.useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX;
      const deltaTime = deltaX / pixelsPerMs;

      const clip = project.clips[dragState.clipId];
      if (!clip) return;

      switch (dragState.mode) {
        case 'move': {
          const newTime = Math.max(0, dragState.originalStartTime + deltaTime);

          // Find target track based on Y position
          const deltaY = e.clientY - dragState.startY;
          let targetTrackId = dragState.originalTrackId;

          for (const track of project.tracks) {
            const pos = trackPositions[track.id];
            const trackCenterY = pos.top + pos.height / 2;
            const originalTrackPos = trackPositions[dragState.originalTrackId];
            const originalCenterY = originalTrackPos.top + originalTrackPos.height / 2;

            if (Math.abs(trackCenterY - (originalCenterY + deltaY)) < pos.height / 2) {
              targetTrackId = track.id;
              break;
            }
          }

          timeline.moveClip(dragState.clipId, targetTrackId, newTime);
          break;
        }

        case 'trim-start': {
          const newDelta = Math.max(-clip.startTime, deltaTime);
          timeline.trimClip(dragState.clipId, newDelta, 0);
          break;
        }

        case 'trim-end': {
          timeline.trimClip(dragState.clipId, 0, deltaTime);
          break;
        }
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, pixelsPerMs, project.clips, project.tracks, trackPositions, timeline]);

  // Handle click to select
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Deselect if clicking on empty space
    if (e.target === canvasRef.current) {
      timeline.clearSelection();
    }
  };

  // Handle clip selection
  const handleClipClick = (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      timeline.selectClips([clipId], true);
    } else {
      timeline.selectClips([clipId]);
    }
  };

  // Playhead position
  const playheadX = currentTime * pixelsPerMs;

  return (
    <div
      ref={canvasRef}
      className={`relative bg-gray-850 ${className}`}
      style={{
        width: Math.max(totalWidth, '100%' as unknown as number),
        height: totalHeight,
        minHeight: 200,
      }}
      onClick={handleCanvasClick}
    >
      {/* Track backgrounds */}
      {project.tracks.map((track, index) => {
        const pos = trackPositions[track.id];
        return (
          <div
            key={track.id}
            className={`absolute left-0 right-0 ${
              index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-800/30'
            } ${!track.visible ? 'opacity-50' : ''}`}
            style={{
              top: pos.top,
              height: pos.height,
            }}
          />
        );
      })}

      {/* Grid lines */}
      <GridLines duration={project.duration} zoom={zoom} height={totalHeight} />

      {/* Clips */}
      {Object.values(project.clips).map((clip) => {
        const track = project.tracks.find((t) => t.id === clip.trackId);
        if (!track) return null;

        const pos = trackPositions[clip.trackId];
        if (!pos) return null;

        return (
          <ClipComponent
            key={clip.id}
            clip={clip}
            track={track}
            top={pos.top + 4}
            height={pos.height - 8}
            pixelsPerMs={pixelsPerMs}
            isSelected={selectedClipIds.includes(clip.id)}
            isLocked={track.locked}
            onMouseDown={(e, mode) => handleClipDragStart(clip.id, e, mode)}
            onClick={(e) => handleClipClick(clip.id, e)}
          />
        );
      })}

      {/* Playhead */}
      <div
        className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-10"
        style={{ left: playheadX }}
      />

      {/* Selection box (future feature) */}
    </div>
  );
}

// Grid lines component
function GridLines({
  duration,
  zoom,
  height,
}: {
  duration: number;
  zoom: number;
  height: number;
}) {
  const pixelsPerMs = zoom / 1000;

  // Calculate grid interval based on zoom
  let intervalMs: number;
  if (zoom < 20) {
    intervalMs = 60000;
  } else if (zoom < 50) {
    intervalMs = 30000;
  } else if (zoom < 100) {
    intervalMs = 10000;
  } else if (zoom < 200) {
    intervalMs = 5000;
  } else {
    intervalMs = 1000;
  }

  const lines: React.ReactNode[] = [];
  for (let time = intervalMs; time < duration; time += intervalMs) {
    const x = time * pixelsPerMs;
    lines.push(
      <div
        key={time}
        className="absolute top-0 bottom-0 w-px bg-gray-700/50"
        style={{ left: x, height }}
      />
    );
  }

  return <>{lines}</>;
}

export default TimelineCanvas;
