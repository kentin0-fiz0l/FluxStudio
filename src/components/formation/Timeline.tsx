/**
 * Timeline Component - Flux Studio
 *
 * Keyframe timeline for formation animations with playback controls,
 * keyframe markers, and scrubbing capability.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Minus,
  Repeat,
  Clock,
  Volume2,
  VolumeX,
  Music,
} from 'lucide-react';
import { Keyframe, PlaybackState, AudioTrack } from '../../services/formationService';
import type { DrillSettings } from '../../services/formationTypes';
import { generateCountMarkers, timeToCount } from '../../utils/drillGeometry';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TimelineProps {
  keyframes: Keyframe[];
  duration: number; // Total duration in milliseconds
  currentTime: number;
  playbackState: PlaybackState;
  selectedKeyframeId?: string;
  audioTrack?: AudioTrack | null;
  drillSettings?: DrillSettings;
  timeDisplayMode?: 'time' | 'counts';
  onDrillSettingsChange?: (settings: DrillSettings) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onToggleLoop: () => void;
  onKeyframeSelect: (keyframeId: string) => void;
  onKeyframeAdd: (timestamp: number) => void;
  onKeyframeRemove: (keyframeId: string) => void;
  onKeyframeMove: (keyframeId: string, timestamp: number) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

function formatCount(ms: number, settings: DrillSettings): string {
  const countSettings = { bpm: settings.bpm, countsPerPhrase: settings.countsPerPhrase, startOffset: settings.startOffset };
  const count = timeToCount(ms, countSettings);
  const phrase = Math.ceil(count / settings.countsPerPhrase);
  const beatInPhrase = ((count - 1) % settings.countsPerPhrase) + 1;
  return `Count ${count} (Set ${phrase}, Beat ${beatInPhrase})`;
}

// ============================================================================
// KEYFRAME MARKER COMPONENT
// ============================================================================

function KeyframeMarker({
  keyframe,
  duration,
  isSelected,
  isFirst,
  onSelect,
  onMove,
  onRemove,
}: {
  keyframe: Keyframe;
  duration: number;
  isSelected: boolean;
  isFirst: boolean;
  onSelect: () => void;
  onMove: (timestamp: number) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation('common');
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; time: number }>({ x: 0, time: 0 });
  const markerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isFirst) return; // Can't move first keyframe
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        time: keyframe.timestamp,
      };
      onSelect();
    },
    [isFirst, keyframe.timestamp, onSelect]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!markerRef.current?.parentElement) return;

      const parent = markerRef.current.parentElement;
      const rect = parent.getBoundingClientRect();
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaTime = (deltaX / rect.width) * duration;
      const newTime = Math.max(0, Math.min(duration, dragStartRef.current.time + deltaTime));

      onMove(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration, onMove]);

  const position = duration > 0 ? (keyframe.timestamp / duration) * 100 : 0;

  return (
    <div
      ref={markerRef}
      role="button"
      tabIndex={0}
      className={`absolute top-0 h-full flex flex-col items-center cursor-pointer group ${
        isDragging ? 'z-50' : 'z-10'
      }`}
      style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      onMouseDown={handleMouseDown}
    >
      {/* Keyframe Diamond */}
      <div
        className={`w-3 h-3 rotate-45 ${
          isSelected
            ? 'bg-blue-500 ring-2 ring-blue-300'
            : isFirst
            ? 'bg-green-500'
            : 'bg-gray-600 group-hover:bg-gray-500'
        }`}
      />

      {/* Vertical Line */}
      <div
        className={`w-px flex-1 ${
          isSelected ? 'bg-blue-500' : 'bg-gray-400 group-hover:bg-gray-500'
        }`}
      />

      {/* Timestamp Label */}
      <div
        className={`absolute -bottom-5 text-xs whitespace-nowrap ${
          isSelected ? 'text-blue-500 font-medium' : 'text-gray-500'
        }`}
      >
        {formatTime(keyframe.timestamp)}
      </div>

      {/* Delete button (on hover, not for first keyframe) */}
      {!isFirst && isSelected && (
        <button
          className="absolute -top-6 p-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={t('formation.removeKeyframe', 'Remove keyframe')}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Timeline({
  keyframes,
  duration,
  currentTime,
  playbackState,
  selectedKeyframeId,
  audioTrack,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onSpeedChange,
  onToggleLoop,
  onKeyframeSelect,
  onKeyframeAdd,
  onKeyframeRemove,
  drillSettings,
  timeDisplayMode = 'time',
  onDrillSettingsChange,
  onKeyframeMove,
}: TimelineProps) {
  const { t } = useTranslation('common');
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [showBpmInput, setShowBpmInput] = useState(false);
  const isCountMode = timeDisplayMode === 'counts' && !!drillSettings;
  const countMarkers = React.useMemo(() => {
    if (!isCountMode || !drillSettings) return [];
    return generateCountMarkers(duration, { bpm: drillSettings.bpm, countsPerPhrase: drillSettings.countsPerPhrase, startOffset: drillSettings.startOffset });
  }, [isCountMode, drillSettings, duration]);

  // Audio playback integration
  const {
    state: audioState,
    setVolume,
    syncWithFormation,
  } = useAudioPlayback({
    audioTrack,
    autoSync: true,
  });

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Sync audio with formation playback
  useEffect(() => {
    if (audioTrack && audioState.isLoaded) {
      syncWithFormation(currentTime, playbackState.isPlaying, playbackState.speed);
    }
  }, [currentTime, playbackState.isPlaying, playbackState.speed, audioTrack, audioState.isLoaded, syncWithFormation]);

  // Handle click on timeline to seek
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickPercent = clickX / rect.width;
      const newTime = clickPercent * duration;

      onSeek(Math.max(0, Math.min(duration, newTime)));
    },
    [duration, onSeek]
  );

  // Handle drag on timeline for scrubbing
  const handleTimelineMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      handleTimelineClick(e);
    },
    [handleTimelineClick]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickPercent = Math.max(0, Math.min(1, clickX / rect.width));
      const newTime = clickPercent * duration;

      onSeek(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration, onSeek]);

  // Calculate playhead position
  const playheadPosition = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Speed options
  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
      {/* Playback Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* Stop/Reset */}
          <button
            onClick={onStop}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            aria-label={t('formation.stop', 'Stop')}
          >
            <SkipBack className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={playbackState.isPlaying ? onPause : onPlay}
            className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
            aria-label={playbackState.isPlaying ? t('formation.pause', 'Pause') : t('formation.play', 'Play')}
          >
            {playbackState.isPlaying ? (
              <Pause className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Play className="w-5 h-5" aria-hidden="true" />
            )}
          </button>

          {/* Skip to End */}
          <button
            onClick={() => onSeek(duration)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            aria-label={t('formation.skipToEnd', 'Skip to end')}
          >
            <SkipForward className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Loop Toggle */}
          <button
            onClick={onToggleLoop}
            className={`p-2 rounded-lg ${
              playbackState.loop
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
            aria-label={t('formation.loop', 'Loop')}
            aria-pressed={playbackState.loop}
          >
            <Repeat className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Audio indicator and volume control */}
          {audioTrack && (
            <div className="relative flex items-center gap-1 ml-2">
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mr-1" />
              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                className={`p-2 rounded-lg ${
                  audioState.isLoaded
                    ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    : 'text-gray-400'
                }`}
                aria-label={t('formation.audioVolume', 'Audio Volume')}
              >
                {audioState.volume === 0 ? (
                  <VolumeX className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-5 h-5" aria-hidden="true" />
                )}
              </button>

              {/* Volume slider popup */}
              {showVolumeSlider && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="flex items-center gap-3">
                    <Music className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audioState.volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs text-gray-500 min-w-[2rem]">
                      {Math.round(audioState.volume * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 truncate max-w-[150px]">
                    {audioTrack.filename}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Time Display */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
          <span className="font-mono text-gray-700 dark:text-gray-300">
            {isCountMode && drillSettings
              ? formatCount(currentTime, drillSettings)
              : `${formatTime(currentTime)} / ${formatTime(duration)}`}
          </span>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('formation.speed', 'Speed')}:
          </span>
          <select
            value={playbackState.speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
          >
            {speedOptions.map((speed) => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>

          {/* Detected BPM from audio */}
          {audioTrack?.bpm && audioTrack.bpm > 0 && (
            <div className="flex items-center gap-1 ml-1">
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mr-1" />
              <span
                className="px-2 py-0.5 text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded"
                title={`Detected BPM: ${audioTrack.bpm} (confidence: ${Math.round((audioTrack.bpmConfidence ?? 0) * 100)}%)`}
              >
                {audioTrack.bpm} BPM
              </span>
            </div>
          )}

          {/* BPM Input (visible in count mode) */}
          {isCountMode && drillSettings && (
            <div className="relative flex items-center gap-1 ml-1">
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mr-1" />
              <button
                onClick={() => setShowBpmInput(!showBpmInput)}
                className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
              >
                {drillSettings.bpm} BPM
              </button>
              {showBpmInput && onDrillSettingsChange && (
                <div className="absolute bottom-full left-0 mb-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 min-w-[180px]">
                  <label className="block text-xs text-gray-500 mb-1">BPM</label>
                  <input
                    type="number"
                    min={40}
                    max={300}
                    value={drillSettings.bpm}
                    onChange={(e) => onDrillSettingsChange({ ...drillSettings, bpm: Math.max(40, Math.min(300, Number(e.target.value))) })}
                    className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                  <label className="block text-xs text-gray-500 mt-2 mb-1">Counts per Phrase</label>
                  <select
                    value={drillSettings.countsPerPhrase}
                    onChange={(e) => onDrillSettingsChange({ ...drillSettings, countsPerPhrase: Number(e.target.value) })}
                    className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  >
                    {[4, 6, 8, 12, 16].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            aria-label={t('formation.zoomOut', 'Zoom out')}
          >
            <Minus className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[40px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(4, zoom + 0.25))}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            aria-label={t('formation.zoomIn', 'Zoom in')}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Add Keyframe */}
        <button
          onClick={() => onKeyframeAdd(currentTime)}
          className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm"
          aria-label={t('formation.addKeyframe', 'Add keyframe at current time')}
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          {t('formation.keyframe', 'Keyframe')}
        </button>
      </div>

      {/* Timeline Track */}
      <div className="relative">
        {/* Time / Count Ruler */}
        <div className="h-6 flex items-end border-b border-gray-300 dark:border-gray-600 mb-2 relative">
          {isCountMode && countMarkers.length > 0
            ? countMarkers.map((marker) => {
                const position = duration > 0 ? (marker.timeMs / duration) * 100 : 0;
                return (
                  <div
                    key={marker.count}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                  >
                    <div
                      className={`w-px ${marker.isPhraseBoundary ? 'h-4 bg-blue-500' : 'h-2 bg-gray-400'}`}
                    />
                    {marker.isPhraseBoundary && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        S{marker.phrase}
                      </span>
                    )}
                  </div>
                );
              })
            : Array.from({ length: Math.ceil(duration / 1000) + 1 }).map((_, i) => {
                const position = duration > 0 ? ((i * 1000) / duration) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="absolute text-xs text-gray-500"
                    style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                  >
                    {i}s
                  </div>
                );
              })}
        </div>

        {/* Timeline Bar */}
        <div
          ref={timelineRef}
          className="relative h-16 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer overflow-hidden"
          style={{ width: `${100 * zoom}%` }}
          onMouseDown={handleTimelineMouseDown}
        >
          {/* Progress Bar */}
          <div
            className="absolute top-0 bottom-0 bg-blue-100 dark:bg-blue-900/50"
            style={{ width: `${playheadPosition}%` }}
          />

          {/* Audio beat markers (from BPM detection) */}
          {audioTrack?.bpm && audioTrack.bpm > 0 && (() => {
            const beatInterval = 60000 / audioTrack.bpm;
            const markers: React.ReactNode[] = [];
            let beat = 0;
            for (let t = 0; t < duration; t += beatInterval) {
              beat++;
              const pos = duration > 0 ? (t / duration) * 100 : 0;
              const isDownbeat = beat % 4 === 1;
              markers.push(
                <div
                  key={`beat-${beat}`}
                  className={`absolute top-0 ${isDownbeat ? 'h-full bg-indigo-400/20' : 'h-1/3 bg-indigo-400/10'}`}
                  style={{ left: `${pos}%`, width: '1px' }}
                />
              );
            }
            return markers;
          })()}

          {/* Keyframe Markers */}
          {keyframes.map((keyframe, index) => (
            <KeyframeMarker
              key={keyframe.id}
              keyframe={keyframe}
              duration={duration}
              isSelected={selectedKeyframeId === keyframe.id}
              isFirst={index === 0}
              onSelect={() => onKeyframeSelect(keyframe.id)}
              onMove={(timestamp) => onKeyframeMove(keyframe.id, timestamp)}
              onRemove={() => onKeyframeRemove(keyframe.id)}
            />
          ))}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50"
            style={{ left: `${playheadPosition}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Keyframe List */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto py-2">
        <span className="text-sm text-gray-600 dark:text-gray-400 shrink-0">
          {t('formation.keyframes', 'Keyframes')}:
        </span>
        {keyframes.map((keyframe, index) => (
          <button
            key={keyframe.id}
            onClick={() => {
              onKeyframeSelect(keyframe.id);
              onSeek(keyframe.timestamp);
            }}
            className={`shrink-0 px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedKeyframeId === keyframe.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {index + 1}: {isCountMode && drillSettings ? formatCount(keyframe.timestamp, drillSettings) : formatTime(keyframe.timestamp)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Timeline;
