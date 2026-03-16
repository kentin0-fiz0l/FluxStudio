/**
 * useSceneSettings - Scene rendering settings
 *
 * Extracted from useScene3D to reduce re-renders for consumers
 * that only need scene settings (grid, labels, shadows, etc.).
 */

import { useStore } from '../../store/store';

export function useSceneSettings() {
  const scene3d = useStore((state) => state.scene3d);

  return {
    settings: scene3d.settings,
    updateSettings: scene3d.updateSettings,
  };
}
