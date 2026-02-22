/**
 * SharedFormation - Public read-only formation preview
 *
 * Accessible without authentication at /share/:formationId
 * Shows a 3D preview with orbit controls and a "Made with FluxStudio" watermark.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, RotateCcw, Eye } from 'lucide-react';
import * as formationsApi from '../services/formationsApi';
import { SEOHead } from '../components/SEOHead';

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

  useEffect(() => {
    if (!formationId) return;

    const loadFormation = async () => {
      try {
        setLoading(true);
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
      } catch (err) {
        console.error('Failed to load shared formation:', err);
        setError('This formation is not available or the link has expired.');
      } finally {
        setLoading(false);
      }
    };

    loadFormation();
  }, [formationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-sm text-gray-500">Loading formation...</span>
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
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to FluxStudio
          </button>
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
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-white">{formation.name}</span>
          {formation.description && (
            <span className="text-sm text-gray-400">{formation.description}</span>
          )}
          <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded">
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
            onClick={() => navigate('/signup')}
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
