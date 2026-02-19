/**
 * AudioTrackPanel - Audio file management for MetMap songs.
 *
 * Allows uploading, viewing info, removing audio, and shows beat detection status.
 * Renders as a collapsible panel in the song editor.
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Music, Loader2, Zap, AlertCircle } from 'lucide-react';
import type { Song, PlaybackMode } from '../../contexts/metmap/types';

interface AudioTrackPanelProps {
  song: Song;
  playbackMode: PlaybackMode;
  beatDetectionLoading: boolean;
  audioLoading: boolean;
  audioError: string | null;
  onUploadAudio: (file: File) => void;
  onRemoveAudio: () => void;
  onDetectBeats: () => void;
  onAlignBpm: () => void;
  onPlaybackModeChange: (mode: PlaybackMode) => void;
  className?: string;
}

const ACCEPTED_AUDIO = '.mp3,.wav,.ogg,.flac,.m4a,.aac';

export function AudioTrackPanel({
  song,
  playbackMode,
  beatDetectionLoading,
  audioLoading,
  audioError,
  onUploadAudio,
  onRemoveAudio,
  onDetectBeats,
  onAlignBpm,
  onPlaybackModeChange,
  className = '',
}: AudioTrackPanelProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadAudio(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  }, [onUploadAudio]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      onUploadAudio(file);
    }
  }, [onUploadAudio]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const hasAudio = !!song.audioFileUrl;
  const hasBeatMap = !!song.beatMap;

  return (
    <div className={`rounded-lg border border-neutral-200 bg-white p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Music className="h-4 w-4 text-indigo-500" />
        <span className="text-sm font-medium text-neutral-700">Audio Track</span>
      </div>

      {!hasAudio ? (
        /* Upload area */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
          className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors cursor-pointer ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-neutral-300 hover:border-neutral-400'
          }`}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload audio file"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        >
          {audioLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          ) : (
            <Upload className="h-6 w-6 text-neutral-400" />
          )}
          <span className="text-sm text-neutral-500">
            {audioLoading ? 'Uploading...' : 'Drop audio file or click to browse'}
          </span>
          <span className="text-xs text-neutral-400">MP3, WAV, OGG, FLAC, M4A</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_AUDIO}
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      ) : (
        /* Audio info + controls */
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded bg-neutral-50 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Music className="h-4 w-4 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-neutral-700 truncate">
                  Audio attached
                </div>
                {song.audioDurationSeconds && (
                  <div className="text-xs text-neutral-500">
                    {formatDuration(song.audioDurationSeconds)}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onRemoveAudio}
              className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
              aria-label="Remove audio"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Beat detection */}
          <div className="flex items-center gap-2">
            {hasBeatMap ? (
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-neutral-600">
                  Detected: <strong>{song.detectedBpm} BPM</strong>
                  {song.beatMap && (
                    <span className="text-neutral-400 ml-1">
                      ({song.beatMap.beats.length} beats, {Math.round(song.beatMap.confidence * 100)}% confidence)
                    </span>
                  )}
                </span>
                {song.detectedBpm && Math.abs(song.detectedBpm - song.bpmDefault) > 2 && (
                  <button
                    onClick={onAlignBpm}
                    className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                  >
                    Align to {song.detectedBpm}
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onDetectBeats}
                disabled={beatDetectionLoading}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 rounded transition-colors disabled:opacity-50"
              >
                {beatDetectionLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Zap className="h-3 w-3" />
                )}
                Detect Beats
              </button>
            )}
          </div>

          {/* Playback mode toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-0.5">
            {(['metronome', 'audio', 'both'] as PlaybackMode[]).map(mode => (
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
        </div>
      )}

      {audioError && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          {audioError}
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default AudioTrackPanel;
