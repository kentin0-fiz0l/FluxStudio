/**
 * TimeRuler - Timeline time ruler component
 *
 * Shows time markers and playhead position.
 * Supports click-to-seek and loop region visualization.
 */

import * as React from 'react';

interface TimeRulerProps {
  duration: number;
  zoom: number;
  scrollX: number;
  currentTime: number;
  loopStart?: number;
  loopEnd?: number;
  loopEnabled?: boolean;
  onSeek: (time: number) => void;
  className?: string;
}

export function TimeRuler({
  duration,
  zoom,
  scrollX,
  currentTime,
  loopStart = 0,
  loopEnd = 0,
  loopEnabled = false,
  onSeek,
  className = '',
}: TimeRulerProps) {
  const rulerRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const pixelsPerMs = zoom / 1000;
  const totalWidth = duration * pixelsPerMs;

  // Calculate time markers
  const markers = React.useMemo(() => {
    const result: { time: number; label: string; major: boolean }[] = [];

    // Determine marker interval based on zoom
    let intervalMs: number;
    if (zoom < 20) {
      intervalMs = 60000; // 1 minute
    } else if (zoom < 50) {
      intervalMs = 30000; // 30 seconds
    } else if (zoom < 100) {
      intervalMs = 10000; // 10 seconds
    } else if (zoom < 200) {
      intervalMs = 5000; // 5 seconds
    } else {
      intervalMs = 1000; // 1 second
    }

    const majorInterval = intervalMs * 5;

    for (let time = 0; time <= duration; time += intervalMs) {
      const isMajor = time % majorInterval === 0;
      result.push({
        time,
        label: formatTimeLabel(time, intervalMs),
        major: isMajor,
      });
    }

    return result;
  }, [duration, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    setIsDragging(true);
    seekToPosition(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    seekToPosition(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const seekToPosition = (clientX: number) => {
    if (!rulerRef.current) return;

    const rect = rulerRef.current.getBoundingClientRect();
    const x = clientX - rect.left + scrollX;
    const time = Math.max(0, Math.min(x / pixelsPerMs, duration));
    onSeek(time);
  };

  React.useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

  const playheadX = currentTime * pixelsPerMs;

  return (
    <div
      ref={rulerRef}
      className={`relative h-8 bg-gray-800 border-b border-gray-700 cursor-pointer select-none ${className}`}
      style={{ width: totalWidth, minWidth: '100%' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Loop region */}
      {loopEnabled && loopEnd > loopStart && (
        <div
          className="absolute top-0 bottom-0 bg-blue-500/20 border-x border-blue-500"
          style={{
            left: loopStart * pixelsPerMs,
            width: (loopEnd - loopStart) * pixelsPerMs,
          }}
        />
      )}

      {/* Time markers */}
      {markers.map((marker) => (
        <div
          key={marker.time}
          className="absolute top-0 bottom-0 flex flex-col items-center"
          style={{ left: marker.time * pixelsPerMs }}
        >
          <div
            className={`w-px ${marker.major ? 'h-4 bg-gray-500' : 'h-2 bg-gray-600'}`}
          />
          {marker.major && (
            <span className="text-[10px] text-gray-400 mt-0.5">{marker.label}</span>
          )}
        </div>
      ))}

      {/* Playhead */}
      <div
        className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none"
        style={{ left: playheadX }}
      >
        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45 transform origin-center" />
      </div>
    </div>
  );
}

function formatTimeLabel(ms: number, interval: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (interval >= 60000) {
    return `${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${seconds}s`;
}

export default TimeRuler;
