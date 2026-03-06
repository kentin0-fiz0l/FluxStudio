/**
 * Formation Types - Shared type definitions for formation services
 * Extracted from formationService.ts
 */

import type { SceneObject as SceneObject3D } from './scene3d/types';

export interface Position {
  x: number;
  y: number;
  rotation?: number;
}

export interface Performer {
  id: string;
  name: string;
  label: string;
  color: string;
  group?: string;
  /** Instrument (e.g., "Trumpet", "Snare", "Flute") */
  instrument?: string;
  /** Section (e.g., "Brass", "Woodwinds", "Percussion", "Color Guard") */
  section?: string;
  /** Drill number (e.g., "T1", "S5", "CG3") */
  drillNumber?: string;
}

export type TransitionType = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface Keyframe {
  id: string;
  timestamp: number;
  positions: Map<string, Position>;
  transition?: TransitionType;
  duration?: number;
  beatBinding?: { beatIndex: number; snapResolution: 'beat' | 'half-beat' | 'measure' };
}

export interface AudioTrack {
  id: string;
  url: string;
  filename: string;
  duration: number;
  waveformData?: number[];
  bpm?: number;
  bpmConfidence?: number;
}

export interface DrillSettings {
  bpm: number;
  countsPerPhrase: number;
  startOffset: number;
  fieldOverlay: boolean;
  snapToGrid: boolean;
}

// ============================================================================
// DRILL SET TYPES
// ============================================================================

/**
 * A DrillSet maps 1:1 to a keyframe but uses the count-based naming
 * and notation that drill writers expect. Sets are the fundamental
 * unit of drill writing (e.g., "Set 1", "Set 2A", "Opener Set 3").
 */
export interface DrillSet {
  id: string;
  /** Display name (e.g., "Set 1", "Set 2A", "Closer Set 1") */
  name: string;
  /** Optional custom label for visual display */
  label?: string;
  /** Duration in counts (e.g., 8, 16, 32) */
  counts: number;
  /** The keyframe this set corresponds to */
  keyframeId: string;
  /** Optional notes for rehearsal */
  notes?: string;
  /** Rehearsal mark (e.g., "A", "B", "Opener", "Ballad") */
  rehearsalMark?: string;
  /** Sort order for display */
  sortOrder: number;
}

/**
 * Step information between two sets for a performer.
 */
export interface StepInfo {
  /** Distance in normalized units (0-100 coordinate space) */
  distance: number;
  /** Distance in yards (for football field) */
  distanceYards: number;
  /** Step size in "X-to-5" notation (e.g., 8 = 8-to-5 steps per 5 yards) */
  stepSize: number;
  /** Step size formatted (e.g., "8 to 5", "6 to 5") */
  stepSizeLabel: string;
  /** Direction in degrees (0 = right, 90 = down on field) */
  direction: number;
  /** Direction as compass label (e.g., "to the right", "upfield") */
  directionLabel: string;
  /** Difficulty rating: 'easy' | 'moderate' | 'hard' */
  difficulty: 'easy' | 'moderate' | 'hard';
  /** Number of counts for this transition */
  counts: number;
}

/**
 * A single row in a coordinate sheet.
 */
export interface CoordinateEntry {
  /** Set reference */
  set: DrillSet;
  /** Position in standard drill notation (e.g., "4 steps outside R35") */
  coordinate: string;
  /** Coordinate breakdown for display */
  coordinateDetails: {
    sideToSide: string; // e.g., "4 steps outside R35"
    frontToBack: string; // e.g., "12 behind front hash"
  };
  /** Step info to next set (null for last set) */
  stepToNext: StepInfo | null;
  /** Step info from previous set (null for first set) */
  stepFromPrev: StepInfo | null;
}

/**
 * Field configuration for coordinate calculations.
 * Supports multiple field types beyond standard football.
 */
export interface FieldConfig {
  /** Field type identifier */
  type: 'ncaa_football' | 'nfl_football' | 'indoor_wgi' | 'stage' | 'parade' | 'custom';
  /** Display name */
  name: string;
  /** Total width in field-native units (yards for football) */
  width: number;
  /** Total height in field-native units */
  height: number;
  /** Interval for vertical reference lines (yard lines) */
  yardLineInterval: number;
  /** Hash mark positions from sideline */
  hashMarks: { front: number; back: number };
  /** End zone depth (0 for non-football fields) */
  endZoneDepth: number;
  /** Custom reference lines */
  customLines?: { position: number; label: string; orientation: 'horizontal' | 'vertical' }[];
  /** Unit of measurement */
  unit: 'yards' | 'feet' | 'meters' | 'steps';
}

export interface Formation {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  stageWidth: number;
  stageHeight: number;
  gridSize: number;
  performers: Performer[];
  keyframes: Keyframe[];
  sceneObjects?: SceneObject3D[];
  audioTrack?: AudioTrack;
  musicTrackUrl?: string;
  musicDuration?: number;
  drillSettings?: DrillSettings;
  /** Drill sets (maps 1:1 to keyframes for count-based workflow) */
  sets?: DrillSet[];
  /** Field configuration for coordinate calculations */
  fieldConfig?: FieldConfig;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ExportProgress {
  phase: 'rendering' | 'encoding' | 'done';
  percent: number;
}

export interface FormationExportOptions {
  format: 'pdf' | 'png' | 'jpg' | 'svg' | 'video' | 'gif';
  includeGrid: boolean;
  includeLabels: boolean;
  includeTimestamps: boolean;
  paperSize?: 'letter' | 'a4' | 'tabloid';
  orientation?: 'portrait' | 'landscape';
  quality?: number;
  fps?: number;
  resolution?: { width: number; height: number };
  includeFieldOverlay?: boolean;
  onProgress?: (progress: ExportProgress) => void;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loop: boolean;
  speed: number;
}

// Re-export 3D scene types for convenience
export type {
  Position3D,
  SceneObject,
  Scene3DTool,
  FormationViewMode,
} from './scene3d/types';
