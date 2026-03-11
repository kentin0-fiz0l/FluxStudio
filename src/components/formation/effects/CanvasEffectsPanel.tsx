/**
 * CanvasEffectsPanel - Floating toggle panel for canvas visual effects.
 */

import React, { useCallback } from 'react';
import { useCanvasEffects } from '../../../store/slices/canvasEffectsSlice';
import type { HeatMapMode } from '../../../store/slices/canvasEffectsSlice';

interface ToggleRowProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}

function ToggleRow({ label, enabled, onToggle }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between py-1 cursor-pointer">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  visible: boolean;
}

function SliderRow({ label, value, min, max, step, onChange, visible }: SliderRowProps) {
  if (!visible) return null;
  return (
    <div className="pl-2 py-0.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {max <= 1 ? Math.round(value * 100) + '%' : value.toFixed(0)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
    </div>
  );
}

export const CanvasEffectsPanel = React.memo(function CanvasEffectsPanel() {
  const effects = useCanvasEffects();

  const handleHeatMapModeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      effects.setHeatMapMode(e.target.value as HeatMapMode);
    },
    [effects],
  );

  return (
    <div className="absolute top-2 right-2 z-50 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Visual Effects
        </h3>
        <button
          onClick={effects.resetEffects}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-700">
        {/* Depth Blur */}
        <div className="pb-1">
          <ToggleRow label="Depth Blur" enabled={effects.depthBlurEnabled} onToggle={effects.toggleDepthBlur} />
          <SliderRow
            label="Intensity"
            value={effects.depthBlurIntensity}
            min={0} max={10} step={0.5}
            onChange={effects.setDepthBlurIntensity}
            visible={effects.depthBlurEnabled}
          />
        </div>

        {/* Section Glow */}
        <div className="py-1">
          <ToggleRow label="Section Glow" enabled={effects.sectionGlowEnabled} onToggle={effects.toggleSectionGlow} />
          <SliderRow
            label="Intensity"
            value={effects.sectionGlowIntensity}
            min={0} max={1} step={0.05}
            onChange={effects.setSectionGlowIntensity}
            visible={effects.sectionGlowEnabled}
          />
        </div>

        {/* Heat Map */}
        <div className="py-1">
          <ToggleRow label="Heat Map" enabled={effects.heatMapEnabled} onToggle={effects.toggleHeatMap} />
          {effects.heatMapEnabled && (
            <>
              <div className="pl-2 py-0.5">
                <select
                  value={effects.heatMapMode}
                  onChange={handleHeatMapModeChange}
                  className="w-full text-xs bg-gray-100 dark:bg-gray-700 border-none rounded px-2 py-1 text-gray-700 dark:text-gray-300"
                >
                  <option value="step_density">Step Density</option>
                  <option value="collision_risk">Collision Risk</option>
                  <option value="audience_visibility">Audience Visibility</option>
                </select>
              </div>
              <SliderRow
                label="Opacity"
                value={effects.heatMapOpacity}
                min={0} max={1} step={0.05}
                onChange={effects.setHeatMapOpacity}
                visible
              />
            </>
          )}
        </div>

        {/* Spotlight */}
        <div className="py-1">
          <ToggleRow label="Spotlight" enabled={effects.spotlightEnabled} onToggle={effects.toggleSpotlight} />
          <SliderRow
            label="Dim Amount"
            value={effects.spotlightDimOpacity}
            min={0} max={1} step={0.05}
            onChange={effects.setSpotlightDimOpacity}
            visible={effects.spotlightEnabled}
          />
        </div>

        {/* Speed Gradients */}
        <div className="pt-1">
          <ToggleRow label="Speed Gradients" enabled={effects.speedGradientsEnabled} onToggle={effects.toggleSpeedGradients} />
          <SliderRow
            label="Opacity"
            value={effects.speedGradientOpacity}
            min={0} max={1} step={0.05}
            onChange={effects.setSpeedGradientOpacity}
            visible={effects.speedGradientsEnabled}
          />
        </div>
      </div>
    </div>
  );
});
