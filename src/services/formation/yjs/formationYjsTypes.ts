/**
 * Formation Yjs Types - CRDT Document Structure
 *
 * Defines the Yjs shared types for real-time collaborative formation editing.
 * Uses Y.Map and Y.Array for conflict-free concurrent editing.
 */

import * as Y from 'yjs';
import type { Position, Performer, Keyframe, TransitionType, AudioTrack } from '../../formationService';

// ============================================================================
// Yjs Document Structure
// ============================================================================

/**
 * Yjs document structure for formations:
 *
 * Y.Doc
 * ├── meta (Y.Map)                         - Formation metadata
 * │   ├── id: string
 * │   ├── name: string
 * │   ├── projectId: string
 * │   ├── description: string
 * │   ├── stageWidth: number
 * │   ├── stageHeight: number
 * │   ├── gridSize: number
 * │   └── audioTrack: AudioTrack | null
 * │
 * ├── performers (Y.Map<string, Y.Map>)    - Keyed by performer ID
 * │   └── [performerId]: Y.Map
 * │       ├── id: string
 * │       ├── name: string
 * │       ├── label: string
 * │       ├── color: string
 * │       └── group?: string
 * │
 * └── keyframes (Y.Array<Y.Map>)           - Ordered array of keyframes
 *     └── [index]: Y.Map
 *         ├── id: string
 *         ├── timestamp: number
 *         ├── transition: string
 *         ├── duration: number
 *         └── positions (Y.Map<string, Position>)
 *             └── [performerId]: { x, y, rotation }
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Position data stored in Yjs
 */
export interface YjsPosition {
  x: number;
  y: number;
  rotation?: number;
}

/**
 * Performer data stored in Yjs Y.Map
 */
export interface YjsPerformer {
  id: string;
  name: string;
  label: string;
  color: string;
  group?: string;
}

/**
 * Keyframe data structure in Yjs
 */
export interface YjsKeyframe {
  id: string;
  timestamp: number;
  transition: TransitionType;
  duration: number;
  // positions are stored as a nested Y.Map
}

/**
 * Formation metadata stored in Yjs Y.Map
 */
