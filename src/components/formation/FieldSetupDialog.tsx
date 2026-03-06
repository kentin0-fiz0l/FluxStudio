/**
 * FieldSetupDialog - Field type selection and customization
 *
 * Presents a grid of field presets (NCAA, NFL, WGI, Stage, Parade, Custom)
 * with a live SVG preview and custom dimension editing.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { MapPin, Grid, Check, X, Settings } from 'lucide-react';
import type { FieldConfig } from '../../services/formationTypes';
import {
  getFieldPresetList,
  getFieldPreset,
  createCustomField,
  validateFieldConfig,
} from '../../services/fieldConfigService';

// ============================================================================
// TYPES
// ============================================================================

interface FieldSetupDialogProps {
  currentConfig: FieldConfig;
  onApply: (config: FieldConfig) => void;
  onClose: () => void;
}

interface PresetInfo {
  type: FieldConfig['type'];
  name: string;
  description: string;
  icon: React.ReactNode;
}

// ============================================================================
// PRESET CARD ICONS
// ============================================================================

const PRESET_ICONS: Record<FieldConfig['type'], React.ReactNode> = {
  ncaa_football: (
    <svg viewBox="0 0 48 24" className="w-12 h-6">
      <rect x="0" y="0" width="48" height="24" fill="none" stroke="currentColor" strokeWidth="1" rx="1" />
      <line x1="4" y1="0" x2="4" y2="24" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 1" />
      <line x1="44" y1="0" x2="44" y2="24" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 1" />
      <line x1="24" y1="0" x2="24" y2="24" stroke="currentColor" strokeWidth="0.75" />
      {[12, 16, 20, 28, 32, 36].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="24" stroke="currentColor" strokeWidth="0.3" strokeDasharray="1 2" />
      ))}
    </svg>
  ),
  nfl_football: (
    <svg viewBox="0 0 48 24" className="w-12 h-6">
      <rect x="0" y="0" width="48" height="24" fill="none" stroke="currentColor" strokeWidth="1" rx="1" />
      <line x1="4" y1="0" x2="4" y2="24" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 1" />
      <line x1="44" y1="0" x2="44" y2="24" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 1" />
      <line x1="24" y1="0" x2="24" y2="24" stroke="currentColor" strokeWidth="0.75" />
      <line x1="4" y1="10" x2="44" y2="10" stroke="currentColor" strokeWidth="0.3" strokeDasharray="1 1" />
      <line x1="4" y1="14" x2="44" y2="14" stroke="currentColor" strokeWidth="0.3" strokeDasharray="1 1" />
    </svg>
  ),
  indoor_wgi: (
    <svg viewBox="0 0 36 24" className="w-9 h-6">
      <rect x="0" y="0" width="36" height="24" fill="none" stroke="currentColor" strokeWidth="1" rx="1" />
      <line x1="18" y1="0" x2="18" y2="24" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 1" />
      <circle cx="18" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  ),
  stage: (
    <svg viewBox="0 0 32 24" className="w-8 h-6">
      <rect x="0" y="0" width="32" height="24" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
      <line x1="0" y1="4" x2="32" y2="4" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 1" />
      <text x="16" y="16" textAnchor="middle" className="text-[5px] fill-current">STAGE</text>
    </svg>
  ),
  parade: (
    <svg viewBox="0 0 48 12" className="w-12 h-3">
      <rect x="0" y="0" width="48" height="12" fill="none" stroke="currentColor" strokeWidth="1" rx="1" />
      <line x1="0" y1="6" x2="48" y2="6" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2 2" />
      <polygon points="44,3 48,6 44,9" fill="currentColor" opacity="0.4" />
    </svg>
  ),
  custom: (
    <Settings className="w-6 h-6" />
  ),
};

// ============================================================================
// FIELD PREVIEW SVG
// ============================================================================

function FieldPreview({ config }: { config: FieldConfig }) {
  const svgWidth = 280;
  const svgHeight = 160;
  const padding = 16;

  const aspect = config.width / config.height;
  let fieldW: number;
  let fieldH: number;

  const availW = svgWidth - 2 * padding;
  const availH = svgHeight - 2 * padding;

  if (aspect >= availW / availH) {
    fieldW = availW;
    fieldH = availW / aspect;
  } else {
    fieldH = availH;
    fieldW = availH * aspect;
  }

  const offsetX = (svgWidth - fieldW) / 2;
  const offsetY = (svgHeight - fieldH) / 2;

  // Yard lines
  const yardLines: number[] = [];
  if (config.yardLineInterval > 0) {
    for (let pos = config.yardLineInterval; pos < config.width; pos += config.yardLineInterval) {
      yardLines.push(pos);
    }
  }

  // Hash marks
  const frontHashY = (config.hashMarks.front / config.height) * fieldH;
  const backHashY = fieldH - (config.hashMarks.back / config.height) * fieldH;

  // End zones
  const ezLeft = config.endZoneDepth > 0 ? (config.endZoneDepth / config.width) * fieldW : 0;
  const ezRight = config.endZoneDepth > 0 ? fieldW - (config.endZoneDepth / config.width) * fieldW : fieldW;

  return (
    <svg width={svgWidth} height={svgHeight} className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Field outline */}
      <rect
        x={offsetX}
        y={offsetY}
        width={fieldW}
        height={fieldH}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-gray-400 dark:text-gray-500"
        rx={2}
      />

      {/* End zones */}
      {config.endZoneDepth > 0 && (
        <>
          <rect
            x={offsetX}
            y={offsetY}
            width={ezLeft}
            height={fieldH}
            className="fill-blue-100 dark:fill-blue-900/20"
            rx={2}
          />
          <rect
            x={offsetX + ezRight}
            y={offsetY}
            width={fieldW - ezRight}
            height={fieldH}
            className="fill-blue-100 dark:fill-blue-900/20"
            rx={2}
          />
          <line
            x1={offsetX + ezLeft}
            y1={offsetY}
            x2={offsetX + ezLeft}
            y2={offsetY + fieldH}
            stroke="currentColor"
            strokeWidth={1}
            className="text-gray-400 dark:text-gray-500"
          />
          <line
            x1={offsetX + ezRight}
            y1={offsetY}
            x2={offsetX + ezRight}
            y2={offsetY + fieldH}
            stroke="currentColor"
            strokeWidth={1}
            className="text-gray-400 dark:text-gray-500"
          />
        </>
      )}

      {/* Yard lines */}
      {yardLines.map((pos) => {
        const x = offsetX + (pos / config.width) * fieldW;
        return (
          <line
            key={pos}
            x1={x}
            y1={offsetY}
            x2={x}
            y2={offsetY + fieldH}
            stroke="currentColor"
            strokeWidth={0.5}
            strokeDasharray="3 2"
            className="text-gray-300 dark:text-gray-600"
          />
        );
      })}

      {/* Hash marks */}
      <line
        x1={offsetX}
        y1={offsetY + frontHashY}
        x2={offsetX + fieldW}
        y2={offsetY + frontHashY}
        stroke="currentColor"
        strokeWidth={0.5}
        strokeDasharray="2 3"
        className="text-amber-400 dark:text-amber-600"
      />
      <line
        x1={offsetX}
        y1={offsetY + backHashY}
        x2={offsetX + fieldW}
        y2={offsetY + backHashY}
        stroke="currentColor"
        strokeWidth={0.5}
        strokeDasharray="2 3"
        className="text-amber-400 dark:text-amber-600"
      />

      {/* Custom lines */}
      {config.customLines?.map((line, i) => {
        if (line.orientation === 'vertical') {
          const x = offsetX + (line.position / config.width) * fieldW;
          return (
            <g key={`custom-${i}`}>
              <line
                x1={x} y1={offsetY} x2={x} y2={offsetY + fieldH}
                stroke="currentColor" strokeWidth={0.75}
                className="text-purple-400 dark:text-purple-500"
              />
              <text
                x={x} y={offsetY - 3}
                textAnchor="middle"
                className="fill-purple-400 dark:fill-purple-500 text-[7px]"
              >
                {line.label}
              </text>
            </g>
          );
        }
        const y = offsetY + (line.position / config.height) * fieldH;
        return (
          <g key={`custom-${i}`}>
            <line
              x1={offsetX} y1={y} x2={offsetX + fieldW} y2={y}
              stroke="currentColor" strokeWidth={0.75}
              className="text-purple-400 dark:text-purple-500"
            />
          </g>
        );
      })}

      {/* Dimensions label */}
      <text
        x={svgWidth / 2}
        y={svgHeight - 4}
        textAnchor="middle"
        className="fill-gray-400 dark:fill-gray-500 text-[9px]"
      >
        {config.width} x {config.height} {config.unit}
      </text>
    </svg>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FieldSetupDialog: React.FC<FieldSetupDialogProps> = ({
  currentConfig,
  onApply,
  onClose,
}) => {
  const presetList = useMemo(() => getFieldPresetList(), []);

  const [selectedType, setSelectedType] = useState<FieldConfig['type']>(currentConfig.type);
  const [isCustomMode, setIsCustomMode] = useState(currentConfig.type === 'custom');

  // Custom field state
  const [customName, setCustomName] = useState(currentConfig.name);
  const [customWidth, setCustomWidth] = useState(currentConfig.width);
  const [customHeight, setCustomHeight] = useState(currentConfig.height);
  const [customYardInterval, setCustomYardInterval] = useState(currentConfig.yardLineInterval);
  const [customFrontHash, setCustomFrontHash] = useState(currentConfig.hashMarks.front);
  const [customBackHash, setCustomBackHash] = useState(currentConfig.hashMarks.back);
  const [customEndZone, setCustomEndZone] = useState(currentConfig.endZoneDepth);
  const [customUnit, setCustomUnit] = useState<FieldConfig['unit']>(currentConfig.unit);

  // Build the active config based on selection
  const activeConfig: FieldConfig = useMemo(() => {
    if (isCustomMode) {
      return createCustomField(customName, customWidth, customHeight, {
        yardLineInterval: customYardInterval,
        hashMarks: { front: customFrontHash, back: customBackHash },
        endZoneDepth: customEndZone,
        unit: customUnit,
      });
    }
    return getFieldPreset(selectedType);
  }, [
    isCustomMode,
    selectedType,
    customName,
    customWidth,
    customHeight,
    customYardInterval,
    customFrontHash,
    customBackHash,
    customEndZone,
    customUnit,
  ]);

  // Validation
  const validationErrors = useMemo(
    () => validateFieldConfig(activeConfig),
    [activeConfig],
  );

  // When selecting a preset, populate custom fields with its values
  const handlePresetSelect = useCallback(
    (type: FieldConfig['type']) => {
      setSelectedType(type);
      const preset = getFieldPreset(type);

      if (type === 'custom') {
        setIsCustomMode(true);
      } else {
        setIsCustomMode(false);
      }

      setCustomName(preset.name);
      setCustomWidth(preset.width);
      setCustomHeight(preset.height);
      setCustomYardInterval(preset.yardLineInterval);
      setCustomFrontHash(preset.hashMarks.front);
      setCustomBackHash(preset.hashMarks.back);
      setCustomEndZone(preset.endZoneDepth);
      setCustomUnit(preset.unit);
    },
    [],
  );

  const handleApply = useCallback(() => {
    if (validationErrors.length === 0) {
      onApply(activeConfig);
    }
  }, [activeConfig, validationErrors, onApply]);

  // Build preset info with icons
  const presetInfos: PresetInfo[] = useMemo(
    () =>
      presetList.map((p) => ({
        type: p.type,
        name: p.name,
        description: p.description,
        icon: PRESET_ICONS[p.type],
      })),
    [presetList],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" role="presentation" onClick={onClose} />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Field Setup"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Field Setup
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close field setup dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {/* Preset Grid */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Select Field Type
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {presetInfos.map((preset) => (
                <button
                  key={preset.type}
                  onClick={() => handlePresetSelect(preset.type)}
                  className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                    selectedType === preset.type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div
                    className={`mb-2 ${
                      selectedType === preset.type
                        ? 'text-blue-500'
                        : 'text-gray-400'
                    }`}
                  >
                    {preset.icon}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      selectedType === preset.type
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {preset.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom mode inputs */}
          {isCustomMode && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" aria-hidden="true" />
                Custom Configuration
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Field Name
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Width */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Width
                  </label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    min={1}
                    step={0.5}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Height */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Height
                  </label>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value))}
                    min={1}
                    step={0.5}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Yard Line Interval */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Yard Line Interval
                  </label>
                  <input
                    type="number"
                    value={customYardInterval}
                    onChange={(e) => setCustomYardInterval(Number(e.target.value))}
                    min={0.5}
                    step={0.5}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* End Zone Depth */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    End Zone Depth
                  </label>
                  <input
                    type="number"
                    value={customEndZone}
                    onChange={(e) => setCustomEndZone(Number(e.target.value))}
                    min={0}
                    step={0.5}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Front Hash */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Front Hash Position
                  </label>
                  <input
                    type="number"
                    value={customFrontHash}
                    onChange={(e) => setCustomFrontHash(Number(e.target.value))}
                    min={0}
                    step={0.5}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Back Hash */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Back Hash Position
                  </label>
                  <input
                    type="number"
                    value={customBackHash}
                    onChange={(e) => setCustomBackHash(Number(e.target.value))}
                    min={0}
                    step={0.5}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Unit
                  </label>
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value as FieldConfig['unit'])}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="yards">Yards</option>
                    <option value="feet">Feet</option>
                    <option value="meters">Meters</option>
                    <option value="steps">Steps</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                Configuration errors:
              </p>
              <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Live Field Preview */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Grid className="w-4 h-4 text-gray-500" aria-hidden="true" />
              Field Preview
            </h3>
            <div className="flex justify-center">
              <FieldPreview config={activeConfig} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={validationErrors.length > 0}
            className="flex items-center gap-1.5 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldSetupDialog;
