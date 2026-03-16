/**
 * useScenePanels - Scene panel visibility state
 *
 * Extracted from useScene3D to reduce re-renders for consumers
 * that only need panel open/close state.
 */

import { useStore } from '../store/store';

export function useScenePanels() {
  const scene3d = useStore((state) => state.scene3d);

  return {
    isObjectEditorOpen: scene3d.isObjectEditorOpen,
    isPropLibraryOpen: scene3d.isPropLibraryOpen,
    isModelImporterOpen: scene3d.isModelImporterOpen,
    isPrimitiveBuilderOpen: scene3d.isPrimitiveBuilderOpen,
    setObjectEditorOpen: scene3d.setObjectEditorOpen,
    setPropLibraryOpen: scene3d.setPropLibraryOpen,
    setModelImporterOpen: scene3d.setModelImporterOpen,
    setPrimitiveBuilderOpen: scene3d.setPrimitiveBuilderOpen,
  };
}
