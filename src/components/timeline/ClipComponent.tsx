/**
 * ClipComponent - Individual clip on the timeline
 *
 * Renders a clip with drag handles for trimming.
 */

import * as React from 'react';
import { Clip, Track } from '@/store';
import { Film, Type, Sparkles, ImageIcon, FileText } from 'lucide-react';

interface ClipComponentProps {
  clip: Clip;
  track: Track;
  top: number;
  height: number;
  pixelsPerMs: number;
  isSelected: boolean;
  isLocked: boolean;
  onMouseDown: (e: React.MouseEvent, mode: 'move' | 'trim-start' | 'trim-end') => void;
  onClick: (e: React.MouseEvent) => void;
}

const CLIP_COLORS: Record<string, string> = {
  media: 'bg-blue-600',
  text: 'bg-purple-600',
  shape: 'bg-green-600',
  transition: 'bg-orange-600',
  effect: 'bg-pink-600',
};

const CLIP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  media: Film,
  text: Type,
  shape: ImageIcon,
  transition: Sparkles,
  effect: Sparkles,
};

export function ClipComponent({
  clip,
  track,
  top,
  height,
  pixelsPerMs,
  isSelected,
  isLocked,
  onMouseDown,
  onClick,
}: ClipComponentProps) {
  const left = clip.startTime * pixelsPerMs;
  const width = clip.duration * pixelsPerMs;

  const colorClass = clip.color || CLIP_COLORS[clip.type] || 'bg-gray-600';
  const Icon = CLIP_ICONS[clip.type] || FileText;

  const handleTrimStartMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    onMouseDown(e, 'trim-start');
  };

  const handleTrimEndMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    onMouseDown(e, 'trim-end');
  };

  const handleMoveMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    onMouseDown(e, 'move');
  };

  return (
    <div
      className={`absolute rounded overflow-hidden transition-shadow ${
        isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900 shadow-lg' : ''
      } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-move'}`}
      style={{
        left,
        top,
        width: Math.max(width, 20),
        height,
      }}
      onMouseDown={handleMoveMouseDown}
      onClick={onClick}
    >
      {/* Clip background */}
      <div className={`absolute inset-0 ${colorClass} ${track.muted ? 'opacity-50' : ''}`} />

      {/* Clip content */}
      <div className="relative h-full flex items-center px-2 gap-1.5 text-white">
        {/* Thumbnail (if available) */}
        {clip.thumbnail && width > 60 && (
          <div
            className="w-8 h-8 bg-cover bg-center rounded flex-shrink-0"
            style={{ backgroundImage: `url(${clip.thumbnail})` }}
          />
        )}

        {/* Icon */}
        {!clip.thumbnail && width > 30 && <Icon className="w-4 h-4 opacity-70 flex-shrink-0" />}

        {/* Name */}
        {width > 80 && (
          <span className="text-xs font-medium truncate">{clip.name}</span>
        )}
      </div>

      {/* Waveform preview for audio (simplified) */}
      {track.type === 'audio' && width > 50 && (
        <div className="absolute bottom-1 left-2 right-2 h-4 flex items-end gap-px opacity-30">
          {Array.from({ length: Math.min(Math.floor(width / 4), 50) }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-white rounded-t"
              style={{ height: `${20 + Math.random() * 80}%` }}
            />
          ))}
        </div>
      )}

      {/* Trim handles */}
      {!isLocked && (
        <>
          {/* Left trim handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 bg-black/30 hover:bg-white/30 cursor-ew-resize z-10 group"
            onMouseDown={handleTrimStartMouseDown}
          >
            <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Right trim handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 bg-black/30 hover:bg-white/30 cursor-ew-resize z-10 group"
            onMouseDown={handleTrimEndMouseDown}
          >
            <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </>
      )}

      {/* Selection highlight */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-white/50 rounded pointer-events-none" />
      )}
    </div>
  );
}

export default ClipComponent;
