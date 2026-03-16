/**
 * useSceneObjects - Scene object CRUD operations
 *
 * Extracted from useScene3D to reduce re-renders for consumers
 * that only need object manipulation.
 */

import { useCallback } from 'react';
import { useStore } from '../../store/store';
import type {
  SceneObject,
  Position3D,
  PrimitiveShape,
  PrimitiveSource,
  PropSource,
  MaterialConfig,
  PrimitiveDimensions,
} from '../../services/scene3d/types';
import { DEFAULT_MATERIAL } from '../../services/scene3d/types';

function generateId(): string {
  return `obj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_DIMENSIONS: Record<PrimitiveShape, PrimitiveDimensions> = {
  box: { width: 2, height: 2, depth: 2 },
  cylinder: { radiusTop: 1, radiusBottom: 1, height: 2, segments: 32 },
  sphere: { radius: 1, segments: 32 },
  cone: { radiusBottom: 1, height: 2, segments: 32 },
  plane: { width: 4, height: 4 },
  torus: { radius: 1, tubeRadius: 0.3, segments: 32 },
};

export function useSceneObjects() {
  const scene3d = useStore((state) => state.scene3d);

  const addPrimitive = useCallback(
    (shape: PrimitiveShape, position?: Partial<Position3D>, material?: Partial<MaterialConfig>) => {
      const now = new Date().toISOString();
      const source: PrimitiveSource = {
        type: 'primitive',
        shape,
        dimensions: { ...DEFAULT_DIMENSIONS[shape] },
        material: { ...DEFAULT_MATERIAL, ...material },
      };
      const obj: SceneObject = {
        id: generateId(),
        name: `${shape.charAt(0).toUpperCase() + shape.slice(1)}`,
        type: 'primitive',
        position: {
          x: 50,
          y: 50,
          z: 0,
          rotation: 0,
          rotationX: 0,
          rotationZ: 0,
          scale: 1,
          ...position,
        },
        source,
        visible: true,
        locked: false,
        layer: Object.keys(scene3d.objects).length,
        createdAt: now,
        updatedAt: now,
      };
      scene3d.addObject(obj);
      return obj.id;
    },
    [scene3d]
  );

  const addProp = useCallback(
    (catalogId: string, position?: Partial<Position3D>, variant?: string) => {
      const now = new Date().toISOString();
      const source: PropSource = { type: 'prop', catalogId, variant };
      const obj: SceneObject = {
        id: generateId(),
        name: catalogId,
        type: 'prop',
        position: {
          x: 50,
          y: 50,
          z: 0,
          rotation: 0,
          scale: 1,
          ...position,
        },
        source,
        visible: true,
        locked: false,
        layer: Object.keys(scene3d.objects).length,
        createdAt: now,
        updatedAt: now,
      };
      scene3d.addObject(obj);
      return obj.id;
    },
    [scene3d]
  );

  const objectList = Object.values(scene3d.objects).sort((a, b) => a.layer - b.layer);

  return {
    objects: scene3d.objects,
    objectList,
    addObject: scene3d.addObject,
    addPrimitive,
    addProp,
    updateObject: scene3d.updateObject,
    removeObject: scene3d.removeObject,
    updateObjectPosition: scene3d.updateObjectPosition,
    toggleObjectVisibility: scene3d.toggleObjectVisibility,
    toggleObjectLock: scene3d.toggleObjectLock,
    clearScene: scene3d.clearScene,
  };
}
