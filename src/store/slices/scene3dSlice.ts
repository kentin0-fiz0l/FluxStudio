/**
 * Scene 3D Slice - Zustand state for 3D scene objects
 *
 * Manages scene objects, active 3D tool, selection, and view settings.
 */

import { StateCreator } from 'zustand';
import type { FluxStore } from '../store';
import type {
  SceneObject,
  Scene3DTool,
  Scene3DSettings,
  FormationViewMode,
  Position3D,
} from '../../services/scene3d/types';
import { DEFAULT_SCENE_SETTINGS } from '../../services/scene3d/types';

// ============================================================================
// Types
// ============================================================================

export interface Scene3DState {
  objects: Record<string, SceneObject>;
  selectedObjectId: string | null;
  activeTool: Scene3DTool;
  viewMode: FormationViewMode;
  settings: Scene3DSettings;
  isObjectEditorOpen: boolean;
  isPropLibraryOpen: boolean;
  isModelImporterOpen: boolean;
  isPrimitiveBuilderOpen: boolean;
}

export interface Scene3DActions {
  addObject(object: SceneObject): void;
  updateObject(id: string, updates: Partial<Omit<SceneObject, 'id'>>): void;
  removeObject(id: string): void;
  selectObject(id: string | null): void;
  setActiveTool(tool: Scene3DTool): void;
  setViewMode(mode: FormationViewMode): void;
  updateSettings(updates: Partial<Scene3DSettings>): void;
  updateObjectPosition(id: string, position: Partial<Position3D>): void;
  duplicateObject(id: string): string | null;
  toggleObjectVisibility(id: string): void;
  toggleObjectLock(id: string): void;
  setObjectEditorOpen(open: boolean): void;
  setPropLibraryOpen(open: boolean): void;
  setModelImporterOpen(open: boolean): void;
  setPrimitiveBuilderOpen(open: boolean): void;
  clearScene(): void;
}

export interface Scene3DSlice {
  scene3d: Scene3DState & Scene3DActions;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: Scene3DState = {
  objects: {},
  selectedObjectId: null,
  activeTool: 'select',
  viewMode: '2d',
  settings: { ...DEFAULT_SCENE_SETTINGS },
  isObjectEditorOpen: false,
  isPropLibraryOpen: false,
  isModelImporterOpen: false,
  isPrimitiveBuilderOpen: false,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createScene3DSlice: StateCreator<FluxStore, [['zustand/immer', never]], [], Scene3DSlice> = (set, get) => ({
  scene3d: {
    ...initialState,

    addObject(object: SceneObject) {
      set((state) => {
        state.scene3d.objects[object.id] = object;
        state.scene3d.selectedObjectId = object.id;
      });
    },

    updateObject(id: string, updates: Partial<Omit<SceneObject, 'id'>>) {
      set((state) => {
        const obj = state.scene3d.objects[id];
        if (obj) {
          Object.assign(obj, updates, { updatedAt: new Date().toISOString() });
        }
      });
    },

    removeObject(id: string) {
      set((state) => {
        delete state.scene3d.objects[id];
        if (state.scene3d.selectedObjectId === id) {
          state.scene3d.selectedObjectId = null;
        }
      });
    },

    selectObject(id: string | null) {
      set((state) => {
        state.scene3d.selectedObjectId = id;
      });
    },

    setActiveTool(tool: Scene3DTool) {
      set((state) => {
        state.scene3d.activeTool = tool;
      });
    },

    setViewMode(mode: FormationViewMode) {
      set((state) => {
        state.scene3d.viewMode = mode;
      });
    },

    updateSettings(updates: Partial<Scene3DSettings>) {
      set((state) => {
        Object.assign(state.scene3d.settings, updates);
      });
    },

    updateObjectPosition(id: string, position: Partial<Position3D>) {
      set((state) => {
        const obj = state.scene3d.objects[id];
        if (obj) {
          Object.assign(obj.position, position);
          obj.updatedAt = new Date().toISOString();
        }
      });
    },

    duplicateObject(id: string): string | null {
      const obj = get().scene3d.objects[id];
      if (!obj) return null;

      const newId = `obj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const duplicate: SceneObject = {
        ...structuredClone(obj),
        id: newId,
        name: `${obj.name} (copy)`,
        position: {
          ...obj.position,
          x: obj.position.x + 2,
          z: obj.position.z + 2,
        },
        createdAt: now,
        updatedAt: now,
      };

      set((state) => {
        state.scene3d.objects[newId] = duplicate;
        state.scene3d.selectedObjectId = newId;
      });

      return newId;
    },

    toggleObjectVisibility(id: string) {
      set((state) => {
        const obj = state.scene3d.objects[id];
        if (obj) {
          obj.visible = !obj.visible;
        }
      });
    },

    toggleObjectLock(id: string) {
      set((state) => {
        const obj = state.scene3d.objects[id];
        if (obj) {
          obj.locked = !obj.locked;
        }
      });
    },

    setObjectEditorOpen(open: boolean) {
      set((state) => {
        state.scene3d.isObjectEditorOpen = open;
      });
    },

    setPropLibraryOpen(open: boolean) {
      set((state) => {
        state.scene3d.isPropLibraryOpen = open;
      });
    },

    setModelImporterOpen(open: boolean) {
      set((state) => {
        state.scene3d.isModelImporterOpen = open;
      });
    },

    setPrimitiveBuilderOpen(open: boolean) {
      set((state) => {
        state.scene3d.isPrimitiveBuilderOpen = open;
      });
    },

    clearScene() {
      set((state) => {
        state.scene3d.objects = {};
        state.scene3d.selectedObjectId = null;
      });
    },
  },
});
