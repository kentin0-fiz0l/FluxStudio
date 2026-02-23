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
    <div className={`rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Music className="h-4 w-4 text-indigo-500" aria-hidden="true" />
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Audio Track</span>
      </div>

      {!hasAudio ? (
        /* Upload area */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
          className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors cursor-pointer ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
              : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'
          }`}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload audio file"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        >
          {audioLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" aria-hidden="true" />
          ) : (
            <Upload className="h-6 w-6 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
          )}
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {audioLoading ? 'Uploading...' : 'Drop audio file or click to browse'}
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">MP3, WAV, OGG, FLAC, M4A</span>
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
          <div className="flex items-center justify-between rounded bg-neutral-50 dark:bg-neutral-800 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Music className="h-4 w-4 text-indigo-500 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate">
                  Audio attached
                </div>
                {song.audioDurationSeconds && (
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatDuration(song.audioDurationSeconds)}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onRemoveAudio}
              className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-red-500 transition-colors"
              aria-label="Remove audio"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Beat detection */}
          <div className="flex items-center gap-2">
            {hasBeatMap ? (
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                <span className="text-neutral-600 dark:text-neutral-300">
                  Detected: <strong>{song.detectedBpm} BPM</strong>
                  {song.beatMap && (
                    <span className="text-neutral-400 dark:text-neutral-500 ml-1">
                      ({song.beatMap.beats.length} beats, {Math.round(song.beatMap.confidence * 100)}% confidence)
                    </span>
                  )}
                </span>
                {song.detectedBpm && Math.abs(song.detectedBpm - song.bpmDefault) > 2 && (
                  <button
                    onClick={onAlignBpm}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline"
                  >
                    Align to {song.detectedBpm}
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onDetectBeats}
                disabled={beatDetectionLoading}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded transition-colors disabled:opacity-50"
              >
                {beatDetectionLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Zap className="h-3 w-3" aria-hidden="true" />
                )}
                Detect Beats
              </button>
            )}
          </div>

          {/* Playback mode toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5" role="radiogroup" aria-label="Playback mode">
            {(['metronome', 'audio', 'both'] as PlaybackMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => onPlaybackModeChange(mode)}
                role="radio"
                aria-checked={playbackMode === mode}
                className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors capitalize ${
                  playbackMode === mode
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                {mode === 'both' ? 'Audio + Click' : mode}
              </button>
            ))}
          </div>
        </div>
      )}

      {audioError && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600 dark:text-red-400" role="alert" aria-live="polite">
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
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
