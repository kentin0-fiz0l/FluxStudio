/**
 * EmbedFormation - Minimal chromeless formation viewer for iframe embedding
 *
 * Renders a 2D dot-on-grid view of a shared formation with optional
 * autoplay and theme support. Designed for embedding on external websites.
 * No header, no footer, no sidebar, no 3D — just dots on a field grid.
 *
 * Route: /embed/:formationId
 * Query params:
 *   ?theme=light|dark  (default: light)
 *   ?autoplay=true|false (default: false)
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Play, Pause } from 'lucide-react';
import * as formationsApi from '../services/formationsApi';
import { eventTracker } from '../services/analytics/eventTracking';

// ============================================================================
// TYPES
// ============================================================================

interface EmbedKeyframe {
  id: string;
  timestamp: number;
  positions: Record<string, { x: number; y: number; rotation?: number }>;
}

interface EmbedFormationData {
  id: string;
  name: string;
  performers: Array<{ id: string; name: string; label: string; color: string }>;
  keyframes: EmbedKeyframe[];
  stageWidth: number;
  stageHeight: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function EmbedFormation() {
  const { formationId } = useParams<{ formationId: string }>();
  const [searchParams] = useSearchParams();

  const theme = searchParams.get('theme') === 'dark' ? 'dark' : 'light';
  const autoplay = searchParams.get('autoplay') === 'true';
  const isDark = theme === 'dark';

  const [formation, setFormation] = useState<EmbedFormationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number; rotation?: number }>>(new Map());

  const playbackRef = useRef<{ startWall: number; startTime: number } | null>(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (!formationId) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await formationsApi.fetchSharedFormation(formationId!);

        if (cancelled) return;

        const keyframes: EmbedKeyframe[] = (data.keyframes || []).map((kf) => ({
          id: String(kf.id),
          timestamp: Number(kf.timestamp),
          positions: (kf.positions instanceof Map
            ? Object.fromEntries(kf.positions)
            : kf.positions || {}) as Record<string, { x: number; y: number; rotation?: number }>,
        }));

        const initialPositions = new Map<string, { x: number; y: number; rotation?: number }>();
        if (keyframes.length > 0 && keyframes[0].positions) {
          Object.entries(keyframes[0].positions).forEach(([id, pos]) => {
            initialPositions.set(id, pos);
          });
        }

        setFormation({
          id: data.id,
          name: data.name,
          performers: data.performers || [],
          keyframes,
          stageWidth: data.stageWidth || 100,
          stageHeight: data.stageHeight || 100,
        });
        setPositions(initialPositions);
        setCurrentTime(0);

        eventTracker.trackEvent('embed_view', {
          formationId,
          performerCount: (data.performers || []).length,
          hasPlayback: keyframes.length > 1,
          theme,
        });
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load embedded formation:', err);
          setError('Formation not available.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [formationId, theme]);

  // ============================================================================
  // INTERPOLATION
  // ============================================================================

  const getInterpolatedPositions = useCallback(
    (time: number): Map<string, { x: number; y: number; rotation?: number }> => {
      if (!formation || formation.keyframes.length === 0) return new Map();

      const kfs = formation.keyframes;
      let prevKf = kfs[0];
      let nextKf = kfs[0];

      for (const kf of kfs) {
        if (kf.timestamp <= time) prevKf = kf;
        if (kf.timestamp >= time) {
          nextKf = kf;
          break;
        }
      }

      if (prevKf.id === nextKf.id) {
        const map = new Map<string, { x: number; y: number; rotation?: number }>();
        Object.entries(prevKf.positions).forEach(([id, pos]) => map.set(id, pos));
        return map;
      }

      const range = nextKf.timestamp - prevKf.timestamp;
      const t = range > 0 ? (time - prevKf.timestamp) / range : 0;
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
    },
    [formation],
  );

  // ============================================================================
  // PLAYBACK
  // ============================================================================

  const duration = useMemo(() => {
    if (!formation || formation.keyframes.length < 2) return 0;
    return formation.keyframes[formation.keyframes.length - 1].timestamp;
  }, [formation]);

  // Autoplay when formation loads
  useEffect(() => {
    if (autoplay && formation && duration > 0 && !isPlaying) {
      setIsPlaying(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formation, duration, autoplay]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !formation || duration <= 0) return;

    playbackRef.current = {
      startWall: performance.now(),
      startTime: currentTime,
    };
    let raf: number;

    const tick = () => {
      if (!playbackRef.current) return;
      const elapsed = performance.now() - playbackRef.current.startWall;
      const t = playbackRef.current.startTime + elapsed;

      if (t >= duration) {
        setCurrentTime(0);
        setPositions(getInterpolatedPositions(0));
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
      playbackRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, duration, formation, getInterpolatedPositions]);

  // ============================================================================
  // CONTROLS
  // ============================================================================

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentTime >= duration && duration > 0) {
        setCurrentTime(0);
        setPositions(getInterpolatedPositions(0));
      }
      setIsPlaying(true);
    }
  }, [isPlaying, currentTime, duration, getInterpolatedPositions]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const fraction = (e.clientX - rect.left) / rect.width;
      const seekTime = Math.max(0, Math.min(fraction * duration, duration));
      setCurrentTime(seekTime);
      setPositions(getInterpolatedPositions(seekTime));
      if (isPlaying && playbackRef.current) {
        playbackRef.current = {
          startWall: performance.now(),
          startTime: seekTime,
        };
      }
    },
    [duration, getInterpolatedPositions, isPlaying],
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div
        className={`w-full h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}
      >
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" aria-hidden="true" />
      </div>
    );
  }

  if (error || !formation) {
    return (
      <div
        className={`w-full h-screen flex items-center justify-center text-sm ${
          isDark ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-500'
        }`}
      >
        {error || 'Formation not found.'}
      </div>
    );
  }

  return (
    <div className={`w-full h-screen relative overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      {/* 2D Grid with performers */}
      <div
        className={`absolute rounded-md ${
          isDark
            ? 'border border-gray-700 bg-gray-800'
            : 'border border-gray-200 bg-gray-50'
        }`}
        style={{
          top: 8,
          left: 8,
          right: 8,
          bottom: duration > 0 ? 44 : 8,
        }}
      >
        {formation.performers.map((performer) => {
          const pos = positions.get(performer.id);
          if (!pos) return null;

          return (
            <div
              key={performer.id}
              className="absolute flex items-center justify-center"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className="rounded-full flex items-center justify-center text-white font-bold shadow-md"
                style={{
                  width: 20,
                  height: 20,
                  fontSize: 9,
                  backgroundColor: performer.color,
                }}
              >
                {performer.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Minimal transport bar for playable formations */}
      {duration > 0 && (
        <div
          className={`absolute left-2 right-2 bottom-2 h-7 flex items-center gap-1.5 px-1.5 rounded-md border ${
            isDark
              ? 'bg-gray-800 border-gray-700'
              : 'bg-gray-100 border-gray-200'
          }`}
        >
          <button
            onClick={handlePlayPause}
            className={`w-5 h-5 flex items-center justify-center border-none bg-transparent cursor-pointer p-0 flex-shrink-0 ${
              isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause style={{ width: 14, height: 14 }} />
            ) : (
              <Play style={{ width: 14, height: 14 }} />
            )}
          </button>

          <div
            className={`flex-1 h-1 rounded-sm overflow-hidden cursor-pointer ${
              isDark ? 'bg-gray-700' : 'bg-gray-300'
            }`}
            onClick={handleSeek}
          >
            <div
              className="h-full bg-indigo-500 rounded-sm"
              style={{
                width: `${(currentTime / duration) * 100}%`,
                transition: 'width 75ms linear',
              }}
            />
          </div>
        </div>
      )}

      {/* Powered by FluxStudio watermark */}
      <a
        href="/signup?utm_source=embed&utm_medium=widget"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute z-10 no-underline"
        style={{
          bottom: duration > 0 ? 46 : 12,
          right: 12,
          fontSize: 10,
          color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)',
        }}
        onClick={() =>
          eventTracker.trackEvent('embed_watermark_click', { formationId })
        }
      >
        Powered by FluxStudio
      </a>
    </div>
  );
}
