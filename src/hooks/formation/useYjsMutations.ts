/**
 * useYjsMutations — Entity mutation functions for Yjs formation documents.
 *
 * Extracted from useFormationYjs to keep each file under 600 lines.
 * Handles: meta, performers, keyframes, positions, path curves, and audio tracks.
 */

import { useCallback, type MutableRefObject } from 'react';
import * as Y from 'yjs';
import type {
  Formation,
  Performer,
  Keyframe,
  Position,
  AudioTrack,
  TransitionType,
} from '@/services/formationService';
import type { PathCurve } from '@/services/formationTypes';
import {
  FORMATION_YJS_TYPES,
  performerToYMapEntries,
  keyframeToYMapEntries,
  type YjsPosition,
} from '@/services/formation/yjs/formationYjsTypes';
import type { BatchingManager } from '@/services/formation/yjs/batchingManager';

interface UseYjsMutationsRefs {
  docRef: MutableRefObject<Y.Doc | null>;
  batcherRef: MutableRefObject<BatchingManager | null>;
}

export function useYjsMutations({ docRef, batcherRef }: UseYjsMutationsRefs) {
  const updateMeta = useCallback((updates: Partial<Pick<Formation, 'name' | 'description' | 'stageWidth' | 'stageHeight' | 'gridSize'>>) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const meta = ydoc.getMap(FORMATION_YJS_TYPES.META);

    ydoc.transact(() => {
      if (updates.name !== undefined) meta.set('name', updates.name);
      if (updates.description !== undefined) meta.set('description', updates.description);
      if (updates.stageWidth !== undefined) meta.set('stageWidth', updates.stageWidth);
      if (updates.stageHeight !== undefined) meta.set('stageHeight', updates.stageHeight);
      if (updates.gridSize !== undefined) meta.set('gridSize', updates.gridSize);
      meta.set('updatedAt', new Date().toISOString());
    });
  }, [docRef]);

  const addPerformer = useCallback((performerData: Omit<Performer, 'id'>, initialPosition?: Position): Performer => {
    const ydoc = docRef.current;
    if (!ydoc) throw new Error('Yjs document not initialized');

    const performers = ydoc.getMap(FORMATION_YJS_TYPES.PERFORMERS);
    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    const performer: Performer = {
      ...performerData,
      id: `performer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    ydoc.transact(() => {
      const yPerformer = new Y.Map();
      performerToYMapEntries(performer).forEach(([key, value]) => {
        yPerformer.set(key, value);
      });
      performers.set(performer.id, yPerformer);

      if (initialPosition && keyframes.length > 0) {
        const yKeyframe = keyframes.get(0) as Y.Map<unknown>;
        const positions = yKeyframe.get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<YjsPosition>;
        if (positions) {
          positions.set(performer.id, {
            x: initialPosition.x,
            y: initialPosition.y,
            rotation: initialPosition.rotation ?? 0,
          });
        }
      }
    });

    return performer;
  }, [docRef]);

  const updatePerformer = useCallback((performerId: string, updates: Partial<Omit<Performer, 'id'>>) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const performers = ydoc.getMap(FORMATION_YJS_TYPES.PERFORMERS);
    const yPerformer = performers.get(performerId) as Y.Map<unknown> | undefined;
    if (!yPerformer) return;

    ydoc.transact(() => {
      if (updates.name !== undefined) yPerformer.set('name', updates.name);
      if (updates.label !== undefined) yPerformer.set('label', updates.label);
      if (updates.color !== undefined) yPerformer.set('color', updates.color);
      if (updates.group !== undefined) yPerformer.set('group', updates.group);
      if (updates.instrument !== undefined) yPerformer.set('instrument', updates.instrument);
      if (updates.section !== undefined) yPerformer.set('section', updates.section);
      if (updates.drillNumber !== undefined) yPerformer.set('drillNumber', updates.drillNumber);
    });
  }, [docRef]);

  const removePerformer = useCallback((performerId: string) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const performers = ydoc.getMap(FORMATION_YJS_TYPES.PERFORMERS);
    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    ydoc.transact(() => {
      performers.delete(performerId);

      keyframes.forEach((yKeyframe) => {
        const positions = (yKeyframe as Y.Map<unknown>).get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<YjsPosition>;
        if (positions) {
          positions.delete(performerId);
        }
      });
    });
  }, [docRef]);

  const addKeyframe = useCallback((timestamp: number, positions?: Map<string, Position>): Keyframe => {
    const ydoc = docRef.current;
    if (!ydoc) throw new Error('Yjs document not initialized');

    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
    const performers = ydoc.getMap(FORMATION_YJS_TYPES.PERFORMERS);

    const keyframe: Keyframe = {
      id: `keyframe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      transition: 'linear' as TransitionType,
      duration: 500,
      positions: positions || new Map(),
    };

    ydoc.transact(() => {
      const yKeyframe = new Y.Map();
      keyframeToYMapEntries(keyframe).forEach(([key, value]) => {
        yKeyframe.set(key, value);
      });

      const yPositions = new Y.Map();

      if (positions) {
        positions.forEach((pos, performerId) => {
          yPositions.set(performerId, { x: pos.x, y: pos.y, rotation: pos.rotation ?? 0 });
        });
      } else {
        performers.forEach((_, performerId) => {
          yPositions.set(performerId as string, { x: 50, y: 50, rotation: 0 });
        });
      }

      yKeyframe.set(FORMATION_YJS_TYPES.POSITIONS, yPositions);

      let insertIndex = keyframes.length;
      for (let i = 0; i < keyframes.length; i++) {
        const kf = keyframes.get(i) as Y.Map<unknown>;
        if ((kf.get('timestamp') as number) > timestamp) {
          insertIndex = i;
          break;
        }
      }

      keyframes.insert(insertIndex, [yKeyframe]);
    });

    return keyframe;
  }, [docRef]);

  const updateKeyframe = useCallback((keyframeId: string, updates: Partial<Omit<Keyframe, 'id' | 'positions'>>) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    ydoc.transact(() => {
      for (let i = 0; i < keyframes.length; i++) {
        const yKeyframe = keyframes.get(i) as Y.Map<unknown>;
        if (yKeyframe.get('id') === keyframeId) {
          if (updates.timestamp !== undefined) yKeyframe.set('timestamp', updates.timestamp);
          if (updates.transition !== undefined) yKeyframe.set('transition', updates.transition);
          if (updates.duration !== undefined) yKeyframe.set('duration', updates.duration);
          break;
        }
      }
    });
  }, [docRef]);

  const removeKeyframe = useCallback((keyframeId: string) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    ydoc.transact(() => {
      for (let i = 0; i < keyframes.length; i++) {
        const yKeyframe = keyframes.get(i) as Y.Map<unknown>;
        if (yKeyframe.get('id') === keyframeId) {
          keyframes.delete(i, 1);
          break;
        }
      }
    });
  }, [docRef]);

  const updatePosition = useCallback((keyframeId: string, performerId: string, position: Position) => {
    const batcher = batcherRef.current;
    if (batcher) {
      batcher.enqueue(keyframeId, performerId, {
        x: position.x,
        y: position.y,
        rotation: position.rotation ?? 0,
      });
      return;
    }

    const ydoc = docRef.current;
    if (!ydoc) return;

    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    ydoc.transact(() => {
      for (let i = 0; i < keyframes.length; i++) {
        const yKeyframe = keyframes.get(i) as Y.Map<unknown>;
        if (yKeyframe.get('id') === keyframeId) {
          const positions = yKeyframe.get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<YjsPosition>;
          if (positions) {
            positions.set(performerId, {
              x: position.x,
              y: position.y,
              rotation: position.rotation ?? 0,
            });
          }
          break;
        }
      }
    });
  }, [docRef, batcherRef]);

  const updatePositions = useCallback((keyframeId: string, positions: Map<string, Position>) => {
    const batcher = batcherRef.current;
    if (batcher) {
      const batchMap = new Map<string, { x: number; y: number; rotation: number }>();
      positions.forEach((pos, performerId) => {
        batchMap.set(performerId, {
          x: pos.x,
          y: pos.y,
          rotation: pos.rotation ?? 0,
        });
      });
      batcher.enqueueBatch(keyframeId, batchMap);
      return;
    }

    const ydoc = docRef.current;
    if (!ydoc) return;

    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    ydoc.transact(() => {
      for (let i = 0; i < keyframes.length; i++) {
        const yKeyframe = keyframes.get(i) as Y.Map<unknown>;
        if (yKeyframe.get('id') === keyframeId) {
          const yPositions = yKeyframe.get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<YjsPosition>;
          if (yPositions) {
            positions.forEach((pos, performerId) => {
              yPositions.set(performerId, {
                x: pos.x,
                y: pos.y,
                rotation: pos.rotation ?? 0,
              });
            });
          }
          break;
        }
      }
    });
  }, [docRef, batcherRef]);

  const updatePathCurve = useCallback((keyframeId: string, performerId: string, curve: PathCurve) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    ydoc.transact(() => {
      for (let i = 0; i < keyframes.length; i++) {
        const yKeyframe = keyframes.get(i) as Y.Map<unknown>;
        if (yKeyframe.get('id') === keyframeId) {
          let yPathCurves = yKeyframe.get('pathCurves') as Y.Map<unknown> | undefined;
          if (!yPathCurves) {
            yPathCurves = new Y.Map();
            yKeyframe.set('pathCurves', yPathCurves);
          }
          const yCurve = new Y.Map();
          yCurve.set('cp1', { x: curve.cp1.x, y: curve.cp1.y });
          yCurve.set('cp2', { x: curve.cp2.x, y: curve.cp2.y });
          if (curve.easingControlPoints) {
            yCurve.set('easingControlPoints', { ...curve.easingControlPoints });
          }
          yPathCurves.set(performerId, yCurve);
          break;
        }
      }
    });
  }, [docRef]);

  const batchUpdatePathCurves = useCallback((keyframeId: string, updates: Map<string, PathCurve>) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    ydoc.transact(() => {
      for (let i = 0; i < keyframes.length; i++) {
        const yKeyframe = keyframes.get(i) as Y.Map<unknown>;
        if (yKeyframe.get('id') === keyframeId) {
          let yPathCurves = yKeyframe.get('pathCurves') as Y.Map<unknown> | undefined;
          if (!yPathCurves) {
            yPathCurves = new Y.Map();
            yKeyframe.set('pathCurves', yPathCurves);
          }
          updates.forEach((curve, performerId) => {
            const yCurve = new Y.Map();
            yCurve.set('cp1', { x: curve.cp1.x, y: curve.cp1.y });
            yCurve.set('cp2', { x: curve.cp2.x, y: curve.cp2.y });
            if (curve.easingControlPoints) {
              yCurve.set('easingControlPoints', { ...curve.easingControlPoints });
            }
            yPathCurves!.set(performerId, yCurve);
          });
          break;
        }
      }
    });
  }, [docRef]);

  const setAudioTrack = useCallback((audioTrack: AudioTrack | null) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const meta = ydoc.getMap(FORMATION_YJS_TYPES.META);

    ydoc.transact(() => {
      if (audioTrack) {
        const audioMap = new Y.Map();
        audioMap.set('id', audioTrack.id);
        audioMap.set('url', audioTrack.url);
        audioMap.set('filename', audioTrack.filename);
        audioMap.set('duration', audioTrack.duration);
        if (audioTrack.waveformData) {
          audioMap.set('waveformData', audioTrack.waveformData);
        }
        meta.set(FORMATION_YJS_TYPES.AUDIO, audioMap);
      } else {
        meta.delete(FORMATION_YJS_TYPES.AUDIO);
      }
      meta.set('updatedAt', new Date().toISOString());
    });
  }, [docRef]);

  return {
    updateMeta,
    addPerformer,
    updatePerformer,
    removePerformer,
    addKeyframe,
    updateKeyframe,
    removeKeyframe,
    updatePosition,
    updatePositions,
    updatePathCurve,
    batchUpdatePathCurves,
    setAudioTrack,
  };
}