export interface YjsFormationMeta {
  id: string;
  name: string;
  projectId: string;
  description?: string;
  stageWidth: number;
  stageHeight: number;
  gridSize: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Audio track data in Yjs
 */
export interface YjsAudioTrack {
  id: string;
  url: string;
  filename: string;
  duration: number; // in milliseconds
  waveformData?: number[];
}

// ============================================================================
// Awareness State (Presence)
// ============================================================================

/**
 * User presence state for formation collaboration
 */
export interface FormationAwarenessState {
  user: {
    id: string;
    name: string;
    color: string;
    avatar?: string;
  };
  /** Cursor position normalized 0-100 on stage */
  cursor?: {
    x: number;
    y: number;
    timestamp: number;
  };
  /** Currently selected performer IDs */
  selectedPerformerIds?: string[];
  /** Performer being dragged (for conflict prevention) */
  draggingPerformerId?: string;
  /** 3D cursor position (for 3D view collaboration) */
  cursor3D?: {
    x: number;
    y: number;
    z: number;
    timestamp: number;
  };
  /** Scene object being dragged (for 3D conflict prevention) */
  draggingObjectId?: string;
  /** Current keyframe being edited */
  activeKeyframeId?: string;
  /** Is user actively editing */
  isActive: boolean;
  /** Last activity timestamp */
  lastActivity: number;
}

// ============================================================================
// Helper Types for Yjs Operations
// ============================================================================

/**
 * Yjs shared type aliases for type safety
 */
export type YFormationMeta = Y.Map<unknown>;
export type YPerformers = Y.Map<Y.Map<unknown>>;
export type YKeyframes = Y.Array<Y.Map<unknown>>;
export type YPositions = Y.Map<YjsPosition>;

/**
 * Full Yjs formation document type
 */
export interface FormationYjsDoc {
  meta: YFormationMeta;
  performers: YPerformers;
  keyframes: YKeyframes;
  sceneObjects: Y.Map<Y.Map<unknown>>;
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Convert a Yjs performer map to a Performer object
 */
export function yMapToPerformer(yMap: Y.Map<unknown>): Performer {
  return {
    id: yMap.get('id') as string,
    name: yMap.get('name') as string,
    label: yMap.get('label') as string,
    color: yMap.get('color') as string,
    group: yMap.get('group') as string | undefined,
  };
}

/**
 * Convert a Performer object to Yjs map entries
 */
export function performerToYMapEntries(performer: Performer): [string, unknown][] {
  const entries: [string, unknown][] = [
    ['id', performer.id],
    ['name', performer.name],
    ['label', performer.label],
    ['color', performer.color],
  ];
  if (performer.group) {
    entries.push(['group', performer.group]);
  }
  return entries;
}

/**
 * Convert a Yjs keyframe map to a Keyframe object
 */
export function yMapToKeyframe(yMap: Y.Map<unknown>): Keyframe {
  const positionsMap = yMap.get('positions') as Y.Map<YjsPosition> | undefined;
  const positions = new Map<string, Position>();

  if (positionsMap) {
    positionsMap.forEach((pos, performerId) => {
      positions.set(performerId, {
        x: pos.x,
        y: pos.y,
        rotation: pos.rotation ?? 0,
      });
    });
  }

  return {
    id: yMap.get('id') as string,
    timestamp: yMap.get('timestamp') as number,
    transition: (yMap.get('transition') as TransitionType) || 'linear',
    duration: yMap.get('duration') as number || 500,
    positions,
  };
}

/**
 * Convert a Keyframe object to Yjs map entries
 */
export function keyframeToYMapEntries(keyframe: Keyframe): [string, unknown][] {
  return [
    ['id', keyframe.id],
    ['timestamp', keyframe.timestamp],
    ['transition', keyframe.transition],
    ['duration', keyframe.duration],
    // positions are handled separately as a nested Y.Map
  ];
}

/**
 * Convert formation metadata from Yjs to plain object
 */
export function yMapToFormationMeta(yMap: Y.Map<unknown>): YjsFormationMeta {
  return {
    id: yMap.get('id') as string,
    name: yMap.get('name') as string,
    projectId: yMap.get('projectId') as string,
    description: yMap.get('description') as string | undefined,
    stageWidth: yMap.get('stageWidth') as number || 40,
    stageHeight: yMap.get('stageHeight') as number || 30,
    gridSize: yMap.get('gridSize') as number || 5,
    createdBy: yMap.get('createdBy') as string | undefined,
    createdAt: yMap.get('createdAt') as string | undefined,
    updatedAt: yMap.get('updatedAt') as string | undefined,
  };
}

/**
 * Convert audio track from Yjs to AudioTrack
 */
export function yMapToAudioTrack(yMap: Y.Map<unknown> | undefined): AudioTrack | undefined {
  if (!yMap) return undefined;

  return {
    id: yMap.get('id') as string,
    url: yMap.get('url') as string,
    filename: yMap.get('filename') as string,
    duration: yMap.get('duration') as number,
    waveformData: yMap.get('waveformData') as number[] | undefined,
  };
}

// ============================================================================
// Room Name Utilities
// ============================================================================

/**
 * Generate a room name for formation collaboration
 * Format: project-{projectId}-formation-{formationId}
 */
export function getFormationRoomName(projectId: string, formationId: string): string {
  return `project-${projectId}-formation-${formationId}`;
}

/**
 * Parse a room name to extract project and formation IDs
 */
export function parseFormationRoomName(roomName: string): { projectId: string; formationId: string } | null {
  const match = roomName.match(/^project-([^-]+)-formation-(.+)$/);
  if (!match) return null;
  return {
    projectId: match[1],
    formationId: match[2],
  };
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Yjs shared type names for consistency
 */
export const FORMATION_YJS_TYPES = {
  META: 'formation:meta',
  PERFORMERS: 'formation:performers',
  KEYFRAMES: 'formation:keyframes',
  POSITIONS: 'formation:positions',
  AUDIO: 'audioTrack',
  SCENE_OBJECTS: 'scene:objects',
} as const;

/**
 * User colors for awareness visualization
 */
export const COLLABORATION_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Sky
  '#F8B500', // Orange
  '#00CED1', // Dark Cyan
] as const;

/**
 * Get a consistent color for a user based on their ID
 */
export function getUserColor(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return COLLABORATION_COLORS[Math.abs(hash) % COLLABORATION_COLORS.length];
}
