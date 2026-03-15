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
import { FormationEditorErrorBoundary, Formation3DViewErrorBoundary } from '@/components/error/ErrorBoundary';
import { CollaborationErrorBoundary } from '@/components/error/featureBoundaries';
import { useRegisterShortcuts } from '@/contexts/KeyboardShortcutsContext';
import { useAuth } from '@/store/slices/authSlice';
import { useNotification } from '@/store/slices/notificationSlice';
import { Formation } from '../services/formationService';
import { ArrowLeft, ChevronRight, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui';
import { ViewToggle } from '../components/formation/ViewToggle';
import { PerformerView } from '../components/formation/PerformerView';
import { SectionLeaderView } from '../components/formation/SectionLeaderView';
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
import { ProductTour, type TourStep } from '@/components/onboarding/ProductTour';
import { openShortcutsDialog } from '@/components/ui/KeyboardShortcutsDialog';
import { CollaborationStatusIndicator } from '@/components/formation/CollaborationStatusIndicator';
import { useWebSocket } from '@/hooks/useWebSocket';
import { UsageLimitNudge } from '@/components/UsageLimitNudge';
import { Layout, Clock, Wrench, Sparkles, Play } from 'lucide-react';

const FORMATION_TOUR_KEY = 'fluxstudio_formation_tour_completed';

const FORMATION_TOUR_STEPS: TourStep[] = [
  {
    id: 'canvas',
    title: 'The Formation Canvas',
    description: 'This is where you place and arrange performers. Drag to move them, select multiple with a box, and use the grid for precise alignment.',
    targetSelector: '[data-tour="formation-canvas"]',
    icon: <Layout className="w-5 h-5" aria-hidden="true" />,
    ctaLabel: 'Next',
  },
  {
    id: 'timeline',
    title: 'Timeline & Keyframes',
    description: 'Add sets (keyframes) to create transitions between formations. Each set captures performer positions at a specific count.',
    targetSelector: '[data-tour="formation-timeline"]',
    icon: <Clock className="w-5 h-5" aria-hidden="true" />,
    ctaLabel: 'Next',
  },
  {
    id: 'toolbar',
    title: 'Drawing Tools',
    description: 'Use the toolbar to add performers, draw shapes, create lines, and access alignment tools. Switch between select, draw, and erase modes.',
    targetSelector: '[data-tour="formation-toolbar"]',
    icon: <Wrench className="w-5 h-5" aria-hidden="true" />,
    ctaLabel: 'Next',
  },
  {
    id: 'ai-prompt',
    title: 'AI Drill Writer',
    description: 'Describe what you want in natural language and the AI will generate formations for you. Try "Create a diagonal line moving to a block."',
    targetSelector: '[data-tour="formation-ai-prompt"]',
    icon: <Sparkles className="w-5 h-5" aria-hidden="true" />,
    ctaLabel: 'Next',
  },
  {
    id: 'playback',
    title: 'Preview & Playback',
    description: 'Press Play to animate transitions between sets. Adjust tempo to match your music, or switch to 3D view for a fly-through.',
    targetSelector: '[data-tour="formation-timeline"]',
    icon: <Play className="w-5 h-5" aria-hidden="true" />,
    ctaLabel: 'Got it!',
  },
];
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

  // Check for onboarding template to auto-apply
  const [initialTemplateId] = React.useState(() => {
    const id = localStorage.getItem('onboarding_v2_template');
    return id || undefined;
  });

  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  const mod = isMac ? '⌘' : 'Ctrl';

  // Register formation-specific shortcuts when editor is active
  useRegisterShortcuts([
    // Playback
    { id: 'formation-play', keys: ['Space'], action: 'Play/Pause playback', section: 'Formation Editor', priority: 10 },
    // Selection
    { id: 'formation-select-all', keys: [mod, 'A'], action: 'Select all performers', section: 'Formation Editor', priority: 20 },
    { id: 'formation-deselect', keys: ['Escape'], action: 'Deselect all / close panels', section: 'Formation Editor', priority: 21 },
    { id: 'formation-delete', keys: ['Delete'], action: 'Remove selected performers', section: 'Formation Editor', priority: 22 },
    { id: 'formation-tab-cycle', keys: ['Tab'], action: 'Cycle through performers', section: 'Formation Editor', priority: 23 },
    // Editing
    { id: 'formation-undo', keys: [mod, 'Z'], action: 'Undo', section: 'Formation Editor', priority: 30 },
    { id: 'formation-redo', keys: [mod, 'Shift', 'Z'], action: 'Redo', section: 'Formation Editor', priority: 31 },
    { id: 'formation-copy', keys: [mod, 'C'], action: 'Copy selected', section: 'Formation Editor', priority: 32 },
    { id: 'formation-paste', keys: [mod, 'V'], action: 'Paste', section: 'Formation Editor', priority: 33 },
    { id: 'formation-duplicate', keys: [mod, 'D'], action: 'Duplicate selected', section: 'Formation Editor', priority: 34 },
    { id: 'formation-save', keys: [mod, 'S'], action: 'Save formation', section: 'Formation Editor', priority: 35 },
    // Navigation
    { id: 'formation-nudge', keys: ['Arrow keys'], action: 'Nudge selected performers', section: 'Formation Editor', priority: 40 },
    { id: 'formation-nudge-large', keys: ['Shift', 'Arrow'], action: 'Nudge performers (5 units)', section: 'Formation Editor', priority: 41 },
    { id: 'formation-nav-performer', keys: ['Alt', 'Arrow'], action: 'Navigate to nearest performer', section: 'Formation Editor', priority: 42 },
    { id: 'formation-set-jump', keys: ['1-9'], action: 'Jump to set number', section: 'Formation Editor', priority: 43 },
    { id: 'formation-set-next', keys: ['PageDown'], action: 'Next set', section: 'Formation Editor', priority: 44 },
    { id: 'formation-set-prev', keys: ['PageUp'], action: 'Previous set', section: 'Formation Editor', priority: 45 },
    // View
    { id: 'formation-zoom-in', keys: ['+'], action: 'Zoom in', section: 'Formation Editor', priority: 50 },
    { id: 'formation-zoom-out', keys: ['-'], action: 'Zoom out', section: 'Formation Editor', priority: 51 },
    // Transform
    { id: 'formation-rotate', keys: ['R'], action: 'Rotate mode (multi-select)', section: 'Formation Editor', priority: 60 },
    { id: 'formation-scale', keys: ['S'], action: 'Scale mode (multi-select)', section: 'Formation Editor', priority: 61 },
    { id: 'formation-mirror', keys: ['M'], action: 'Mirror mode (multi-select)', section: 'Formation Editor', priority: 62 },
    // Help
    { id: 'formation-shortcuts', keys: ['?'], action: 'Show keyboard shortcuts', section: 'Formation Editor', priority: 70 },
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

  // Multi-role view state
  const [viewRole, setViewRole] = React.useState<'designer' | 'section-leader' | 'performer'>('designer');
  const [selectedPerformerId, setSelectedPerformerId] = React.useState<string | null>(null);
  const [currentFormation, setCurrentFormation] = React.useState<import('../services/formationTypes').Formation | null>(null);

  // Track current positions and performers for 3D view (from FormationCanvas internal state)
  const [currentPositions, setCurrentPositions] = React.useState<Map<string, import('../services/formationTypes').Position>>(new Map());
  const [currentPerformers, setCurrentPerformers] = React.useState<import('../services/formationTypes').Performer[]>([]);

  // Collaboration connection status via Socket.IO
  const { connected: collabConnected, socket: collabSocket } = useWebSocket('/collaboration');
  const [collabLastSyncedAt, setCollabLastSyncedAt] = React.useState<Date | null>(null);
  const [collabCount, setCollabCount] = React.useState(0);

  // Update last-synced timestamp and collaborator count from socket events
  React.useEffect(() => {
    if (!collabSocket) return;
    const handleSync = () => setCollabLastSyncedAt(new Date());
    const handlePresence = (data: { count?: number }) => {
      if (typeof data?.count === 'number') setCollabCount(data.count);
    };
    collabSocket.on('sync', handleSync);
    collabSocket.on('presence:update', handlePresence);
    return () => {
      collabSocket.off('sync', handleSync);
      collabSocket.off('presence:update', handlePresence);
    };
  }, [collabSocket]);

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
      // Update 3D view data and role-view formation when formation saves
      setCurrentFormation(formation as unknown as import('../services/formationTypes').Formation);
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

  // Formation tour state
  const [showTour, setShowTour] = React.useState(() => {
    return localStorage.getItem(FORMATION_TOUR_KEY) !== 'true';
  });

  const handleTourComplete = React.useCallback(() => {
    localStorage.setItem(FORMATION_TOUR_KEY, 'true');
    setShowTour(false);
  }, []);

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
          {/* Role selector */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <select
              value={viewRole}
              onChange={(e) => {
                const role = e.target.value as 'designer' | 'section-leader' | 'performer';
                setViewRole(role);
                // Reset to select tool when switching to section-leader
                if (role === 'section-leader' || role === 'performer') {
                  // Auto-select first performer for performer view
                  if (role === 'performer' && currentPerformers.length > 0 && !selectedPerformerId) {
                    setSelectedPerformerId(currentPerformers[0].id);
                  }
                }
              }}
              className="text-xs bg-transparent border-none outline-none cursor-pointer text-gray-700 dark:text-gray-300 px-2 py-1 rounded focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="View role"
            >
              <option value="designer">Designer</option>
              <option value="section-leader">Section Leader</option>
              <option value="performer">Performer</option>
            </select>
          </div>
          <CollaborationErrorBoundary>
            <CollaborationStatusIndicator
              isConnected={collabConnected}
              isSyncing={false}
              hasPendingChanges={!collabConnected && collabLastSyncedAt !== null}
              lastSyncedAt={collabLastSyncedAt}
              collaboratorCount={collabCount}
            />
          </CollaborationErrorBoundary>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          {/* Keyboard shortcuts button */}
          <button
            onClick={openShortcutsDialog}
            className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1"
            title="Keyboard shortcuts (?)"
            aria-label="Show keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" aria-hidden="true" />
            <span className="hidden lg:inline">
              Press <kbd className="px-1 py-0.5 text-[10px] bg-neutral-100 dark:bg-neutral-700 rounded border border-neutral-200 dark:border-neutral-600">?</kbd> for shortcuts
            </span>
          </button>
          {/* Help / Tour button */}
          <button
            onClick={() => setShowTour(true)}
            className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Restart product tour"
          >
            <Sparkles className="w-4 h-4 inline-block mr-1" aria-hidden="true" />
            Tour
          </button>
        </div>

        {/* AI usage limit nudge */}
        <div className="px-4">
          <UsageLimitNudge resource="aiCalls" />
        </div>

        {/* 3D Toolbar (only when 3D view is active and in designer mode) */}
        {show3D && viewRole === 'designer' && (
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

        {/* Content area - switches based on viewRole */}
        {viewRole === 'performer' && currentFormation ? (
          /* Performer View */
          <div className="flex-1 overflow-hidden">
            <PerformerView
              formation={currentFormation}
              performerId={selectedPerformerId || currentPerformers[0]?.id || ''}
              onClose={() => setViewRole('designer')}
              onChangePerformer={(id) => setSelectedPerformerId(id)}
            />
          </div>
        ) : viewRole === 'section-leader' && currentFormation ? (
          /* Section Leader View */
          <div className="flex-1 overflow-hidden">
            <SectionLeaderView
              formation={currentFormation}
              onSelectPerformer={(id) => setSelectedPerformerId(id)}
            />
          </div>
        ) : (
          /* Designer View (default) */
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
                    initialTemplateId={initialTemplateId}
                  />
                </FormationEditorErrorBoundary>
              </div>
            )}

            {/* 3D View */}
            {show3D && (
              <div className={viewMode === 'split' ? 'w-1/2' : 'h-full'}>
                <Formation3DViewErrorBoundary>
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
                </Formation3DViewErrorBoundary>
              </div>
            )}
          </div>
        )}
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

      {/* Formation-specific Product Tour */}
      <ProductTour
        steps={FORMATION_TOUR_STEPS}
        isActive={showTour}
        onComplete={handleTourComplete}
      />
    </DashboardLayout>
  );
}
