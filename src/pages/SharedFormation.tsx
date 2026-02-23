/**
 * SharedFormation - Public read-only formation preview
 *
 * Accessible without authentication at /share/:formationId
 * Shows a 3D preview with orbit controls and a "Made with FluxStudio" watermark.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, RotateCcw, Eye, RefreshCw } from 'lucide-react';
import * as formationsApi from '../services/formationsApi';
import { SEOHead } from '../components/SEOHead';
import { eventTracker } from '../services/analytics/eventTracking';

const Formation3DViewLazy = React.lazy(
  () => import('../components/formation/Formation3DView').then((m) => ({ default: m.Formation3DView }))
);

interface SharedFormationData {
  id: string;
  name: string;
  description?: string;
  performers: Array<{ id: string; name: string; label: string; color: string }>;
  positions: Map<string, { x: number; y: number; rotation?: number }>;
  createdBy?: string;
}

export default function SharedFormation() {
  const { formationId } = useParams<{ formationId: string }>();
  const navigate = useNavigate();
  const [formation, setFormation] = useState<SharedFormationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  const loadFormation = useCallback(async () => {
    if (!formationId) return;
    try {
      setLoading(true);
      setError(null);
      // Fetch from public endpoint (no auth required)
      const data = await formationsApi.fetchSharedFormation(formationId);
      const positions = new Map<string, { x: number; y: number; rotation?: number }>();
      if (data.keyframes?.[0]?.positions) {
        Object.entries(data.keyframes[0].positions).forEach(([id, pos]) => {
          positions.set(id, pos as { x: number; y: number; rotation?: number });
        });
      }
      setFormation({
        id: data.id,
        name: data.name,
        description: data.description,
        performers: data.performers || [],
        positions,
        createdBy: data.createdBy,
      });
      eventTracker.trackEvent('shared_formation_view', {
        formationId,
        performerCount: (data.performers || []).length,
      });
    } catch (err) {
      console.error('Failed to load shared formation:', err);
      setError('This formation is not available or the link has expired.');
    } finally {
      setLoading(false);
    }
  }, [formationId]);

  useEffect(() => {
    loadFormation();
  }, [loadFormation]);

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
            <Eye className="w-8 h-8 text-gray-400" />
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
              <RefreshCw className="w-4 h-4" />
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

          {/* CTA */}
          <button
            onClick={() => {
              eventTracker.trackEvent('shared_signup_click', { source: 'share_header', formationId });
              navigate('/signup');
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Try FluxStudio
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D / 2D Preview */}
      <div className="flex-1 relative">
        {viewMode === '3d' ? (
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            }
          >
            <Formation3DViewLazy
              positions={formation.positions}
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
        ) : (
          <div className="flex items-center justify-center h-full bg-white dark:bg-gray-800">
            <div className="relative" style={{ width: '80vmin', height: '80vmin' }}>
              {/* Simple 2D dot rendering */}
              <div className="absolute inset-0 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
                {formation.performers.map((performer) => {
                  const pos = formation.positions.get(performer.id);
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
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
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

        {/* Watermark */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-lg text-white/70 text-xs">
          <RotateCcw className="w-3 h-3" />
          Made with FluxStudio
        </div>
      </div>
    </div>
  );
}
