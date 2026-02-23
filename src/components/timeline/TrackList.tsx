/**
 * TrackList - Timeline track controls panel
 *
 * Shows track names and control buttons (mute, solo, lock, visibility).
 */

import * as React from 'react';
import {
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Headphones,
  Plus,
  GripVertical,
  Film,
  Music,
  Type,
  Sparkles,
  Flag,
} from 'lucide-react';
import { Track, TrackType } from '@/store';
import { useTimeline } from '@/store';

interface TrackListProps {
  tracks: Track[];
  style?: React.CSSProperties;
  className?: string;
}

const TRACK_ICONS: Record<TrackType, React.ComponentType<{ className?: string }>> = {
  video: Film,
  audio: Music,
  text: Type,
  effect: Sparkles,
  marker: Flag,
};

const TRACK_COLORS: Record<TrackType, string> = {
  video: 'bg-blue-500',
  audio: 'bg-green-500',
  text: 'bg-purple-500',
  effect: 'bg-orange-500',
  marker: 'bg-pink-500',
};

export function TrackList({ tracks, style, className = '' }: TrackListProps) {
  const timeline = useTimeline();
  const [draggedTrackId, setDraggedTrackId] = React.useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null);

  const handleAddTrack = (type: TrackType) => {
    timeline.addTrack({
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${tracks.filter((t) => t.type === type).length + 1}`,
      height: 60,
      locked: false,
      muted: false,
      solo: false,
      visible: true,
    });
  };

  const handleDragStart = (e: React.DragEvent, trackId: string) => {
    setDraggedTrackId(trackId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    if (draggedTrackId && draggedTrackId !== trackId) {
      setDropTargetId(trackId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedTrackId && draggedTrackId !== targetId) {
      const newOrder = tracks.map((t) => t.id);
      const dragIndex = newOrder.indexOf(draggedTrackId);
      const dropIndex = newOrder.indexOf(targetId);

      newOrder.splice(dragIndex, 1);
      newOrder.splice(dropIndex, 0, draggedTrackId);

      timeline.reorderTracks(newOrder);
    }
    setDraggedTrackId(null);
    setDropTargetId(null);
  };

  const handleDragEnd = () => {
    setDraggedTrackId(null);
    setDropTargetId(null);
  };

  return (
    <div
      className={`flex flex-col bg-gray-800 border-r border-gray-700 ${className}`}
      style={style}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-8 px-3 bg-gray-800 border-b border-gray-700">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Tracks</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleAddTrack('video')}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title="Add Video Track"
          >
            <Film className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={() => handleAddTrack('audio')}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title="Add Audio Track"
          >
            <Music className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={() => handleAddTrack('text')}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title="Add Text Track"
          >
            <Type className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto">
        {tracks.map((track) => {
          const Icon = TRACK_ICONS[track.type];
          const colorClass = TRACK_COLORS[track.type];

          return (
            <div
              key={track.id}
              className={`flex items-center gap-2 px-2 py-1 border-b border-gray-700 ${
                dropTargetId === track.id ? 'bg-blue-500/20' : ''
              } ${draggedTrackId === track.id ? 'opacity-50' : ''}`}
              style={{ height: track.height }}
              draggable
              onDragStart={(e) => handleDragStart(e, track.id)}
              onDragOver={(e) => handleDragOver(e, track.id)}
              onDrop={(e) => handleDrop(e, track.id)}
              onDragEnd={handleDragEnd}
            >
              {/* Drag handle */}
              <div className="cursor-grab text-gray-600 hover:text-gray-400">
                <GripVertical className="w-4 h-4" aria-hidden="true" />
              </div>

              {/* Track type indicator */}
              <div className={`w-1 h-8 rounded-full ${colorClass}`} />

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
                  <input
                    type="text"
                    value={track.name}
                    onChange={(e) => timeline.updateTrack(track.id, { name: e.target.value })}
                    className="flex-1 min-w-0 bg-transparent text-sm text-white outline-none focus:bg-gray-700 rounded px-1"
                  />
                </div>
              </div>

              {/* Track controls */}
              <div className="flex items-center gap-0.5">
                {/* Solo */}
                <button
                  onClick={() => timeline.updateTrack(track.id, { solo: !track.solo })}
                  className={`p-1 rounded ${
                    track.solo
                      ? 'bg-yellow-500/20 text-yellow-500'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                  }`}
                  title="Solo"
                >
                  <Headphones className="w-3.5 h-3.5" aria-hidden="true" />
                </button>

                {/* Mute */}
                <button
                  onClick={() => timeline.updateTrack(track.id, { muted: !track.muted })}
                  className={`p-1 rounded ${
                    track.muted
                      ? 'bg-red-500/20 text-red-500'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                  }`}
                  title={track.muted ? 'Unmute' : 'Mute'}
                >
                  {track.muted ? (
                    <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>

                {/* Lock */}
                <button
                  onClick={() => timeline.updateTrack(track.id, { locked: !track.locked })}
                  className={`p-1 rounded ${
                    track.locked
                      ? 'bg-blue-500/20 text-blue-500'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                  }`}
                  title={track.locked ? 'Unlock' : 'Lock'}
                >
                  {track.locked ? (
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>

                {/* Visibility */}
                <button
                  onClick={() => timeline.updateTrack(track.id, { visible: !track.visible })}
                  className={`p-1 rounded ${
                    !track.visible
                      ? 'bg-gray-500/20 text-gray-500'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                  }`}
                  title={track.visible ? 'Hide' : 'Show'}
                >
                  {track.visible ? (
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Plus className="w-8 h-8 mb-2" aria-hidden="true" />
            <p className="text-sm">Add a track to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TrackList;
