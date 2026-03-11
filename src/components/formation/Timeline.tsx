/**
 * Timeline Component - Flux Studio
 *
 * Keyframe timeline for formation animations with playback controls,
 * keyframe markers, and scrubbing capability.
 */

import React, { useRef, useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { generateCountMarkers } from '../../utils/drillGeometry';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import { countToTimeMs } from '../../services/tempoMap';
import type { TimelineProps } from './timelineHelpers';
import { formatTime, formatCount } from './timelineHelpers';
import { KeyframeMarker } from './KeyframeMarker';
import { PlaybackControls } from './PlaybackControls';
import { SetNavigator } from './SetNavigator';
import { AudioSyncTimelineErrorBoundary } from '../error/featureBoundaries';

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
  sets,
  currentSetId,
  onSetSelect,
  onSetUpdate,
  onSetAdd,
  onSetRemove,
  sections,
  chords,
  tempoMap,
  beatMap,
  onSetsReorder,
  ghostKeyframeIds,
  onGhostKeyframeToggle,
  annotations,
}: TimelineProps) {
  const { t } = useTranslation('common');
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const isCountMode = timeDisplayMode === 'counts' && !!drillSettings;
  const isSetsMode = timeDisplayMode === 'sets' && !!sets && sets.length > 0;
  const countMarkers = React.useMemo(() => {
    if (!isCountMode || !drillSettings) return [];
    return generateCountMarkers(duration, { bpm: drillSettings.bpm, countsPerPhrase: drillSettings.countsPerPhrase, startOffset: drillSettings.startOffset });
  }, [isCountMode, drillSettings, duration]);

  // Compute set boundary positions on the timeline (by matching sets to their keyframes)
  const setBoundaries = useMemo(() => {
    if (!isSetsMode || !sets) return [];
    const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);
    return sortedSets.map((set) => {
      const keyframe = keyframes.find((kf) => kf.id === set.keyframeId);
      const timeMs = keyframe ? keyframe.timestamp : 0;
      const position = duration > 0 ? (timeMs / duration) * 100 : 0;
      return { set, position, timeMs };
    });
  }, [isSetsMode, sets, keyframes, duration]);

  // Compute tempo change markers from the tempo map
  const tempoChangeMarkers = useMemo(() => {
    if (!tempoMap || tempoMap.segments.length <= 1) return [];
    const markers: { position: number; fromBpm: number; toBpm: number; timeMs: number }[] = [];

    for (let i = 1; i < tempoMap.segments.length; i++) {
      const prevSeg = tempoMap.segments[i - 1];
      const seg = tempoMap.segments[i];
      const fromBpm = Math.round(prevSeg.tempoEnd);
      const toBpm = Math.round(seg.tempoStart);
      // Only show marker if tempo actually changes
      if (fromBpm === toBpm) continue;
      const timeMs = countToTimeMs(seg.startCount, tempoMap);
      const position = duration > 0 ? (timeMs / duration) * 100 : 0;
      markers.push({ position, fromBpm, toBpm, timeMs });
    }
    return markers;
  }, [tempoMap, duration]);

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
      {/* Set Navigator (shown above timeline track in sets mode) */}
      {isSetsMode && sets && onSetSelect && onSetUpdate && onSetAdd && onSetRemove && onSetsReorder && (
        <SetNavigator
          sets={sets}
          currentSetId={currentSetId ?? null}
          onSetSelect={onSetSelect}
          onSetUpdate={onSetUpdate}
          onSetAdd={onSetAdd}
          onSetRemove={onSetRemove}
          onSetsReorder={onSetsReorder}
        />
      )}

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
        sets={sets}
        currentSetId={currentSetId}
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
          <AudioSyncTimelineErrorBoundary>
          <Suspense fallback={
            <div className="relative h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" style={{ width: `${100 * zoom}%` }} />
          }>
            <AudioSyncTimeline
              audioUrl={audioTrack.url}
              beatMap={beatMap ?? null}
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
              sections={sections}
              chords={chords}
              tempoMap={tempoMap}
            />
          </Suspense>
          </AudioSyncTimelineErrorBoundary>
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

            {/* Lightweight section indicator strip (non-audio mode) */}
            {sections && sections.length > 0 && tempoMap && tempoMap.segments.length > 0 && (() => {
              const SECTION_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#f97316','#6366f1'];
              const sorted = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
              let currentCount = 1;
              return sorted.map((section, i) => {
                const beatsPerBar = parseInt(section.timeSignature.split('/')[0]) || 4;
                const sectionBeats = section.bars * beatsPerBar;
                if (sectionBeats <= 0) { return null; }
                const startMs = countToTimeMs(currentCount, tempoMap);
                const endMs = countToTimeMs(currentCount + sectionBeats, tempoMap);
                currentCount += sectionBeats;
                const leftPct = duration > 0 ? (startMs / duration) * 100 : 0;
                const widthPct = duration > 0 ? ((endMs - startMs) / duration) * 100 : 0;
                const color = SECTION_COLORS[i % SECTION_COLORS.length];
                return (
                  <div key={`section-strip-${i}`} className="absolute top-0 pointer-events-none" style={{ left: `${leftPct}%`, width: `${widthPct}%`, height: 14 }}>
                    <div className="w-full h-full" style={{ backgroundColor: color, opacity: 0.12 }} />
                    <span className="absolute left-1 top-0.5 text-[8px] font-semibold whitespace-nowrap" style={{ color, opacity: 0.7 }}>{section.name}</span>
                  </div>
                );
              });
            })()}

            {/* Tempo Change Markers */}
            {tempoChangeMarkers.map((marker, i) => (
              <div
                key={`tempo-change-${i}`}
                className="absolute top-0 bottom-0 z-10 pointer-events-auto group"
                style={{ left: `${marker.position}%` }}
              >
                {/* Dashed vertical line */}
                <div className="w-px h-full border-l border-dashed border-amber-500 dark:border-amber-400 opacity-60" />
                {/* Tempo dot indicator */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-amber-400 border border-white dark:border-gray-800 shadow-sm" />
                {/* Tooltip on hover */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center whitespace-nowrap px-2 py-1 rounded bg-gray-900 dark:bg-gray-700 text-white text-[10px] font-medium shadow-lg z-50">
                  {marker.fromBpm} BPM &#8594; {marker.toBpm} BPM
                </div>
              </div>
            ))}

            {/* Set Boundary Markers (vertical lines on the timeline bar in sets mode) */}
            {isSetsMode && setBoundaries.map(({ set, position }) => (
              <div
                key={`set-boundary-${set.id}`}
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: `${position}%` }}
              >
                <div className="w-px h-full bg-indigo-400 dark:bg-indigo-500 opacity-70" />
                <span className="absolute -top-0.5 left-1 text-[9px] font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                  {set.label || set.name}
                </span>
              </div>
            ))}

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

            {/* Annotation indicators on keyframes */}
            {annotations && annotations.length > 0 && keyframes.map((keyframe, index) => {
              const count = annotations.filter((a) => a.keyframeIndex === index).length;
              if (count === 0) return null;
              const position = duration > 0 ? (keyframe.timestamp / duration) * 100 : 0;
              const firstText = annotations.find((a) => a.keyframeIndex === index)?.text ?? '';
              return (
                <div
                  key={`annot-${keyframe.id}`}
                  className="absolute z-30 pointer-events-none"
                  style={{ left: `${position}%`, top: -2, transform: 'translateX(-50%)' }}
                  title={count === 1 ? firstText : `${count} annotations`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white dark:border-gray-700" />
                </div>
              );
            })}

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
        {keyframes.map((keyframe, index) => {
          const isGhostActive = ghostKeyframeIds?.includes(keyframe.id) ?? false;
          const ghostCount = ghostKeyframeIds?.length ?? 0;
          const isSelected = selectedKeyframeId === keyframe.id;
          const annotationCount = annotations?.filter((a) => a.keyframeIndex === index).length ?? 0;
          const firstAnnotation = annotations?.find((a) => a.keyframeIndex === index);

          return (
            <div key={keyframe.id} className="shrink-0 flex items-center gap-0.5 relative">
              <button
                onClick={() => {
                  onKeyframeSelect(keyframe.id);
                  onSeek(keyframe.timestamp);
                }}
                className={`px-3 py-1 rounded-l text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {index + 1}: {isCountMode && drillSettings ? formatCount(keyframe.timestamp, drillSettings) : formatTime(keyframe.timestamp)}
              </button>
              {/* Annotation count badge */}
              {annotationCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-bold px-1 z-10"
                  title={annotationCount === 1 ? firstAnnotation?.text : `${annotationCount} annotations`}
                >
                  {annotationCount}
                </span>
              )}
              {onGhostKeyframeToggle && (
                <button
                  onClick={() => onGhostKeyframeToggle(keyframe.id)}
                  disabled={!isGhostActive && ghostCount >= 3}
                  title={isGhostActive ? 'Hide ghost' : ghostCount >= 3 ? 'Max 3 ghosts' : 'Show as ghost'}
                  className={`px-1.5 py-1 rounded-r text-xs transition-colors ${
                    isGhostActive
                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/60'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {isGhostActive ? (
                      <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>
                    ) : (
                      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
                    )}
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Timeline;
