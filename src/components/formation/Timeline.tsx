/**
 * Timeline Component - Flux Studio
 *
 * Keyframe timeline for formation animations with playback controls,
 * keyframe markers, and scrubbing capability.
 */

import React, { useRef, useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { generateCountMarkers } from '../../utils/drillGeometry';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import type { TimelineProps } from './timelineHelpers';
import { formatTime, formatCount } from './timelineHelpers';
import { KeyframeMarker } from './KeyframeMarker';
import { PlaybackControls } from './PlaybackControls';

// Lazy-load AudioSyncTimeline to avoid wavesurfer bundle impact when no audio
const AudioSyncTimeline = lazy(() => import('./AudioSyncTimeline'));

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
  snapResolution = 'beat',
  onSnapResolutionChange,
  onDrillSettingsChange,
  onKeyframeMove,
}: TimelineProps) {
  const { t } = useTranslation('common');
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
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

  return (
    <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
      {/* Playback Controls */}
      <PlaybackControls
        playbackState={playbackState}
        currentTime={currentTime}
        duration={duration}
        audioTrack={audioTrack}
        audioState={audioState}
        drillSettings={drillSettings}
        isCountMode={isCountMode}
        zoom={zoom}
        onPlay={onPlay}
        onPause={onPause}
        onStop={onStop}
        onSeek={onSeek}
        onSpeedChange={onSpeedChange}
        onToggleLoop={onToggleLoop}
        onKeyframeAdd={onKeyframeAdd}
        onZoomChange={setZoom}
        onVolumeChange={setVolume}
        onDrillSettingsChange={onDrillSettingsChange}
      />

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

        {/* Timeline Bar — AudioSyncTimeline (waveform + beat-snap) when audio present, basic bar otherwise */}
        {audioTrack?.url ? (
          <Suspense fallback={
            <div className="relative h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" style={{ width: `${100 * zoom}%` }} />
          }>
            <AudioSyncTimeline
              audioUrl={audioTrack.url}
              beatMap={null}
              keyframes={keyframes}
              currentTime={currentTime}
              duration={duration}
              zoom={zoom * 50}
              bpm={audioTrack.bpm || drillSettings?.bpm || 120}
              snapResolution={snapResolution}
              selectedKeyframeId={selectedKeyframeId}
              isPlaying={playbackState.isPlaying}
              onSeek={onSeek}
              onKeyframeMove={onKeyframeMove}
              onKeyframeAdd={onKeyframeAdd}
              onKeyframeSelect={onKeyframeSelect}
              onSnapResolutionChange={onSnapResolutionChange}
            />
          </Suspense>
        ) : (
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
        )}
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
