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
import { FormationEditorErrorBoundary } from '@/components/error/ErrorBoundary';
import { useRegisterShortcuts } from '@/contexts/KeyboardShortcutsContext';
import { useAuth } from '@/store/slices/authSlice';
import { useNotification } from '@/store/slices/notificationSlice';
import { Formation } from '../services/formationService';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { ViewToggle } from '../components/formation/ViewToggle';
import { Scene3DToolbar } from '../components/formation/Scene3DToolbar';
import { useScene3D } from '../hooks/useScene3D';
import { ObjectEditorModal } from '../components/object-editor/ObjectEditorModal';
import { PropLibraryPanel } from '../components/object-editor/PropLibraryPanel';
import { ModelImporter } from '../components/object-editor/ModelImporter';
// Lazy-load PrimitiveBuilder to avoid pulling Three.js/OrbitControls into the main chunk
const PrimitiveBuilder = React.lazy(() =>
  import('../components/object-editor/PrimitiveBuilder').then(m => ({ default: m.PrimitiveBuilder }))
);
import * as formationsApi from '../services/formationsApi';
import { observability } from '@/services/observability';
import type { ComposedPrimitive } from '../services/scene3d/types';
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

  // Register formation-specific shortcuts when editor is active
  useRegisterShortcuts([
    { id: 'formation-play', keys: ['Space'], action: 'Play/Pause playback', section: 'Formation Editor', priority: 10 },
    { id: 'formation-snap', keys: ['G'], action: 'Toggle grid snap', section: 'Formation Editor', priority: 20 },
    { id: 'formation-select-all', keys: ['⌘', 'A'], action: 'Select all performers', section: 'Formation Editor', priority: 30 },
    { id: 'formation-delete', keys: ['Delete'], action: 'Remove selected performers', section: 'Formation Editor', priority: 40 },
  ]);

  const {
    viewMode,
    setViewMode,
    objects: scene3dObjects,
    objectList,
    selectedObject,
    selectedObjectId,
    activeTool,
    settings,
    selectObject,
    updateObject,
    updateObjectPosition,
    removeObject,
    addPrimitive,
    addProp,
    addObject,
    clearScene,
    setActiveTool,
    updateSettings,
    duplicateSelected,
    isObjectEditorOpen,
    isPropLibraryOpen,
    isModelImporterOpen,
    isPrimitiveBuilderOpen,
    setObjectEditorOpen,
    setPropLibraryOpen,
    setModelImporterOpen,
    setPrimitiveBuilderOpen,
  } = useScene3D();

  // Track current positions and performers for 3D view (from FormationCanvas internal state)
  const [currentPositions, setCurrentPositions] = React.useState<Map<string, import('../services/formationTypes').Position>>(new Map());
  const [currentPerformers, setCurrentPerformers] = React.useState<import('../services/formationTypes').Performer[]>([]);

  // Handle save — also persist scene objects alongside formation
  const handleSave = React.useCallback(
    async (formation: Formation) => {
      // Save scene objects to the DB
      const sceneObjects = Object.values(scene3dRef.current.objects || {});
      if (sceneObjects.length > 0 && formation.id) {
        try {
          await formationsApi.saveSceneObjects(formation.id, sceneObjects);
        } catch (err) {
          console.error('Failed to save scene objects:', err);
        }
      }

      observability.analytics.track('formation_saved', { formationId: formation.id, projectId });
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

  // Handle adding shapes from toolbar tool selection
  const handleToolChange = React.useCallback((tool: import('../services/scene3d/types').Scene3DTool) => {
    // If it's an add-* tool, immediately add the shape and switch back to select
    if (tool.startsWith('add-')) {
      const shape = tool.replace('add-', '') as import('../services/scene3d/types').PrimitiveShape;
      addPrimitive(shape);
      setActiveTool('select');
    } else {
      setActiveTool(tool);
    }
  }, [addPrimitive, setActiveTool]);

  // Handle placing a prop from the library
  const handlePlaceProp = React.useCallback((catalogId: string, variant?: string) => {
    addProp(catalogId, undefined, variant);
    setPropLibraryOpen(false);
  }, [addProp, setPropLibraryOpen]);

  // Handle importing a model
  const handleImportModel = React.useCallback((file: File) => {
    const now = new Date().toISOString();
    addObject({
      id: `obj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name.replace(/\.[^.]+$/, ''),
      type: 'imported',
      position: { x: 50, y: 50, z: 0, rotation: 0, scale: 1 },
      source: {
        type: 'imported',
        fileId: `file-${Date.now()}`,
        fileUrl: URL.createObjectURL(file),
        filename: file.name,
        boundingBox: { width: 2, height: 2, depth: 2 },
        polyCount: 0, // Will be computed after loading
      },
      visible: true,
      locked: false,
      layer: objectList.length,
      createdAt: now,
      updatedAt: now,
    });
    setModelImporterOpen(false);
  }, [addObject, objectList.length, setModelImporterOpen]);

  // Handle saving a custom object from primitive builder
  const handleSaveCustom = React.useCallback((name: string, primitives: ComposedPrimitive[]) => {
    const now = new Date().toISOString();
    addObject({
      id: `obj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      type: 'custom',
      position: { x: 50, y: 50, z: 0, rotation: 0, scale: 1 },
      source: { type: 'custom', primitives, name },
      visible: true,
      locked: false,
      layer: objectList.length,
      createdAt: now,
      updatedAt: now,
    });
    setPrimitiveBuilderOpen(false);
  }, [addObject, objectList.length, setPrimitiveBuilderOpen]);

  // Track formation editor open
  React.useEffect(() => {
    observability.analytics.track('formation_opened', { projectId, formationId: formationId ?? 'new' });
  }, [projectId, formationId]);

  // Keep a stable ref to scene3d state/actions for load and save
  const scene3dRef = React.useRef({ clearScene, addObject, objects: scene3dObjects });
  scene3dRef.current = { clearScene, addObject, objects: scene3dObjects };

  // Load scene objects from DB when editing an existing formation
  React.useEffect(() => {
    if (formationId) {
      formationsApi.fetchSceneObjects(formationId).then(objects => {
        scene3dRef.current.clearScene();
        objects.forEach(obj => scene3dRef.current.addObject(obj));
      }).catch(err => {
        console.error('Failed to load scene objects:', err);
      });
    }
   
  }, [formationId]);

  // Auto-open object editor when selecting an object
  React.useEffect(() => {
    if (selectedObjectId && (viewMode === '3d' || viewMode === 'split')) {
      setObjectEditorOpen(true);
    }
  }, [selectedObjectId, viewMode, setObjectEditorOpen]);

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
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
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
        {/* Header with breadcrumb and view toggle */}
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="flex items-center gap-1 mr-1"
            aria-label="Back to Project"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Button>
          <nav aria-label="breadcrumb" className="flex-1 min-w-0">
            <ol className="flex items-center gap-1.5 text-sm">
              <li>
                <button onClick={() => navigate('/projects')} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
                  Projects
                </button>
              </li>
              <li><ChevronRight className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" /></li>
              <li>
                <button onClick={handleClose} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors truncate max-w-[160px]">
                  Project
                </button>
              </li>
              <li><ChevronRight className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" /></li>
              <li>
                <button onClick={handleClose} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
                  Formations
                </button>
              </li>
              <li><ChevronRight className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" /></li>
              <li>
                <span className="font-medium text-neutral-900 dark:text-white truncate max-w-[200px] block" aria-current="page">
                  {formationId ? 'Edit Formation' : 'New Formation'}
                </span>
              </li>
            </ol>
          </nav>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>

        {/* 3D Toolbar (only when 3D view is active) */}
        {show3D && (
          <Scene3DToolbar
            activeTool={activeTool}
            showGrid={settings.showGrid}
            showLabels={settings.showLabels}
            showShadows={settings.showShadows}
            onToolChange={handleToolChange}
            onToggleGrid={() => updateSettings({ showGrid: !settings.showGrid })}
            onToggleLabels={() => updateSettings({ showLabels: !settings.showLabels })}
            onToggleShadows={() => updateSettings({ showShadows: !settings.showShadows })}
            onOpenPropLibrary={() => setPropLibraryOpen(true)}
            onOpenModelImporter={() => setModelImporterOpen(true)}
            onOpenPrimitiveBuilder={() => setPrimitiveBuilderOpen(true)}
          />
        )}

        {/* Content area with view mode */}
        <div className={`flex-1 overflow-hidden ${viewMode === 'split' ? 'flex' : ''}`}>
          {/* 2D Canvas */}
          {show2D && (
            <div className={viewMode === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'h-full'}>
              <FormationEditorErrorBoundary>
                <FormationCanvas
                  projectId={projectId}
                  formationId={formationId}
                  collaborativeMode={true}
                  onSave={handleSave}
                  onClose={handleClose}
                />
              </FormationEditorErrorBoundary>
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

      {/* Object Editor Panel (right sidebar) */}
      {isObjectEditorOpen && selectedObject && (
        <ObjectEditorModal
          object={selectedObject}
          onUpdate={updateObject}
          onRemove={(id) => { removeObject(id); setObjectEditorOpen(false); }}
          onDuplicate={() => { duplicateSelected(); }}
          onClose={() => setObjectEditorOpen(false)}
        />
      )}

      {/* Prop Library Panel */}
      {isPropLibraryOpen && (
        <PropLibraryPanel
          onPlaceProp={handlePlaceProp}
          onClose={() => setPropLibraryOpen(false)}
        />
      )}

      {/* Model Importer Modal */}
      {isModelImporterOpen && (
        <ModelImporter
          onImport={handleImportModel}
          onClose={() => setModelImporterOpen(false)}
        />
      )}

      {/* Primitive Builder Modal */}
      {isPrimitiveBuilderOpen && (
        <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Loading builder...</div></div>}>
          <PrimitiveBuilder
            onSave={handleSaveCustom}
            onClose={() => setPrimitiveBuilderOpen(false)}
          />
        </React.Suspense>
      )}
    </DashboardLayout>
  );
}
