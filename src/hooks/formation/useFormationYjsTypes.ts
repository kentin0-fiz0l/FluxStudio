/**
 * Type definitions for useFormationYjs hook.
 *
 * Extracted to avoid circular imports and keep the main hook file focused.
 */

import type * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';
import type {
  Formation,
  Performer,
  Keyframe,
  Position,
  AudioTrack,
  DrillSet,
} from '@/services/formationService';
import type { PathCurve } from '@/services/formationTypes';
import type { FormationAwarenessState } from '@/services/formation/yjs/formationYjsTypes';

/** Conflict event types for UX-level conflict detection */
export type ConflictType =
  | 'simultaneous-move'
  | 'performer-deleted'
  | 'keyframe-deleted';

/** Represents a detected UX-level conflict */
export interface ConflictEvent {
  id: string;
  entityId: string;
  type: ConflictType;
  timestamp: number;
  remoteUserId?: string;
}

export interface UseFormationYjsOptions {
  projectId: string;
  formationId: string;
  enabled?: boolean;
  initialData?: Formation;
  onUpdate?: (formation: Formation) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export interface UseFormationYjsResult {
  formation: Formation | null;
  isConnected: boolean;
  isSyncing: boolean;
  error: string | null;
  collaborators: FormationAwarenessState[];
  hasPendingChanges: boolean;
  lastSyncedAt: number | null;
  doc: Y.Doc | null;
  provider: WebsocketProvider | null;

  // Mutation functions
  updateMeta: (updates: Partial<Pick<Formation, 'name' | 'description' | 'stageWidth' | 'stageHeight' | 'gridSize'>>) => void;
  addPerformer: (performer: Omit<Performer, 'id'>, initialPosition?: Position) => Performer;
  updatePerformer: (performerId: string, updates: Partial<Omit<Performer, 'id'>>) => void;
  removePerformer: (performerId: string) => void;
  addKeyframe: (timestamp: number, positions?: Map<string, Position>) => Keyframe;
  updateKeyframe: (keyframeId: string, updates: Partial<Omit<Keyframe, 'id' | 'positions'>>) => void;
  removeKeyframe: (keyframeId: string) => void;
  updatePosition: (keyframeId: string, performerId: string, position: Position) => void;
  updatePositions: (keyframeId: string, positions: Map<string, Position>) => void;
  updatePathCurve: (keyframeId: string, performerId: string, curve: PathCurve) => void;
  batchUpdatePathCurves: (keyframeId: string, updates: Map<string, PathCurve>) => void;
  setAudioTrack: (audioTrack: AudioTrack | null) => void;
  addSet: (keyframeId: string, counts: number, options?: Partial<Pick<DrillSet, 'name' | 'label' | 'notes' | 'rehearsalMark'>>) => DrillSet;
  updateSet: (setId: string, updates: Partial<Omit<DrillSet, 'id'>>) => void;
  removeSet: (setId: string) => void;
  reorderSets: (fromIndex: number, toIndex: number) => void;

  // Awareness functions
  updateCursor: (x: number, y: number) => void;
  clearCursor: () => void;
  setSelectedPerformers: (performerIds: string[]) => void;
  setDraggingPerformer: (performerId: string | null) => void;
  setActiveKeyframe: (keyframeId: string | null) => void;
  isPerformerBeingDragged: (performerId: string) => { dragging: boolean; by?: FormationAwarenessState };

  // Y.UndoManager
  undoManager: Y.UndoManager | null;
  yUndo: () => void;
  yRedo: () => void;
  canYUndo: boolean;
  canYRedo: boolean;

  // Document size
  documentSize: number;

  // Conflict tracking
  conflicts: ConflictEvent[];
  clearConflict: (conflictId: string) => void;
}
