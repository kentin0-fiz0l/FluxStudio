/**
 * Formation Editor Page - FluxStudio
 *
 * Page wrapper for the FormationCanvas component.
 * Handles routing, project context, layout, and view mode switching (2D/3D/Split).
 */

import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { FormationCanvas } from '@/components/formation';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Formation } from '../services/formationService';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';
import { ViewToggle } from '../components/formation/ViewToggle';
import { useScene3D } from '../hooks/useScene3D';
const Formation3DViewLazy = React.lazy(
  () => import('../components/formation/Formation3DView').then((m) => ({ default: m.Formation3DView }))
);

export default function FormationEditor() {
  const { projectId, formationId: rawFormationId } = useParams<{
    projectId: string;
    formationId?: string;
  }>();
  // Treat "new" as undefined - it's a special route for creating new formations
  const formationId = rawFormationId === 'new' ? undefined : rawFormationId;
  const navigate = useNavigate();
  const { user: _user } = useAuth();
  const { addNotification } = useNotification();

  const {
    viewMode,
    setViewMode,
    objectList,
    selectedObjectId,
    activeTool,
    settings,
    selectObject,
    updateObjectPosition,
  } = useScene3D();

  // Track current positions and performers for 3D view (from FormationCanvas internal state)
  const [currentPositions, setCurrentPositions] = React.useState<Map<string, import('../services/formationTypes').Position>>(new Map());
  const [currentPerformers, setCurrentPerformers] = React.useState<import('../services/formationTypes').Performer[]>([]);

  // Handle save
  const handleSave = React.useCallback(
    (formation: Formation) => {
      addNotification({
        type: 'success',
        title: 'Formation Saved',
        message: `"${formation.name}" has been saved successfully.`,
      });
      // Update 3D view data when formation saves
      if (formation.performers) {
        setCurrentPerformers(formation.performers);
      }
      if (formation.keyframes?.[0]?.positions) {
        setCurrentPositions(new Map(formation.keyframes[0].positions));
      }
    },
    [addNotification]
  );

  // Handle close/back navigation
  const handleClose = React.useCallback(() => {
    if (projectId) {
      navigate(`/projects/${projectId}`);
    } else {
      navigate('/projects');
    }
  }, [navigate, projectId]);

  // Validate project ID
  if (!projectId) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Project Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please select a project to create or edit formations.
          </p>
          <Button onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const show2D = viewMode === '2d' || viewMode === 'split';
  const show3D = viewMode === '3d' || viewMode === 'split';

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header with back button and view toggle */}
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Project
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {formationId ? 'Edit Formation' : 'New Formation'}
            </h1>
          </div>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>

        {/* Content area with view mode */}
        <div className={`flex-1 overflow-hidden ${viewMode === 'split' ? 'flex' : ''}`}>
          {/* 2D Canvas */}
          {show2D && (
            <div className={viewMode === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'h-full'}>
              <FormationCanvas
                projectId={projectId}
                formationId={formationId}
                collaborativeMode={true}
                onSave={handleSave}
                onClose={handleClose}
              />
            </div>
          )}

          {/* 3D View */}
          {show3D && (
            <div className={viewMode === 'split' ? 'w-1/2' : 'h-full'}>
              <React.Suspense
                fallback={
                  <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
                    <div className="text-gray-500 dark:text-gray-400">Loading 3D view...</div>
                  </div>
                }
              >
                <Formation3DViewLazy
                  positions={currentPositions}
                  performers={currentPerformers}
                  sceneObjects={objectList}
                  selectedObjectId={selectedObjectId}
                  activeTool={activeTool}
                  showGrid={settings.showGrid}
                  showLabels={settings.showLabels}
                  showShadows={settings.showShadows}
                  onSelectObject={selectObject}
                  onUpdateObjectPosition={(id: string, pos: { x?: number; y?: number; z?: number }) => {
                    updateObjectPosition(id, pos);
                  }}
                />
              </React.Suspense>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
