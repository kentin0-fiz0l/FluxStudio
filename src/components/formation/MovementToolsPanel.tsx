/**
 * MovementToolsPanel - Advanced drill movement tools
 *
 * Flyout panel from toolbar with categories: Transitions, Rotations,
 * Sequential, Special. Each tool has parameter inputs and preview.
 */

import React, { useState, useCallback } from 'react';
import {
  ArrowRightLeft,
  RotateCw,
  ListOrdered,
  Sparkles,
  Shuffle,
  Repeat,
  Target,
  Waves,
  Grid3x3,
  Eye,
  Check,
  X,
} from 'lucide-react';
import type { Position } from '../../services/formationTypes';
import {
  generateCounterMarch,
  generateParadeGate,
  generateSpiral,
  generateStagger,
  generateFaceToPoint,
  type MorphMethod,
} from '../../services/movementTools';

// ============================================================================
// TYPES
// ============================================================================

type ToolCategory = 'transitions' | 'rotations' | 'sequential' | 'special';

interface MovementToolsPanelProps {
  selectedPositions: Position[];
  allPositions: Position[];
  selectedPerformerIds: string[];
  onApplyPositions: (performerIds: string[], positions: Position[]) => void;
  onClose: () => void;
  onOpenMorphSlider?: () => void;
}

interface ToolDefinition {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: ToolCategory;
  description: string;
}

const TOOLS: ToolDefinition[] = [
  { id: 'morph', name: 'Morph', icon: <Shuffle className="w-4 h-4" />, category: 'transitions', description: 'Map performers between formations' },
  { id: 'counter-march', name: 'Counter March', icon: <Repeat className="w-4 h-4" />, category: 'transitions', description: 'Reverse direction at pivot line' },
  { id: 'gate', name: 'Parade Gate', icon: <RotateCw className="w-4 h-4" />, category: 'rotations', description: 'Pivot around a point' },
  { id: 'face-to-point', name: 'Face to Point', icon: <Target className="w-4 h-4" />, category: 'rotations', description: 'All face a target point' },
  { id: 'spiral', name: 'Spiral', icon: <Waves className="w-4 h-4" />, category: 'special', description: 'Arrange in spiral pattern' },
  { id: 'stagger', name: 'Stagger', icon: <Grid3x3 className="w-4 h-4" />, category: 'special', description: 'Alternating row/column offset' },
];

