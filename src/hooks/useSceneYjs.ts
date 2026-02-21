/**
 * useSceneYjs Hook
 *
 * Provides real-time collaborative editing for 3D scene objects using Yjs CRDTs.
 * Mirrors the useFormationYjs pattern but for scene objects within a formation.
 *
 * Extends the same Y.Doc used by useFormationYjs with a `scene:objects` Y.Map.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import type { SceneObject, Position3D } from '../services/scene3d/types';

// ============================================================================
// Constants
// ============================================================================

export const SCENE_YJS_TYPES = {
  OBJECTS: 'scene:objects',
} as const;

// ============================================================================
// Types
// ============================================================================

export interface UseSceneYjsOptions {
  /** The Yjs document (shared with useFormationYjs) */
  doc: Y.Doc | null;
  /** Whether Yjs collaboration is enabled */
  enabled: boolean;
  /** Callback when scene objects change */
  onUpdate?: (objects: Record<string, SceneObject>) => void;
}

export interface UseSceneYjsResult {
  /** All scene objects */
  objects: Record<string, SceneObject>;
  /** Add a new scene object */
  addObject(object: SceneObject): void;
  /** Update an existing object */
  updateObject(id: string, updates: Partial<Omit<SceneObject, 'id'>>): void;
  /** Remove a scene object */
  removeObject(id: string): void;
  /** Update just the position of an object */
  updatePosition(id: string, position: Partial<Position3D>): void;
  /** Is Yjs syncing scene data */
  isSynced: boolean;
}

// ============================================================================
// Conversion helpers
// ============================================================================

function sceneObjectToYMap(object: SceneObject, yMap: Y.Map<unknown>): void {
  yMap.set('id', object.id);
  yMap.set('name', object.name);
  yMap.set('type', object.type);
  yMap.set('position', object.position);
  yMap.set('source', object.source);
  yMap.set('visible', object.visible);
  yMap.set('locked', object.locked);
  yMap.set('layer', object.layer);
  yMap.set('createdAt', object.createdAt);
  yMap.set('updatedAt', object.updatedAt);
  if (object.attachedToPerformerId) {
    yMap.set('attachedToPerformerId', object.attachedToPerformerId);
  }
}

function yMapToSceneObject(yMap: Y.Map<unknown>): SceneObject {
  return {
    id: yMap.get('id') as string,
    name: yMap.get('name') as string,
    type: yMap.get('type') as SceneObject['type'],
    position: yMap.get('position') as Position3D,
    source: yMap.get('source') as SceneObject['source'],
    attachedToPerformerId: yMap.get('attachedToPerformerId') as string | undefined,
    visible: (yMap.get('visible') as boolean) ?? true,
    locked: (yMap.get('locked') as boolean) ?? false,
    layer: (yMap.get('layer') as number) ?? 0,
    createdAt: yMap.get('createdAt') as string,
    updatedAt: yMap.get('updatedAt') as string,
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useSceneYjs({ doc, enabled, onUpdate }: UseSceneYjsOptions): UseSceneYjsResult {
  const [objects, setObjects] = useState<Record<string, SceneObject>>({});
  const [isSynced, setIsSynced] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // Get or create the scene:objects Y.Map
  const getObjectsMap = useCallback((): Y.Map<Y.Map<unknown>> | null => {
    if (!doc || !enabled) return null;
    return doc.getMap(SCENE_YJS_TYPES.OBJECTS) as Y.Map<Y.Map<unknown>>;
  }, [doc, enabled]);

  // Rebuild local state from Yjs
  const syncFromYjs = useCallback(() => {
    const yObjects = getObjectsMap();
    if (!yObjects) return;

    const result: Record<string, SceneObject> = {};
    yObjects.forEach((yMap, id) => {
      try {
        result[id] = yMapToSceneObject(yMap);
      } catch {
        // Skip malformed entries
      }
    });

    setObjects(result);
    onUpdateRef.current?.(result);
  }, [getObjectsMap]);

  // Observe Yjs changes
  useEffect(() => {
    if (!doc || !enabled) return;

    const yObjects = getObjectsMap();
    if (!yObjects) return;

    // Initial sync
    syncFromYjs();
    setIsSynced(true);

    // Deep observe: fires on any change within the map or its nested maps
    const observer = () => {
      syncFromYjs();
    };

    yObjects.observeDeep(observer);

    return () => {
      yObjects.unobserveDeep(observer);
    };
  }, [doc, enabled, getObjectsMap, syncFromYjs]);

  // ---- Mutations ----

  const addObject = useCallback(
    (object: SceneObject) => {
      const yObjects = getObjectsMap();
      if (!yObjects || !doc) return;

      doc.transact(() => {
        const yMap = new Y.Map<unknown>();
        sceneObjectToYMap(object, yMap);
        yObjects.set(object.id, yMap);
      });
    },
    [doc, getObjectsMap]
  );

  const updateObject = useCallback(
    (id: string, updates: Partial<Omit<SceneObject, 'id'>>) => {
      const yObjects = getObjectsMap();
      if (!yObjects || !doc) return;

      const yMap = yObjects.get(id);
      if (!yMap) return;

      doc.transact(() => {
        for (const [key, value] of Object.entries(updates)) {
          yMap.set(key, value);
        }
        yMap.set('updatedAt', new Date().toISOString());
      });
    },
    [doc, getObjectsMap]
  );

  const removeObject = useCallback(
    (id: string) => {
      const yObjects = getObjectsMap();
      if (!yObjects || !doc) return;

      doc.transact(() => {
        yObjects.delete(id);
      });
    },
    [doc, getObjectsMap]
  );

  const updatePosition = useCallback(
    (id: string, position: Partial<Position3D>) => {
      const yObjects = getObjectsMap();
      if (!yObjects || !doc) return;

      const yMap = yObjects.get(id);
      if (!yMap) return;

      doc.transact(() => {
        const currentPos = yMap.get('position') as Position3D;
        yMap.set('position', { ...currentPos, ...position });
        yMap.set('updatedAt', new Date().toISOString());
      });
    },
    [doc, getObjectsMap]
  );

  return {
    objects,
    addObject,
    updateObject,
    removeObject,
    updatePosition,
    isSynced,
  };
}
