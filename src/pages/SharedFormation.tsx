/**
 * SharedFormation - Public read-only formation preview with full playback
 *
 * Accessible without authentication at /share/:formationId
 * Shows a 3D/2D preview with playback controls, audio sync, set navigation,
 * and role-based filtering. Includes a "Made with FluxStudio" watermark.
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Loader2,
  ArrowRight,
  RotateCcw,
  Eye,
  RefreshCw,
  Play,
  Pause,
  SkipBack,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Presentation,
} from 'lucide-react';
import * as formationsApi from '../services/formationsApi';
import { SEOHead } from '../components/SEOHead';
import { eventTracker } from '../services/analytics/eventTracking';
import { Formation3DViewErrorBoundary } from '@/components/error/ErrorBoundary';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { generateLocalPresentationNotes } from '@/services/presentationAIService';
import type { PresentationNote } from '@/components/presentation/PresentationView';
import type { DrillSet } from '../services/formationTypes';

const PresentationViewLazy = React.lazy(
  () => import('../components/presentation/PresentationView'),
);

const Formation3DViewLazy = React.lazy(
  () => import('../components/formation/Formation3DView').then((m) => ({ default: m.Formation3DView }))
);

// ============================================================================
// TYPES
// ============================================================================

interface SharedKeyframe {
  id: string;
  timestamp: number;
  positions: Record<string, { x: number; y: number; rotation?: number }>;
}

interface SharedAudioTrack {
  url: string;
  filename: string;
  duration: number;
}

interface SharedFormationData {
  id: string;
  name: string;
  description?: string;
  performers: Array<{ id: string; name: string; label: string; color: string }>;
  positions: Map<string, { x: number; y: number; rotation?: number }>;
  keyframes: SharedKeyframe[];
  audioTrack?: SharedAudioTrack;
  sets?: DrillSet[];
  stageWidth: number;
  stageHeight: number;
  createdBy?: string;
}

type PlaybackSpeed = 0.5 | 1 | 1.5 | 2;

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 1, 1.5, 2];

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SharedFormation() {
  const { formationId } = useParams<{ formationId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Role-based filtering from URL params
  const role = searchParams.get('role');
  const performerId = searchParams.get('performerId');
  const sectionParam = searchParams.get('section');

  // Feature flags
  const presentationModeEnabled = useFeatureFlag('presentation-mode');

  // Core state
  const [formation, setFormation] = useState<SharedFormationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  // Presentation mode state
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [presentationNotes, setPresentationNotes] = useState<PresentationNote[]>([]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number; rotation?: number }>>(new Map());
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Audio state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Refs for playback loop
  const playbackRef = useRef<{ startWall: number; startTime: number } | null>(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadFormation = useCallback(async () => {
    if (!formationId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await formationsApi.fetchSharedFormation(formationId);

      // Convert keyframes — positions may come back as Map from transformApiKeyframe
      const keyframes: SharedKeyframe[] = (data.keyframes || []).map((kf) => ({
        id: String(kf.id),
        timestamp: Number(kf.timestamp),
        positions: (kf.positions instanceof Map
          ? Object.fromEntries(kf.positions)
          : kf.positions || {}) as Record<string, { x: number; y: number; rotation?: number }>,
      }));

      // Set initial positions from first keyframe
      const initialPositions = new Map<string, { x: number; y: number; rotation?: number }>();
      if (keyframes.length > 0 && keyframes[0].positions) {
        Object.entries(keyframes[0].positions).forEach(([id, pos]) => {
          initialPositions.set(id, pos);
        });
      }

      // Build audio track if available
      let audioTrack: SharedAudioTrack | undefined;
      if (data.audioTrack?.url) {
        audioTrack = {
          url: data.audioTrack.url,
          filename: data.audioTrack.filename,
          duration: data.audioTrack.duration,
        };
      }

      setFormation({
        id: data.id,
        name: data.name,
        description: data.description,
        performers: data.performers || [],
        positions: initialPositions,
        keyframes,
        audioTrack,
        sets: data.sets,
        stageWidth: data.stageWidth || 100,
        stageHeight: data.stageHeight || 100,
        createdBy: data.createdBy,
      });
      setPositions(initialPositions);
      setCurrentTime(0);
      setIsPlaying(false);

      eventTracker.trackEvent('shared_formation_view', {
        formationId,
        performerCount: (data.performers || []).length,
        hasAudio: !!data.audioTrack?.url,
        hasPlayback: keyframes.length > 1,
        role: role || 'viewer',
      });
    } catch (err) {
      console.error('Failed to load shared formation:', err);
      setError('This formation is not available or the link has expired.');
    } finally {
      setLoading(false);
    }
  }, [formationId, role]);

  useEffect(() => {
    loadFormation();
  }, [loadFormation]);

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

      // Same keyframe — no interpolation needed
      if (prevKf.id === nextKf.id) {
        const map = new Map<string, { x: number; y: number; rotation?: number }>();
        Object.entries(prevKf.positions).forEach(([id, pos]) => map.set(id, pos));
        return map;
      }

      // Interpolate between keyframes
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
    [formation]
  );

  // ============================================================================
  // PLAYBACK ENGINE
  // ============================================================================

  const duration = useMemo(() => {
    if (!formation || formation.keyframes.length < 2) return 0;
    return formation.keyframes[formation.keyframes.length - 1].timestamp;
  }, [formation]);

  // Sync audio playback rate with speed control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Sync audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Main playback loop
  useEffect(() => {
    if (!isPlaying || !formation || duration <= 0) return;

    playbackRef.current = {
      startWall: performance.now(),
      startTime: currentTime,
    };
    let raf: number;

    const tick = () => {
      if (!playbackRef.current) return;
      const elapsed = (performance.now() - playbackRef.current.startWall) * speed;
      const t = playbackRef.current.startTime + elapsed;

      if (t >= duration) {
        setCurrentTime(0);
        setPositions(getInterpolatedPositions(0));
        setIsPlaying(false);
        // Reset audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        return;
      }

      setCurrentTime(t);
      setPositions(getInterpolatedPositions(t));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    // Start audio playback
    if (audioRef.current && formation.audioTrack) {
      audioRef.current.currentTime = currentTime / 1000;
      audioRef.current.playbackRate = speed;
      audioRef.current.play().catch(() => {
        // Audio play may fail due to autoplay policy — ignore
      });
    }

    return () => {
      cancelAnimationFrame(raf);
      playbackRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, speed, duration, formation, getInterpolatedPositions]);

  // ============================================================================
  // TRANSPORT CONTROLS
  // ============================================================================

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    } else {
      if (currentTime >= duration && duration > 0) {
        setCurrentTime(0);
        setPositions(getInterpolatedPositions(0));
      }
      setIsPlaying(true);
    }
  }, [isPlaying, currentTime, duration, getInterpolatedPositions]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setPositions(getInterpolatedPositions(0));
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [getInterpolatedPositions]);

  const handleSeek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(time, duration));
      setCurrentTime(clamped);
      setPositions(getInterpolatedPositions(clamped));
      if (audioRef.current) {
        audioRef.current.currentTime = clamped / 1000;
      }
      // If playing, restart the playback loop from the new position
      if (isPlaying) {
        playbackRef.current = {
          startWall: performance.now(),
          startTime: clamped,
        };
      }
    },
    [duration, getInterpolatedPositions, isPlaying]
  );

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const fraction = (e.clientX - rect.left) / rect.width;
      handleSeek(fraction * duration);
    },
    [duration, handleSeek]
  );

  // ============================================================================
  // SET NAVIGATION
  // ============================================================================

  const sortedSets = useMemo(() => {
    if (!formation?.sets || formation.sets.length === 0) return [];
    return [...formation.sets].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [formation]);

  const currentSetIndex = useMemo(() => {
    if (sortedSets.length === 0 || !formation) return -1;
    // Find the set whose keyframe timestamp is closest to (but not after) currentTime
    let bestIdx = 0;
    for (let i = 0; i < sortedSets.length; i++) {
      const kf = formation.keyframes.find((k) => k.id === sortedSets[i].keyframeId);
      if (kf && kf.timestamp <= currentTime) {
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [sortedSets, formation, currentTime]);

  const navigateToSet = useCallback(
    (index: number) => {
      if (!formation || sortedSets.length === 0) return;
      const clamped = Math.max(0, Math.min(index, sortedSets.length - 1));
      const set = sortedSets[clamped];
      const kf = formation.keyframes.find((k) => k.id === set.keyframeId);
      if (kf) {
        handleSeek(kf.timestamp);
      }
    },
    [formation, sortedSets, handleSeek]
  );

  // ============================================================================
  // ROLE-BASED FILTERING
  // ============================================================================

  const highlightedPerformer = useMemo(() => {
    if (role !== 'performer' || !performerId || !formation) return null;
    return formation.performers.find((p) => p.id === performerId || p.label === performerId) || null;
  }, [role, performerId, formation]);

  // Section-leader role: filter performers to section
  const sectionFilteredPerformerIds = useMemo(() => {
    if (role !== 'section-leader' || !sectionParam || !formation) return null;
    const ids = new Set<string>();
    for (const p of formation.performers) {
      // Match section by checking performer name prefix or a section-like field
      // Since SharedFormationData performers don't have a section field,
      // we match by label prefix (e.g., "T" for Trumpets, "S" for Snares)
      if (p.name.toLowerCase().includes(sectionParam.toLowerCase()) ||
          p.label.toLowerCase().startsWith(sectionParam.toLowerCase())) {
        ids.add(p.id);
      }
    }
    return ids.size > 0 ? ids : null;
  }, [role, sectionParam, formation]);

  // Coordinate sheet data for performer role
  const performerCoordinateSheet = useMemo(() => {
    if (role !== 'performer' || !highlightedPerformer || !formation) return null;
    return formation.keyframes.map((kf, i) => {
      const pos = kf.positions[highlightedPerformer.id];
      return {
        setIndex: i,
        setName: `Set ${i + 1}`,
        position: pos ?? null,
      };
    });
  }, [role, highlightedPerformer, formation]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-900 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="h-5 w-40 bg-gray-700 rounded" />
            <div className="h-4 w-16 bg-gray-700 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-20 bg-gray-700 rounded-lg" />
            <div className="h-7 w-28 bg-gray-700 rounded-lg" />
          </div>
        </div>
        {/* Canvas skeleton */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative" style={{ width: '60vmin', height: '60vmin' }}>
            <div className="absolute inset-0 border border-gray-700 rounded-lg bg-gray-800/50">
              {[25, 45, 65, 35, 55, 50].map((x, i) => (
                <div
                  key={i}
                  className="absolute w-6 h-6 rounded-full bg-gray-700"
                  style={{ left: `${x}%`, top: `${[30, 50, 40, 60, 70, 20][i]}%`, transform: 'translate(-50%, -50%)' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !formation) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-gray-400" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Formation Not Found
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {error || 'This formation does not exist or has been removed.'}
          </p>
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={loadFormation}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Retry
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Go to FluxStudio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <SEOHead
        title={formation.name}
        description={`${formation.performers.length}-performer formation${formation.description ? ` — ${formation.description}` : ''}`}
        canonicalUrl={`https://fluxstudio.art/share/${formationId}`}
        ogType="article"
      />

      {/* Audio element (hidden) */}
      {formation.audioTrack && (
        <audio ref={audioRef} src={formation.audioTrack.url} preload="auto" />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base sm:text-lg font-semibold text-white truncate">{formation.name}</span>
          {formation.description && (
            <span className="text-sm text-gray-400 hidden sm:inline truncate">{formation.description}</span>
          )}
          <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded flex-shrink-0">
            {formation.performers.length} performers
          </span>
          {/* Performer highlight badge */}
          {highlightedPerformer && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0"
              style={{ backgroundColor: highlightedPerformer.color, color: '#fff' }}
            >
              {highlightedPerformer.name} ({highlightedPerformer.label})
            </span>
          )}
          {/* Section leader badge */}
          {role === 'section-leader' && sectionParam && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0 bg-blue-600 text-white">
              Section: {sectionParam}
              {sectionFilteredPerformerIds && (
                <span className="ml-1 opacity-75">({sectionFilteredPerformerIds.size})</span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-gray-700 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 text-xs rounded ${viewMode === '3d' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-gray-300'}`}
            >
              3D
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1 text-xs rounded ${viewMode === '2d' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-gray-300'}`}
            >
              2D
            </button>
          </div>

          {/* Present button (presentation-mode flag) */}
          {presentationModeEnabled && formation.keyframes.length > 1 && (
            <button
              onClick={() => {
                // Generate local notes on first enter
                if (presentationNotes.length === 0 && formation.sets?.length) {
                  const localNotes = generateLocalPresentationNotes(
                    formation.sets.map((s) => ({ name: s.name, counts: s.counts, notes: s.notes })),
                  );
                  setPresentationNotes(localNotes);
                }
                setIsPresentationMode(true);
                eventTracker.trackEvent('presentation_mode_enter', { formationId });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
            >
              <Presentation className="w-3.5 h-3.5" aria-hidden="true" />
              Present
            </button>
          )}

          {/* CTA */}
          <button
            onClick={() => {
              eventTracker.trackEvent('shared_signup_click', { source: 'share_header', formationId });
              navigate('/signup');
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Try FluxStudio
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 3D / 2D Preview */}
      <div className="flex-1 relative">
        {viewMode === '3d' ? (
          <Formation3DViewErrorBoundary>
            <React.Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" aria-hidden="true" />
                </div>
              }
            >
              <Formation3DViewLazy
                positions={positions}
                performers={formation.performers}
                sceneObjects={[]}
                selectedObjectId={null}
                activeTool="select"
                showGrid={true}
                showLabels={true}
                showShadows={true}
                onSelectObject={() => {}}
                onUpdateObjectPosition={() => {}}
              />
            </React.Suspense>
          </Formation3DViewErrorBoundary>
        ) : (
          <div className="flex items-center justify-center h-full bg-white dark:bg-gray-800">
            <div className="relative" style={{ width: '80vmin', height: '80vmin' }}>
              {/* Simple 2D dot rendering */}
              <div className="absolute inset-0 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
                {formation.performers.map((performer) => {
                  const pos = positions.get(performer.id);
                  if (!pos) return null;

                  const isHighlighted = (!highlightedPerformer && !sectionFilteredPerformerIds) ||
                    (highlightedPerformer && performer.id === highlightedPerformer.id) ||
                    (sectionFilteredPerformerIds && sectionFilteredPerformerIds.has(performer.id));
                  const isDimmed = (highlightedPerformer && performer.id !== highlightedPerformer.id) ||
                    (sectionFilteredPerformerIds && !sectionFilteredPerformerIds.has(performer.id));

                  return (
                    <div
                      key={performer.id}
                      className="absolute flex items-center justify-center transition-opacity duration-200"
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: 'translate(-50%, -50%)',
                        opacity: isDimmed ? 0.25 : 1,
                        zIndex: isHighlighted ? 10 : 1,
                      }}
                    >
                      <div
                        className={`rounded-full flex items-center justify-center text-white font-bold shadow-md ${
                          isHighlighted && (highlightedPerformer || sectionFilteredPerformerIds) ? 'w-8 h-8 text-sm ring-2 ring-white' : 'w-6 h-6 text-xs'
                        }`}
                        style={{ backgroundColor: performer.color }}
                      >
                        {performer.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Performer coordinate sheet overlay */}
        {role === 'performer' && highlightedPerformer && performerCoordinateSheet && (
          <div className="absolute bottom-4 left-4 right-4 max-w-sm bg-black/80 backdrop-blur-sm rounded-lg text-white text-xs p-3 z-10">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: highlightedPerformer.color }}
              >
                {highlightedPerformer.label}
              </div>
              <span className="font-semibold">{highlightedPerformer.name} &mdash; Coordinate Sheet</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {performerCoordinateSheet.map((entry) => (
                <div key={entry.setIndex} className="flex items-center gap-2 text-gray-300">
                  <span className="w-12 text-gray-400 flex-shrink-0">{entry.setName}</span>
                  {entry.position ? (
                    <span className="font-mono">
                      ({entry.position.x.toFixed(1)}, {entry.position.y.toFixed(1)})
                    </span>
                  ) : (
                    <span className="text-gray-500 italic">Not in set</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Watermark (shown when no transport bar) */}
        {duration === 0 && (
          <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-lg text-white/70 text-xs">
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            Made with FluxStudio
          </div>
        )}
      </div>

      {/* Transport Bar */}
      {duration > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-t border-gray-700">
          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            className="p-1.5 text-white hover:text-indigo-400 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          {/* Stop/Reset */}
          <button
            onClick={handleStop}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
            aria-label="Stop and reset"
          >
            <SkipBack className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          {/* Set navigation — previous */}
          {sortedSets.length > 0 && (
            <button
              onClick={() => navigateToSet(currentSetIndex - 1)}
              disabled={currentSetIndex <= 0}
              className="p-1.5 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous set"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}

          {/* Set indicator */}
          {sortedSets.length > 0 && currentSetIndex >= 0 && (
            <span className="text-xs text-gray-400 whitespace-nowrap min-w-[4rem] text-center">
              {sortedSets[currentSetIndex]?.name || `Set ${currentSetIndex + 1}`}
            </span>
          )}

          {/* Set navigation — next */}
          {sortedSets.length > 0 && (
            <button
              onClick={() => navigateToSet(currentSetIndex + 1)}
              disabled={currentSetIndex >= sortedSets.length - 1}
              className="p-1.5 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next set"
            >
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}

          {/* Progress bar */}
          <div
            className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden cursor-pointer group"
            role="slider"
            tabIndex={0}
            aria-label="Playback progress"
            aria-valuenow={Math.round(currentTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            onClick={handleProgressClick}
            onKeyDown={(e) => {
              const step = duration / 20;
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                handleSeek(Math.min(duration, currentTime + step));
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                handleSeek(Math.max(0, currentTime - step));
              } else if (e.key === 'Home') {
                e.preventDefault();
                handleSeek(0);
              } else if (e.key === 'End') {
                e.preventDefault();
                handleSeek(duration);
              }
            }}
          >
            <div
              className="h-full bg-indigo-500 rounded-full transition-[width] duration-75 group-hover:bg-indigo-400"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          {/* Time display */}
          <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap min-w-[5.5rem] text-center">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Speed selector */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu((v) => !v)}
              className="px-2 py-0.5 text-xs text-gray-400 hover:text-white bg-gray-700 rounded transition-colors"
              aria-label="Playback speed"
            >
              {speed}x
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-1 bg-gray-700 rounded-lg shadow-lg border border-gray-600 overflow-hidden z-20">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSpeed(s);
                      setShowSpeedMenu(false);
                    }}
                    className={`block w-full px-4 py-1.5 text-xs text-left whitespace-nowrap transition-colors ${
                      s === speed ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume controls (only if audio exists) */}
          {formation.audioTrack && (
            <div className="relative">
              <button
                onClick={() => setIsMuted((m) => !m)}
                onMouseEnter={() => setShowVolumeSlider(true)}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
              {showVolumeSlider && (
                <div
                  className="absolute bottom-full right-0 mb-1 bg-gray-700 rounded-lg shadow-lg border border-gray-600 p-2 z-20"
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
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
                    }}
                    className="w-20 h-1 accent-indigo-500"
                    aria-label="Volume"
                    style={{ writingMode: 'horizontal-tb' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Watermark in transport bar */}
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

      {/* Presentation mode overlay */}
      {isPresentationMode && (
        <React.Suspense
          fallback={
            <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" aria-hidden="true" />
            </div>
          }
        >
          <PresentationViewLazy
            formationName={formation.name}
            description={formation.description}
            performers={formation.performers}
            keyframes={formation.keyframes}
            sets={formation.sets}
            audioUrl={formation.audioTrack?.url}
            notes={presentationNotes}
            onExit={() => setIsPresentationMode(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
}
