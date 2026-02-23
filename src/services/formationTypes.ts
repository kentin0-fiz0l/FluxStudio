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
}

export type TransitionType = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface Keyframe {
  id: string;
  timestamp: number;
  positions: Map<string, Position>;
  transition?: TransitionType;
  duration?: number;
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
  createdAt: string;
  updatedAt: string;
  createdBy: string;
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
