/**
 * useCanvasState - All state declarations for FormationCanvas
 */

import { useState, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formationService,
  type Formation,
  type Position,
  type PlaybackState,
} from '../../../services/formationService';
import { useFormation } from '../../../hooks/useFormations';
import { useFormationYjs } from '../../../hooks/useFormationYjs';
import { useFormationHistory } from '../../../hooks/useFormationHistory';
import { useAuth } from '@/store/slices/authSlice';
import { getUserColor } from '../../../services/formation/yjs/formationYjsTypes';
import { DEFAULT_DRILL_SETTINGS } from '../../../utils/drillGeometry';
import type { DrillSettings } from '../../../services/formationTypes';
import type { Tool, FormationCanvasProps, Marquee } from './types';

function getInitialFormationData(
  formationId: string | undefined,
  projectId: string,
  defaultTitle: string,
  sandboxPerformers?: FormationCanvasProps['sandboxPerformers'],
  sandboxPositions?: Map<string, Position>,
) {
  if (formationId) {
    const existing = formationService.getFormation(formationId);
    if (existing) {
      return {
        formation: existing,
        keyframeId: existing.keyframes[0]?.id || '',
        positions: existing.keyframes.length > 0 ? new Map(existing.keyframes[0].positions) : new Map<string, Position>(),
      };
    }
  }
  const newFormation = formationService.createFormation(defaultTitle, projectId, {
    createdBy: 'current-user',
    performers: sandboxPerformers,
  });

  // Pre-populate positions for sandbox
  if (sandboxPositions && newFormation.keyframes[0]) {
    for (const [id, pos] of sandboxPositions) {
      newFormation.keyframes[0].positions.set(id, pos);
    }
  }

  return {
    formation: newFormation,
    keyframeId: newFormation.keyframes[0]?.id || '',
    positions: newFormation.keyframes.length > 0 ? new Map(newFormation.keyframes[0].positions) : new Map<string, Position>(),
  };
}

export function useCanvasState(props: FormationCanvasProps) {
  const { formationId, projectId, sandboxPerformers, sandboxPositions, collaborativeMode } = props;
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const canvasRef = useRef<HTMLDivElement>(null);

  const isCollaborativeEnabled = collaborativeMode ?? !!formationId;

  const { formation: apiFormation, loading: apiLoading, error: apiError, save: apiSave, saving: apiSaving } = useFormation({ formationId, enabled: !!formationId && !isCollaborativeEnabled });

  // Forward declarations for state setters used in collab callback
  const [formation, setFormation] = useState<Formation | null>(() => {
    if (!formationId) {
      const data = getInitialFormationData(undefined, projectId, t('formation.untitled', 'Untitled Formation'), sandboxPerformers, sandboxPositions);
      return data.formation;
    }
    return null;
  });

  const initialData = useMemo(() => {
    if (!formationId) return getInitialFormationData(undefined, projectId, t('formation.untitled', 'Untitled Formation'), sandboxPerformers, sandboxPositions);
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string>(() => (!formationId && initialData) ? initialData.keyframeId : '');
  const [currentPositions, setCurrentPositions] = useState<Map<string, Position>>(() => (!formationId && initialData) ? initialData.positions : new Map());

  const collab = useFormationYjs({
    projectId, formationId: formationId || '', enabled: isCollaborativeEnabled && !!formationId,
    onUpdate: (updatedFormation) => {
      if (isCollaborativeEnabled) {
        setFormation(updatedFormation);
        const keyframe = updatedFormation.keyframes.find((kf) => kf.id === selectedKeyframeId);
        if (keyframe) setCurrentPositions(new Map(keyframe.positions));
      }
    },
  });

  const currentUser = useMemo(() => {
    if (!user) return null;
    return { id: user.id, name: user.name || user.email || 'Anonymous', color: getUserColor(user.id), avatar: user.avatar };
  }, [user]);

  const [_draggingPerformerId, setDraggingPerformerId] = useState<string | null>(null);

  useEffect(() => {
    if (apiFormation && formationId) {
      const normalizedFormation = formationService.registerFormation(apiFormation);
      setFormation(normalizedFormation);
      if (normalizedFormation.keyframes.length > 0) {
        setSelectedKeyframeId(normalizedFormation.keyframes[0].id);
        setCurrentPositions(new Map(normalizedFormation.keyframes[0].positions));
      }
    }
  }, [apiFormation, formationId]);

  const [selectedPerformerIds, setSelectedPerformerIds] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showRotation, setShowRotation] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showPerformerPanel, setShowPerformerPanel] = useState(true);
  const [showAudioPanel, setShowAudioPanel] = useState(false);
  const [showPaths, setShowPaths] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [timeDisplayMode, setTimeDisplayMode] = useState<'time' | 'counts'>('time');
  const [drillSettings, setDrillSettings] = useState<DrillSettings>(DEFAULT_DRILL_SETTINGS);
  const [showFieldOverlay, setShowFieldOverlay] = useState(false);
  const [shapeToolStart, setShapeToolStart] = useState<Position | null>(null);
  const [shapeToolCurrent, setShapeToolCurrent] = useState<Position | null>(null);
  const [fingerMode, setFingerMode] = useState<'select' | 'pan'>('select');
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const marqueeRef = useRef(false);
  const clipboardRef = useRef<{ performers: Formation['performers']; positions: Map<string, Position> } | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({ isPlaying: false, currentTime: 0, duration: 5000, loop: false, speed: 1 });
  const [ghostTrail, setGhostTrail] = useState<Array<{ time: number; positions: Map<string, Position> }>>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const history = useFormationHistory({ maxHistory: 100 });

  return {
    // API / Collab
    apiLoading, apiError, apiSave, apiSaving,
    isCollaborativeEnabled, collab, currentUser,
    // Core state
    formation, setFormation,
    selectedPerformerIds, setSelectedPerformerIds,
    selectedKeyframeId, setSelectedKeyframeId,
    currentPositions, setCurrentPositions,
    saveStatus, setSaveStatus,
    activeTool, setActiveTool,
    zoom, setZoom,
    showGrid, setShowGrid,
    showLabels, setShowLabels,
    showRotation, setShowRotation,
    isExportDialogOpen, setIsExportDialogOpen,
    showShortcutsDialog, setShowShortcutsDialog,
    showPerformerPanel, setShowPerformerPanel,
    showAudioPanel, setShowAudioPanel,
    showPaths, setShowPaths,
    snapEnabled, setSnapEnabled,
    timeDisplayMode, setTimeDisplayMode,
    drillSettings, setDrillSettings,
    showFieldOverlay, setShowFieldOverlay,
    shapeToolStart, setShapeToolStart,
    shapeToolCurrent, setShapeToolCurrent,
    fingerMode, setFingerMode,
    canvasPan, setCanvasPan,
    marquee, setMarquee,
    marqueeRef, clipboardRef,
    showTemplatePicker, setShowTemplatePicker,
    playbackState, setPlaybackState,
    ghostTrail, setGhostTrail,
    hasUnsavedChanges, setHasUnsavedChanges,
    // Refs
    canvasRef,
    setDraggingPerformerId,
    // History
    history,
  };
}