const CATEGORIES: { id: ToolCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'transitions', label: 'Transitions', icon: <ArrowRightLeft className="w-4 h-4" /> },
  { id: 'rotations', label: 'Rotations', icon: <RotateCw className="w-4 h-4" /> },
  { id: 'sequential', label: 'Sequential', icon: <ListOrdered className="w-4 h-4" /> },
  { id: 'special', label: 'Special', icon: <Sparkles className="w-4 h-4" /> },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MovementToolsPanel: React.FC<MovementToolsPanelProps> = ({
  selectedPositions,
  allPositions,
  selectedPerformerIds,
  onApplyPositions,
  onClose,
  onOpenMorphSlider,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('transitions');
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [previewPositions, setPreviewPositions] = useState<Position[] | null>(null);

  // Tool-specific parameters
  const [pivotY, setPivotY] = useState(50);
  const [gateAngle, setGateAngle] = useState(90);
  const [gatePivotX, setGatePivotX] = useState(50);
  const [gatePivotY, setGatePivotY] = useState(50);
  const [targetX, setTargetX] = useState(50);
  const [targetY, setTargetY] = useState(50);
  const [spiralTurns, setSpiralTurns] = useState(2);
  const [spiralRadius, setSpiralRadius] = useState(30);
  const [staggerOffsetX, setStaggerOffsetX] = useState(3);
  const [staggerOffsetY, setStaggerOffsetY] = useState(0);
  const [morphMethod, setMorphMethod] = useState<MorphMethod>('proximity');

  const positions = selectedPositions.length > 0 ? selectedPositions : allPositions;
  const performerIds = selectedPerformerIds;

  const handlePreview = useCallback(() => {
    let result: Position[] | null = null;

    switch (selectedTool) {
      case 'counter-march':
        result = generateCounterMarch(positions, pivotY);
        break;
      case 'gate':
        result = generateParadeGate(positions, { x: gatePivotX, y: gatePivotY }, gateAngle);
        break;
      case 'face-to-point':
        result = generateFaceToPoint(positions, { x: targetX, y: targetY });
        break;
      case 'spiral':
        result = generateSpiral(positions.length, {
          center: { x: 50, y: 50 },
          turns: spiralTurns,
          startRadius: spiralRadius,
          endRadius: spiralRadius * 0.3,
          clockwise: true,
        });
        break;
      case 'stagger':
        result = generateStagger(positions, staggerOffsetX, staggerOffsetY);
        break;
      case 'morph':
        // Morph requires a target set — for now preview just shows current
        result = positions;
        break;
    }

    setPreviewPositions(result);
  }, [selectedTool, positions, pivotY, gateAngle, gatePivotX, gatePivotY, targetX, targetY, spiralTurns, spiralRadius, staggerOffsetX, staggerOffsetY]);

  const handleApply = useCallback(() => {
    if (previewPositions && performerIds.length > 0) {
      onApplyPositions(performerIds, previewPositions);
      setPreviewPositions(null);
    }
  }, [previewPositions, performerIds, onApplyPositions]);

  const categoryTools = TOOLS.filter((t) => t.category === selectedCategory);

  return (
    <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-blue-500" />
          Movement Tools
        </h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setSelectedCategory(cat.id); setSelectedTool(null); setPreviewPositions(null); }}
            className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
              selectedCategory === cat.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tool List */}
      <div className="p-3 space-y-1">
        {categoryTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => { setSelectedTool(tool.id); setPreviewPositions(null); }}
            className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
              selectedTool === tool.id
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <span className={selectedTool === tool.id ? 'text-blue-500' : 'text-gray-400'}>
              {tool.icon}
            </span>
            <div>
              <p className="text-sm font-medium">{tool.name}</p>
              <p className="text-xs text-gray-500">{tool.description}</p>
            </div>
          </button>
        ))}
        {categoryTools.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">Coming soon</p>
        )}
      </div>

      {/* Tool Parameters */}
      {selectedTool && (
        <div className="flex-1 border-t border-gray-200 dark:border-gray-700 p-4 space-y-3 overflow-y-auto">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Parameters</h4>

          {selectedTool === 'counter-march' && (
            <ParamSlider label="Pivot Line Y" value={pivotY} min={0} max={100} onChange={setPivotY} />
          )}

          {selectedTool === 'gate' && (
            <>
              <ParamSlider label="Angle" value={gateAngle} min={-180} max={180} unit="°" onChange={setGateAngle} />
              <ParamSlider label="Pivot X" value={gatePivotX} min={0} max={100} onChange={setGatePivotX} />
              <ParamSlider label="Pivot Y" value={gatePivotY} min={0} max={100} onChange={setGatePivotY} />
            </>
          )}

          {selectedTool === 'face-to-point' && (
            <>
              <ParamSlider label="Target X" value={targetX} min={0} max={100} onChange={setTargetX} />
              <ParamSlider label="Target Y" value={targetY} min={0} max={100} onChange={setTargetY} />
            </>
          )}

          {selectedTool === 'spiral' && (
            <>
              <ParamSlider label="Turns" value={spiralTurns} min={1} max={5} onChange={setSpiralTurns} />
              <ParamSlider label="Radius" value={spiralRadius} min={10} max={50} onChange={setSpiralRadius} />
            </>
          )}

          {selectedTool === 'stagger' && (
            <>
              <ParamSlider label="Offset X" value={staggerOffsetX} min={-10} max={10} onChange={setStaggerOffsetX} />
              <ParamSlider label="Offset Y" value={staggerOffsetY} min={-10} max={10} onChange={setStaggerOffsetY} />
            </>
          )}

          {selectedTool === 'morph' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Match Method</label>
                <select
                  value={morphMethod}
                  onChange={(e) => setMorphMethod(e.target.value as MorphMethod)}
                  className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                >
                  <option value="proximity">Proximity (nearest)</option>
                  <option value="index">Index (order)</option>
                  <option value="manual">Manual mapping</option>
                </select>
              </div>
              {onOpenMorphSlider && (
                <button
                  onClick={onOpenMorphSlider}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-sm hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  Open Morph Slider
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handlePreview}
              disabled={positions.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              onClick={handleApply}
              disabled={!previewPositions}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              Apply
            </button>
          </div>

          {positions.length === 0 && (
            <p className="text-xs text-amber-500 text-center">
              Select performers to use movement tools
            </p>
          )}
        </div>
      )}
    </div>
  );
};

function ParamSlider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-gray-500">{label}</label>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}
