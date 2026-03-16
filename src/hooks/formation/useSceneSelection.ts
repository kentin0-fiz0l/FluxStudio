/**
 * useSceneSelection - Scene selection state
 *
 * Extracted from useScene3D to reduce re-renders for consumers
 * that only need selection state.
 */

import { useCallback } from 'react';
import { useStore } from '../../store/store';

export function useSceneSelection() {
  const scene3d = useStore((state) => state.scene3d);

  const selectedObject = scene3d.selectedObjectId
    ? scene3d.objects[scene3d.selectedObjectId] ?? null
    : null;

  const removeSelected = useCallback(() => {
    if (scene3d.selectedObjectId) {
      scene3d.removeObject(scene3d.selectedObjectId);
    }
  }, [scene3d]);

  const duplicateSelected = useCallback(() => {
    if (scene3d.selectedObjectId) {
      return scene3d.duplicateObject(scene3d.selectedObjectId);
    }
    return null;
  }, [scene3d]);

  return {
    selectedObjectId: scene3d.selectedObjectId,
    selectedObject,
    selectObject: scene3d.selectObject,
    removeSelected,
    duplicateSelected,
  };
}
