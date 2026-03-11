/**
 * Canvas Effects Slice - Visual effects state for the formation canvas
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';

// ============================================================================
// Types
// ============================================================================

export type HeatMapMode = 'step_density' | 'collision_risk' | 'audience_visibility';

export interface CanvasEffectsState {
  depthBlurEnabled: boolean;
  sectionGlowEnabled: boolean;
  heatMapEnabled: boolean;
  spotlightEnabled: boolean;
  speedGradientsEnabled: boolean;

  depthBlurIntensity: number; // 0-10, CSS blur px
  sectionGlowIntensity: number; // 0-1, opacity
  heatMapMode: HeatMapMode;
  heatMapOpacity: number; // 0-1
  spotlightDimOpacity: number; // 0-1, how much to dim non-selected
  speedGradientOpacity: number; // 0-1
}

export interface CanvasEffectsActions {
  toggleDepthBlur: () => void;
  toggleSectionGlow: () => void;
  toggleHeatMap: () => void;
  toggleSpotlight: () => void;
  toggleSpeedGradients: () => void;
  setHeatMapMode: (mode: HeatMapMode) => void;
  setDepthBlurIntensity: (intensity: number) => void;
  setHeatMapOpacity: (opacity: number) => void;
  setSectionGlowIntensity: (intensity: number) => void;
  setSpotlightDimOpacity: (opacity: number) => void;
  setSpeedGradientOpacity: (opacity: number) => void;
  resetEffects: () => void;
}

export interface CanvasEffectsSlice {
  canvasEffects: CanvasEffectsState & CanvasEffectsActions;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: CanvasEffectsState = {
  depthBlurEnabled: false,
  sectionGlowEnabled: false,
  heatMapEnabled: false,
  spotlightEnabled: false,
  speedGradientsEnabled: false,

  depthBlurIntensity: 3,
  sectionGlowIntensity: 0.6,
  heatMapMode: 'step_density',
  heatMapOpacity: 0.4,
  spotlightDimOpacity: 0.3,
  speedGradientOpacity: 0.7,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createCanvasEffectsSlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  CanvasEffectsSlice
> = (set) => ({
  canvasEffects: {
    ...initialState,

    toggleDepthBlur: () => {
      set((state) => {
        state.canvasEffects.depthBlurEnabled = !state.canvasEffects.depthBlurEnabled;
      });
    },

    toggleSectionGlow: () => {
      set((state) => {
        state.canvasEffects.sectionGlowEnabled = !state.canvasEffects.sectionGlowEnabled;
      });
    },

    toggleHeatMap: () => {
      set((state) => {
        state.canvasEffects.heatMapEnabled = !state.canvasEffects.heatMapEnabled;
      });
    },

    toggleSpotlight: () => {
      set((state) => {
        state.canvasEffects.spotlightEnabled = !state.canvasEffects.spotlightEnabled;
      });
    },

    toggleSpeedGradients: () => {
      set((state) => {
        state.canvasEffects.speedGradientsEnabled = !state.canvasEffects.speedGradientsEnabled;
      });
    },

    setHeatMapMode: (mode: HeatMapMode) => {
      set((state) => {
        state.canvasEffects.heatMapMode = mode;
      });
    },

    setDepthBlurIntensity: (intensity: number) => {
      set((state) => {
        state.canvasEffects.depthBlurIntensity = Math.max(0, Math.min(10, intensity));
      });
    },

    setHeatMapOpacity: (opacity: number) => {
      set((state) => {
        state.canvasEffects.heatMapOpacity = Math.max(0, Math.min(1, opacity));
      });
    },

    setSectionGlowIntensity: (intensity: number) => {
      set((state) => {
        state.canvasEffects.sectionGlowIntensity = Math.max(0, Math.min(1, intensity));
      });
    },

    setSpotlightDimOpacity: (opacity: number) => {
      set((state) => {
        state.canvasEffects.spotlightDimOpacity = Math.max(0, Math.min(1, opacity));
      });
    },

    setSpeedGradientOpacity: (opacity: number) => {
      set((state) => {
        state.canvasEffects.speedGradientOpacity = Math.max(0, Math.min(1, opacity));
      });
    },

    resetEffects: () => {
      set((state) => {
        Object.assign(state.canvasEffects, initialState);
      });
    },
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

export const useCanvasEffects = () => useStore((state) => state.canvasEffects);
