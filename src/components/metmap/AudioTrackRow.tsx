/**
 * AudioTrackRow — Single track row in the multi-track mixer.
 *
 * Shows track name (editable), volume slider, pan slider, mute/solo buttons,
 * beat detection trigger, and delete button.
 */

import { useState, useRef, useCallback } from 'react';
import { Volume2, VolumeX, X, Zap } from 'lucide-react';
import { TrackWaveform } from './TrackWaveform';
import type { AudioTrack, UpdateTrackData } from '../../hooks/useAudioTracks';

interface AudioTrackRowProps {
  track: AudioTrack;
  index: number;
  isMutedBySolo: boolean;
  onUpdate: (changes: UpdateTrackData) => void;
  onDelete: () => void;
  onDetectBeats?: () => void;
}

const TRACK_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioTrackRow({
  track,
  index,
  isMutedBySolo,
  onUpdate,
  onDelete,
  onDetectBeats,
}: AudioTrackRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(track.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const colorClass = TRACK_COLORS[index % TRACK_COLORS.length];
  const isEffectivelyMuted = track.muted || isMutedBySolo;

  const handleNameSubmit = useCallback(() => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== track.name) {
      onUpdate({ name: trimmed });
    } else {
      setEditName(track.name);
    }
    setEditing(false);
  }, [editName, track.name, onUpdate]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleNameSubmit();
      if (e.key === 'Escape') {
        setEditName(track.name);
        setEditing(false);
      }
    },
    [handleNameSubmit, track.name]
  );

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 bg-neutral-50 hover:bg-neutral-100 transition-colors ${
        isEffectivelyMuted ? 'opacity-50' : ''
      }`}
    >
      {/* Color indicator */}
      <div className={`w-1.5 h-8 rounded-full ${colorClass} shrink-0`} />

      {/* Track name */}
      <div className="min-w-0 w-24 shrink-0">
        {editing ? (
          <input
            ref={nameInputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleNameKeyDown}
            className="w-full text-xs font-medium bg-white border border-indigo-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              setEditing(true);
              setEditName(track.name);
            }}
            className="text-xs font-medium text-neutral-700 truncate block w-full text-left hover:text-indigo-600"
            title={`${track.name}${track.audioDurationSeconds ? ` (${formatDuration(track.audioDurationSeconds)})` : ''}`}
          >
            {track.name}
          </button>
        )}
      </div>

      {/* Waveform */}
      {track.audioUrl && (
        <TrackWaveform
          audioUrl={track.audioUrl}
          trackIndex={index}
          beatMap={track.beatMap}
          height={28}
          className="flex-1 min-w-0 rounded"
        />
      )}

      {/* Volume slider */}
      <div className="flex items-center gap-1 w-24 shrink-0">
        <button
          onClick={() => onUpdate({ muted: !track.muted })}
          className={`p-0.5 rounded transition-colors ${
            track.muted
              ? 'text-red-500 hover:text-red-600'
              : 'text-neutral-400 hover:text-neutral-600'
          }`}
          aria-label={track.muted ? 'Unmute' : 'Mute'}
          title={track.muted ? 'Unmute' : 'Mute'}
        >
          {track.muted ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(track.volume * 100)}
          onChange={(e) => onUpdate({ volume: Number(e.target.value) / 100 })}
          className="flex-1 h-1 accent-indigo-500 min-w-0"
          aria-label={`Volume for ${track.name}`}
          title={`Volume: ${Math.round(track.volume * 100)}%`}
        />
      </div>

      {/* Pan slider */}
      <div className="flex items-center gap-1 w-20 shrink-0">
        <span className="text-[9px] text-neutral-400">L</span>
        <input
          type="range"
          min={-100}
          max={100}
          value={Math.round(track.pan * 100)}
          onChange={(e) => onUpdate({ pan: Number(e.target.value) / 100 })}
          className="flex-1 h-1 accent-indigo-500"
          aria-label={`Pan for ${track.name}`}
          title={`Pan: ${track.pan === 0 ? 'Center' : track.pan < 0 ? `${Math.round(-track.pan * 100)}% Left` : `${Math.round(track.pan * 100)}% Right`}`}
        />
        <span className="text-[9px] text-neutral-400">R</span>
      </div>

      {/* Mute button */}
      <button
        onClick={() => onUpdate({ muted: !track.muted })}
        className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors ${
          track.muted
            ? 'bg-red-100 text-red-700'
            : 'bg-neutral-200 text-neutral-500 hover:bg-neutral-300'
        }`}
        aria-label={track.muted ? 'Unmute track' : 'Mute track'}
      >
        M
      </button>

      {/* Solo button */}
      <button
        onClick={() => onUpdate({ solo: !track.solo })}
        className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors ${
          track.solo
            ? 'bg-amber-100 text-amber-700'
            : 'bg-neutral-200 text-neutral-500 hover:bg-neutral-300'
        }`}
        aria-label={track.solo ? 'Unsolo track' : 'Solo track'}
      >
        S
      </button>

      {/* Beat detection */}
      {onDetectBeats && !track.beatMap && (
        <button
          onClick={onDetectBeats}
          className="p-0.5 text-amber-500 hover:text-amber-600 transition-colors"
          aria-label="Detect beats"
          title="Detect beats"
        >
          <Zap className="h-3.5 w-3.5" />
        </button>
      )}
      {track.beatMap && (
        <span className="text-[9px] text-amber-600 font-medium" title={`${track.beatMap.bpm} BPM detected`}>
          {track.beatMap.bpm}
        </span>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-0.5 text-neutral-300 hover:text-red-500 transition-colors"
        aria-label={`Remove ${track.name}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default AudioTrackRow;
