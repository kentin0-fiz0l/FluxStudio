/**
 * AudioTrackMixer — Multi-track audio mixer for MetMap songs.
 *
 * Shows a list of audio tracks with per-track controls (volume, pan, mute, solo),
 * an "Add Track" button, and the master playback mode toggle. Replaces the single
 * AudioTrackPanel for songs that use the multi-track backend.
 */

import { useState, useRef, useCallback } from 'react';
import { Plus, Music, Loader2, AlertCircle } from 'lucide-react';
import { AudioTrackRow } from './AudioTrackRow';
import { useAudioTracks } from '../../hooks/useAudioTracks';
import type { Song, PlaybackMode } from '../../contexts/metmap/types';

interface AudioTrackMixerProps {
  song: Song;
  playbackMode: PlaybackMode;
  onPlaybackModeChange: (mode: PlaybackMode) => void;
  onDetectBeats?: (trackId: string, audioUrl: string) => void;
  className?: string;
}

const ACCEPTED_AUDIO = '.mp3,.wav,.ogg,.flac,.m4a,.aac';

export function AudioTrackMixer({
  song,
  playbackMode,
  onPlaybackModeChange,
  onDetectBeats,
  className = '',
}: AudioTrackMixerProps) {
  const {
    tracks,
    isLoading,
    error,
    createTrack,
    updateTrack,
    deleteTrack,
    reorderTrack,
    isCreating,
  } = useAudioTracks(song.id);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);

  const handleAddTrack = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';
      try {
        await createTrack({ file, name: file.name.replace(/\.[^/.]+$/, '') });
      } catch {
        // error handled by mutation
      }
    },
    [createTrack]
  );

  const handleDragStart = useCallback((index: number) => {
    setDragSourceIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragSourceIndex !== null && dragSourceIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [dragSourceIndex]
  );

  const handleDrop = useCallback(
    (index: number) => {
      if (dragSourceIndex !== null && dragSourceIndex !== index) {
        const track = tracks[dragSourceIndex];
        if (track) {
          reorderTrack(track.id, index);
        }
      }
      setDragSourceIndex(null);
      setDragOverIndex(null);
    },
    [dragSourceIndex, tracks, reorderTrack]
  );

  const handleDragEnd = useCallback(() => {
    setDragSourceIndex(null);
    setDragOverIndex(null);
  }, []);

  const hasSoloTrack = tracks.some((t) => t.solo);

  return (
    <div className={`rounded-lg border border-neutral-200 bg-white p-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-medium text-neutral-700">Audio Tracks</span>
          {tracks.length > 0 && (
            <span className="text-xs text-neutral-400">({tracks.length})</span>
          )}
        </div>
        <button
          onClick={handleAddTrack}
          disabled={isCreating}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
        >
          {isCreating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          Add Track
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_AUDIO}
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {/* Track list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-4 text-xs text-neutral-400">
          No audio tracks yet. Click "Add Track" to upload audio.
        </div>
      ) : (
        <div className="space-y-1">
          {tracks.map((track, index) => (
            <div
              key={track.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`transition-all ${
                dragOverIndex === index ? 'border-t-2 border-indigo-400' : ''
              } ${dragSourceIndex === index ? 'opacity-50' : ''}`}
            >
              <AudioTrackRow
                track={track}
                index={index}
                isMutedBySolo={hasSoloTrack && !track.solo && !track.muted}
                onUpdate={(changes) => updateTrack(track.id, changes)}
                onDelete={() => deleteTrack(track.id)}
                onDetectBeats={
                  onDetectBeats && track.audioUrl
                    ? () => onDetectBeats(track.id, track.audioUrl!)
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* Playback mode toggle */}
      {tracks.length > 0 && (
        <div className="mt-2 flex items-center gap-1 rounded-lg bg-neutral-100 p-0.5">
          {(['metronome', 'audio', 'both'] as PlaybackMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onPlaybackModeChange(mode)}
              className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors capitalize ${
                playbackMode === mode
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {mode === 'both' ? 'Audio + Click' : mode}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          {error instanceof Error ? error.message : 'Failed to load tracks'}
        </div>
      )}
    </div>
  );
}

export default AudioTrackMixer;
