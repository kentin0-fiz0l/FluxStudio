/**
 * AudioUpload Component - FluxStudio Drill Writer
 *
 * Component for uploading audio files to sync with formation animations.
 * Extracts audio duration and handles upload to storage.
 */

import React, { useCallback, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Music,
  X,
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  AlertCircle,
} from 'lucide-react';
import { AudioTrack } from '../../services/formationService';
import { analyzeAudio } from '../../services/audioAnalysis';

interface AudioUploadProps {
  audioTrack?: AudioTrack | null;
  onUpload: (audioTrack: AudioTrack) => Promise<void>;
  onRemove: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function AudioUpload({
  audioTrack,
  onUpload,
  onRemove,
  disabled = false,
  className = '',
}: AudioUploadProps) {
  const { t } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Preview state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Extract audio duration from file
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration * 1000)); // Convert to ms
      };
      audio.onerror = () => {
        reject(new Error('Failed to load audio file'));
      };
      audio.src = URL.createObjectURL(file);
    });
  };

  // Handle file selection
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      setError('Please select an audio file (MP3, WAV, OGG, etc.)');
      return;
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Audio file is too large. Maximum size is 50MB.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Get duration
      const duration = await getAudioDuration(file);

      // Analyze audio for BPM detection
      let bpm: number | undefined;
      let bpmConfidence: number | undefined;
      let waveformData: number[] | undefined;
      try {
        const analysis = await analyzeAudio(file);
        bpm = analysis.bpm;
        bpmConfidence = analysis.confidence;
        waveformData = Array.from(analysis.waveform.slice(0, 500)); // Keep first 500 samples
      } catch (analysisErr) {
        console.warn('Audio analysis failed (BPM detection skipped):', analysisErr);
      }

      // Create a temporary URL for the file
      // In production, this would upload to S3/storage
      const url = URL.createObjectURL(file);
      const audioId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newAudioTrack: AudioTrack = {
        id: audioId,
        url,
        filename: file.name,
        duration,
        bpm,
        bpmConfidence,
        waveformData,
      };

      await onUpload(newAudioTrack);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload audio');
    } finally {
      setIsUploading(false);
    }
  }, [onUpload]);

  // Handle remove
  const handleRemove = useCallback(async () => {
    setIsRemoving(true);
    setError(null);

    try {
      await onRemove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove audio');
    } finally {
      setIsRemoving(false);
    }
  }, [onRemove]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  // Preview controls
  const togglePreview = useCallback(() => {
    if (!audioPreviewRef.current) return;

    if (isPreviewPlaying) {
      audioPreviewRef.current.pause();
    } else {
      audioPreviewRef.current.play();
    }
    setIsPreviewPlaying(!isPreviewPlaying);
  }, [isPreviewPlaying]);

  const toggleMute = useCallback(() => {
    if (!audioPreviewRef.current) return;
    audioPreviewRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Format duration
  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // If audio track exists, show player
  if (audioTrack) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3">
          {/* Audio icon */}
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Music className="w-5 h-5 text-blue-500" />
          </div>

          {/* Audio info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {audioTrack.filename}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDuration(audioTrack.duration)}
            </p>
          </div>

          {/* Preview controls */}
          <button
            onClick={togglePreview}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
            title={isPreviewPlaying ? t('audio.pause', 'Pause') : t('audio.play', 'Play')}
          >
            {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleMute}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
            title={isMuted ? t('audio.unmute', 'Unmute') : t('audio.mute', 'Mute')}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Remove button */}
          <button
            onClick={handleRemove}
            disabled={isRemoving || disabled}
            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-50"
            title={t('audio.remove', 'Remove audio')}
          >
            {isRemoving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Hidden audio element for preview */}
        <audio
          ref={audioPreviewRef}
          src={audioTrack.url}
          onEnded={() => setIsPreviewPlaying(false)}
          className="hidden"
        />

        {error && (
          <div className="mt-2 flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    );
  }

  // No audio - show upload zone
  return (
    <div className={className}>
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
          dragActive
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleChange}
          disabled={disabled || isUploading}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('audio.uploading', 'Processing audio...')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Music className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('audio.dropOrClick', 'Drop audio file here or click to upload')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('audio.supportedFormats', 'MP3, WAV, OGG, AAC (max 50MB)')}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}

export default AudioUpload;
