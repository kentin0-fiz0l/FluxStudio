/**
 * EmbedFormation - Lightweight embeddable formation viewer
 *
 * Accessible at /embed/:formationId — designed for iframe embedding.
 * No auth, no header, minimal UI: just the canvas with playback controls.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Play, Pause, RotateCcw, RefreshCw } from 'lucide-react';
import * as formationsApi from '../services/formationsApi';

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
}

export default function EmbedFormation() {
  const { formationId } = useParams<{ formationId: string }>();
  const [data, setData] = useState<EmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number; rotation?: number }>>(new Map());

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
      });
      // Set initial positions from first keyframe
      if (res.keyframes?.[0]?.positions) {
        const map = new Map<string, { x: number; y: number; rotation?: number }>();
        Object.entries(res.keyframes[0].positions).forEach(([id, pos]) => {
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

  // Playback loop
  useEffect(() => {
    if (!isPlaying || !data || data.keyframes.length < 2) return;
    const duration = data.keyframes[data.keyframes.length - 1].timestamp;
    const startWall = performance.now();
    const startTime = currentTime;
    let raf: number;

    const tick = () => {
      const elapsed = performance.now() - startWall;
      const t = startTime + elapsed;
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
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, data, currentTime, getInterpolatedPositions]);

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

  const duration = data.keyframes.length >= 2 ? data.keyframes[data.keyframes.length - 1].timestamp : 0;

  return (
    <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
      {/* 3D View */}
      <div className="flex-1 relative">
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
      </div>

      {/* Minimal transport bar */}
      {duration > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-t border-gray-700">
          <button
            onClick={() => {
              if (isPlaying) {
                setIsPlaying(false);
              } else {
                if (currentTime >= duration) setCurrentTime(0);
                setIsPlaying(true);
              }
            }}
            className="p-1.5 text-white hover:text-indigo-400 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4" aria-hidden="true" />}
          </button>
          <button
            onClick={() => { setIsPlaying(false); setCurrentTime(0); setPositions(getInterpolatedPositions(0)); }}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
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
              setCurrentTime(t);
              setPositions(getInterpolatedPositions(t));
            }}
          >
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(currentTime / duration) * 100}%` }} />
          </div>
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
