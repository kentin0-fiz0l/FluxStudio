/**
 * EmbedFormation - Lightweight embeddable formation viewer
 *
 * Accessible at /embed/:formationId — designed for iframe embedding.
 * No auth, no header, minimal UI: just the canvas with playback controls.
 *
 * Features:
 * - Keyframe interpolation with play/pause and progress bar
 * - Audio sync (HTMLAudioElement tied to animation timeline)
 * - Volume control with mute toggle
 * - Set navigation (previous/next) when drill sets are available
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Play, Pause, RotateCcw, RefreshCw, Volume2, VolumeX, ChevronLeft, ChevronRight, Maximize } from 'lucide-react';
import * as formationsApi from '../services/formationsApi';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FEATURE_FLAGS } from '@/constants/featureFlags';
import { Formation3DViewErrorBoundary } from '@/components/error/ErrorBoundary';

const Formation3DViewLazy = React.lazy(
  () => import('../components/formation/Formation3DView').then((m) => ({ default: m.Formation3DView }))
);

interface EmbedData {
  id: string;
  name: string;
  performers: Array<{ id: string; name: string; label: string; color: string }>;
  keyframes: Array<{
    id: string;
    timestamp: number;
    positions: Record<string, { x: number; y: number; rotation?: number }>;
  }>;
  audioTrack?: { url: string; filename: string; duration: number };
  sets?: Array<{ id: string; name: string; counts: number; sortOrder: number }>;
}

export default function EmbedFormation() {
  const { formationId } = useParams<{ formationId: string }>();
  const [data, setData] = useState<EmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number; rotation?: number }>>(new Map());

  // Audio state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Set navigation state
  const [currentSetIndex, setCurrentSetIndex] = useState(0);

  // Fullscreen support
  const presentationModeEnabled = useFeatureFlag(FEATURE_FLAGS.PRESENTATION_MODE);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const loadFormation = useCallback(async () => {
    if (!formationId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await formationsApi.fetchSharedFormation(formationId);
      setData({
        id: res.id,
        name: res.name,
        performers: res.performers || [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        keyframes: (res.keyframes || []).map((kf: any) => ({
          id: String(kf.id),
          timestamp: Number(kf.timestamp),
          positions: (kf.positions instanceof Map
            ? Object.fromEntries(kf.positions)
            : kf.positions || {}) as Record<string, { x: number; y: number; rotation?: number }>,
        })),
        audioTrack: res.audioTrack ? {
          url: res.audioTrack.url,
          filename: res.audioTrack.filename,
          duration: res.audioTrack.duration,
        } : undefined,
        sets: res.sets?.map((s) => ({
          id: s.id,
          name: s.name,
          counts: s.counts,
          sortOrder: s.sortOrder,
        })),
      });
      // Set initial positions from first keyframe
      if (res.keyframes?.[0]?.positions) {
        const map = new Map<string, { x: number; y: number; rotation?: number }>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = res.keyframes[0].positions as any;
        const entries = raw instanceof Map ? [...raw.entries()] : Object.entries(raw);
        entries.forEach(([id, pos]: [string, unknown]) => {
          map.set(id, pos as { x: number; y: number; rotation?: number });
        });
        setPositions(map);
      }
    } catch {
      setError('Formation not available');
    } finally {
      setLoading(false);
    }
  }, [formationId]);

  useEffect(() => {
    loadFormation();
  }, [loadFormation]);

  // Create audio element when audioTrack is available
  useEffect(() => {
    if (!data?.audioTrack) return;

    const audio = new Audio(data.audioTrack.url);
    audio.preload = 'auto';
    audio.volume = isMuted ? 0 : volume;
    // Store ref manually since we're creating via constructor
    (audioRef as React.MutableRefObject<HTMLAudioElement | null>).current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      (audioRef as React.MutableRefObject<HTMLAudioElement | null>).current = null;
    };
    // Only re-create when audio URL changes, not on volume/mute changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.audioTrack?.url]);

  // Sync volume/mute to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Interpolate positions between keyframes
  const getInterpolatedPositions = useCallback((time: number): Map<string, { x: number; y: number; rotation?: number }> => {
    if (!data || data.keyframes.length === 0) return new Map();

    let prevKf = data.keyframes[0];
    let nextKf = data.keyframes[0];
    for (const kf of data.keyframes) {
      if (kf.timestamp <= time) prevKf = kf;
      if (kf.timestamp >= time) { nextKf = kf; break; }
    }

    if (prevKf.id === nextKf.id) {
      const map = new Map<string, { x: number; y: number; rotation?: number }>();
      Object.entries(prevKf.positions).forEach(([id, pos]) => map.set(id, pos));
      return map;
    }

    const t = (time - prevKf.timestamp) / (nextKf.timestamp - prevKf.timestamp);
    const map = new Map<string, { x: number; y: number; rotation?: number }>();
    const allIds = new Set([...Object.keys(prevKf.positions), ...Object.keys(nextKf.positions)]);

    for (const id of allIds) {
      const p = prevKf.positions[id];
      const n = nextKf.positions[id];
      if (p && n) {
        map.set(id, {
          x: p.x + (n.x - p.x) * t,
          y: p.y + (n.y - p.y) * t,
          rotation: (p.rotation ?? 0) + ((n.rotation ?? 0) - (p.rotation ?? 0)) * t,
        });
      } else if (p) {
        map.set(id, p);
      } else if (n) {
        map.set(id, n);
      }
    }
    return map;
  }, [data]);

  // Compute effective duration: max of last keyframe timestamp and audio duration
  const getEffectiveDuration = useCallback((): number => {
    if (!data || data.keyframes.length < 2) return 0;
    const lastKfTime = data.keyframes[data.keyframes.length - 1].timestamp;
    if (data.audioTrack && data.audioTrack.duration > lastKfTime) {
      return data.audioTrack.duration;
    }
    return lastKfTime;
  }, [data]);

  // Seek helper — updates time, positions, and audio
  const seekTo = useCallback((t: number) => {
    setCurrentTime(t);
    setPositions(getInterpolatedPositions(t));
    if (audioRef.current) {
      // Audio currentTime is in seconds; our timeline is in ms
      audioRef.current.currentTime = t / 1000;
    }
  }, [getInterpolatedPositions]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || !data || data.keyframes.length < 2) return;
    const duration = getEffectiveDuration();
    const startWall = performance.now();
    const startTime = currentTime;
    let raf: number;

    // Start audio playback
    if (audioRef.current) {
      audioRef.current.currentTime = startTime / 1000;
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked — animation still runs
      });
    }

    const tick = () => {
      const elapsed = performance.now() - startWall;
      const t = startTime + elapsed;
      if (t >= duration) {
        seekTo(0);
        setIsPlaying(false);
        return;
      }
      setCurrentTime(t);
      setPositions(getInterpolatedPositions(t));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Determine which set is currently active based on currentTime
  useEffect(() => {
    if (!data?.sets || !data.keyframes.length) return;
    const sortedSets = [...data.sets].sort((a, b) => a.sortOrder - b.sortOrder);
    let idx = 0;
    for (let i = 0; i < sortedSets.length && i < data.keyframes.length; i++) {
      if (data.keyframes[i].timestamp <= currentTime) {
        idx = i;
      }
    }
    setCurrentSetIndex(idx);
  }, [currentTime, data]);

  // Set navigation
  const goToPreviousSet = useCallback(() => {
    if (!data?.sets || !data.keyframes.length) return;
    const prevIdx = Math.max(0, currentSetIndex - 1);
    if (prevIdx < data.keyframes.length) {
      const targetTime = data.keyframes[prevIdx].timestamp;
      seekTo(targetTime);
      setCurrentSetIndex(prevIdx);
    }
  }, [data, currentSetIndex, seekTo]);

  const goToNextSet = useCallback(() => {
    if (!data?.sets || !data.keyframes.length) return;
    const nextIdx = Math.min(data.sets.length - 1, currentSetIndex + 1);
    if (nextIdx < data.keyframes.length) {
      const targetTime = data.keyframes[nextIdx].timestamp;
      seekTo(targetTime);
      setCurrentSetIndex(nextIdx);
    }
  }, [data, currentSetIndex, seekTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" aria-hidden="true" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-gray-400 text-sm gap-3">
        <span>{error || 'Not found'}</span>
        <button
          onClick={loadFormation}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/60 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  const duration = getEffectiveDuration();
  const hasSets = data.sets && data.sets.length > 1;
  const sortedSets = hasSets ? [...data.sets!].sort((a, b) => a.sortOrder - b.sortOrder) : [];

  return (
    <div ref={containerRef} className="h-screen flex flex-col bg-gray-900 overflow-hidden">
      {/* 3D View */}
      <div className="flex-1 relative">
        <Formation3DViewErrorBoundary>
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" aria-hidden="true" />
              </div>
            }
          >
            <Formation3DViewLazy
              positions={positions}
              performers={data.performers}
              sceneObjects={[]}
              selectedObjectId={null}
              activeTool="select"
              showGrid={true}
              showLabels={true}
              showShadows={false}
              onSelectObject={() => {}}
              onUpdateObjectPosition={() => {}}
            />
          </React.Suspense>
        </Formation3DViewErrorBoundary>
      </div>

      {/* Minimal transport bar */}
      {duration > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-t border-gray-700">
          {/* Set navigation: previous */}
          {hasSets && (
            <button
              onClick={goToPreviousSet}
              disabled={currentSetIndex <= 0}
              className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
              title={currentSetIndex > 0 ? `Previous: ${sortedSets[currentSetIndex - 1]?.name}` : 'At first set'}
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}

          {/* Play/Pause */}
          <button
            onClick={() => {
              if (isPlaying) {
                setIsPlaying(false);
              } else {
                if (currentTime >= duration) seekTo(0);
                setIsPlaying(true);
              }
            }}
            className="p-1.5 text-white hover:text-indigo-400 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4" aria-hidden="true" />}
          </button>

          {/* Reset */}
          <button
            onClick={() => { setIsPlaying(false); seekTo(0); }}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          {/* Set navigation: next */}
          {hasSets && (
            <button
              onClick={goToNextSet}
              disabled={currentSetIndex >= sortedSets.length - 1}
              className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
              title={currentSetIndex < sortedSets.length - 1 ? `Next: ${sortedSets[currentSetIndex + 1]?.name}` : 'At last set'}
            >
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}

          {/* Current set indicator */}
          {hasSets && (
            <span className="text-[10px] text-gray-500 whitespace-nowrap min-w-0 truncate max-w-[60px]">
              {sortedSets[currentSetIndex]?.name}
            </span>
          )}

          {/* Progress bar */}
          <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden cursor-pointer"
            role="slider"
            tabIndex={0}
            aria-label="Playback progress"
            aria-valuenow={Math.round(currentTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const t = ((e.clientX - rect.left) / rect.width) * duration;
              seekTo(t);
            }}
            onKeyDown={(e) => {
              const step = duration / 20;
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); const t = Math.min(duration, currentTime + step); seekTo(t); }
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); const t = Math.max(0, currentTime - step); seekTo(t); }
              else if (e.key === 'Home') { e.preventDefault(); seekTo(0); }
              else if (e.key === 'End') { e.preventDefault(); seekTo(duration); }
            }}
          >
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(currentTime / duration) * 100}%` }} />
          </div>

          {/* Volume control */}
          {data.audioTrack && (
            <div className="flex items-center gap-1 group">
              <button
                onClick={() => setIsMuted((m) => !m)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  if (v > 0 && isMuted) setIsMuted(false);
                  if (v === 0) setIsMuted(true);
                }}
                className="w-0 group-hover:w-14 transition-all duration-200 h-1 accent-indigo-500 cursor-pointer opacity-0 group-hover:opacity-100"
                aria-label="Volume"
              />
            </div>
          )}

          {/* Fullscreen toggle */}
          {presentationModeEnabled && (
            <button
              onClick={toggleFullscreen}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              <Maximize className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}

          <a
            href={`https://fluxstudio.art/share/${formationId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-500 hover:text-gray-300 whitespace-nowrap ml-1"
          >
            FluxStudio
          </a>
        </div>
      )}

      {/* Watermark when no playback */}
      {duration === 0 && (
        <div className="absolute bottom-2 right-2">
          <a
            href={`https://fluxstudio.art/share/${formationId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-600 hover:text-gray-400"
          >
            Made with FluxStudio
          </a>
        </div>
      )}
    </div>
  );
}
