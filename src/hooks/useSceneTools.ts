/**
 * useSceneTools - Scene tool and view mode state
 *
 * Extracted from useScene3D to reduce re-renders for consumers
 * that only need tool/view state.
 */

import { useStore } from '../store/store';

export function useSceneTools() {
  const scene3d = useStore((state) => state.scene3d);

  return {
    activeTool: scene3d.activeTool,
    setActiveTool: scene3d.setActiveTool,
    viewMode: scene3d.viewMode,
    setViewMode: scene3d.setViewMode,
  };
}
