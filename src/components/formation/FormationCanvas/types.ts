/**
 * Shared types and constants for FormationCanvas
 */

import type { Formation, Position, PlaybackState, AudioTrack, FormationExportOptions } from '../../../services/formationService';
import type { DrillSettings } from '../../../services/formationTypes';
import type { AlignmentType, DistributionType } from '../../../utils/drillGeometry';
import type { ApplyTemplateOptions } from '../../../services/formationTemplates/types';
import type { UseFormationHistoryResult } from '../../../hooks/useFormationHistory';

export type Tool = 'select' | 'pan' | 'add' | 'line' | 'arc' | 'block';

export interface FormationCanvasProps {
  formationId?: string;
  projectId: string;
  onSave?: (formation: Formation) => void;
  onClose?: () => void;
  collaborativeMode?: boolean;
  /** Sandbox mode — disables save/export, shows signup CTA */
  sandboxMode?: boolean;
  /** Pre-populated performers for sandbox (skips empty state) */
  sandboxPerformers?: Array<{ id: string; name: string; label: string; color: string }>;
  /** Initial positions keyed by performer ID */
  sandboxPositions?: Map<string, Position>;
  /** Called when positions change (e.g. for auto-save in sandbox) */
  onPositionsChange?: (positions: Map<string, Position>) => void;
}

export interface Marquee {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface CanvasState {
  formation: Formation | null;
  setFormation: React.Dispatch<React.SetStateAction<Formation | null>>;
  selectedPerformerIds: Set<string>;
  setSelectedPerformerIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedKeyframeId: string;
  setSelectedKeyframeId: React.Dispatch<React.SetStateAction<string>>;
  currentPositions: Map<string, Position>;
  setCurrentPositions: React.Dispatch<React.SetStateAction<Map<string, Position>>>;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  setSaveStatus: React.Dispatch<React.SetStateAction<'idle' | 'saving' | 'saved' | 'error'>>;
  activeTool: Tool;
  setActiveTool: React.Dispatch<React.SetStateAction<Tool>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  showLabels: boolean;
  setShowLabels: React.Dispatch<React.SetStateAction<boolean>>;
  showRotation: boolean;
  setShowRotation: React.Dispatch<React.SetStateAction<boolean>>;
  isExportDialogOpen: boolean;
  setIsExportDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showShortcutsDialog: boolean;
  setShowShortcutsDialog: React.Dispatch<React.SetStateAction<boolean>>;
  showPerformerPanel: boolean;
  setShowPerformerPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showAudioPanel: boolean;
  setShowAudioPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showPaths: boolean;
  setShowPaths: React.Dispatch<React.SetStateAction<boolean>>;
  snapEnabled: boolean;
  setSnapEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  timeDisplayMode: 'time' | 'counts';
  setTimeDisplayMode: React.Dispatch<React.SetStateAction<'time' | 'counts'>>;
  drillSettings: DrillSettings;
  setDrillSettings: React.Dispatch<React.SetStateAction<DrillSettings>>;
  showFieldOverlay: boolean;
  setShowFieldOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  shapeToolStart: Position | null;
  setShapeToolStart: React.Dispatch<React.SetStateAction<Position | null>>;
  shapeToolCurrent: Position | null;
  setShapeToolCurrent: React.Dispatch<React.SetStateAction<Position | null>>;
  fingerMode: 'select' | 'pan';
  setFingerMode: React.Dispatch<React.SetStateAction<'select' | 'pan'>>;
  canvasPan: { x: number; y: number };
  setCanvasPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  marquee: Marquee | null;
  setMarquee: React.Dispatch<React.SetStateAction<Marquee | null>>;
  marqueeRef: React.MutableRefObject<boolean>;
  clipboardRef: React.MutableRefObject<{ performers: Formation['performers']; positions: Map<string, Position> } | null>;
  showTemplatePicker: boolean;
  setShowTemplatePicker: React.Dispatch<React.SetStateAction<boolean>>;
  playbackState: PlaybackState;
  setPlaybackState: React.Dispatch<React.SetStateAction<PlaybackState>>;
  ghostTrail: Array<{ time: number; positions: Map<string, Position> }>;
  setGhostTrail: React.Dispatch<React.SetStateAction<Array<{ time: number; positions: Map<string, Position> }>>>;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export const defaultColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#06b6d4',
];

export type { Formation, Position, PlaybackState, AudioTrack, FormationExportOptions, DrillSettings, AlignmentType, DistributionType, ApplyTemplateOptions, UseFormationHistoryResult };
