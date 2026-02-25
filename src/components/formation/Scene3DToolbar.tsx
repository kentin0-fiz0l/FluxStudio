/**
 * Scene3DToolbar - Toolbar for 3D scene editing tools
 *
 * Provides buttons for adding primitives, transform tools,
 * prop library, model import, camera presets, field type selector,
 * and scene settings.
 */

import {
  MousePointer2,
  Move,
  RotateCw,
  Maximize2,
  Box,
  Circle,
  Triangle,
  Minus,
  Hexagon,
  Library,
  Upload,
  Wrench,
  Grid3X3,
  Tag,
  Sun,
  Eye,
  Video,
  Camera,
  Users,
  ChevronDown,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Scene3DTool, CameraPreset, FieldType } from '../../services/scene3d/types';
import { CAMERA_PRESETS } from '../../services/scene3d/types';

interface Scene3DToolbarProps {
  activeTool: Scene3DTool;
  showGrid: boolean;
  showLabels: boolean;
  showShadows: boolean;
  fieldType?: FieldType;
  onToolChange: (tool: Scene3DTool) => void;
  onToggleGrid: () => void;
  onToggleLabels: () => void;
  onToggleShadows: () => void;
  onOpenPropLibrary: () => void;
  onOpenModelImporter: () => void;
  onOpenPrimitiveBuilder: () => void;
  onCameraPreset?: (preset: CameraPreset) => void;
  onFieldTypeChange?: (fieldType: FieldType) => void;
}

const TRANSFORM_TOOLS: { tool: Scene3DTool; icon: typeof MousePointer2; label: string }[] = [
  { tool: 'select', icon: MousePointer2, label: 'Select' },
  { tool: 'translate', icon: Move, label: 'Move' },
  { tool: 'rotate', icon: RotateCw, label: 'Rotate' },
  { tool: 'scale', icon: Maximize2, label: 'Scale' },
];

const SHAPE_TOOLS: { tool: Scene3DTool; icon: typeof Box; label: string }[] = [
  { tool: 'add-box', icon: Box, label: 'Box' },
  { tool: 'add-cylinder', icon: Hexagon, label: 'Cylinder' },
  { tool: 'add-sphere', icon: Circle, label: 'Sphere' },
  { tool: 'add-cone', icon: Triangle, label: 'Cone' },
  { tool: 'add-plane', icon: Minus, label: 'Plane' },
];

const CAMERA_PRESET_ICONS = {
  'press-box': Eye,
  sideline: Video,
  corner: Camera,
  audience: Users,
} as const;

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  football: 'Football Field',
  indoor: 'Indoor Field',
  gymnasium: 'Gymnasium',
  custom: 'Custom',
};

export function Scene3DToolbar({
  activeTool,
  showGrid,
  showLabels,
  showShadows,
  fieldType = 'football',
  onToolChange,
  onToggleGrid,
  onToggleLabels,
  onToggleShadows,
  onOpenPropLibrary,
  onOpenModelImporter,
  onOpenPrimitiveBuilder,
  onCameraPreset,
  onFieldTypeChange,
}: Scene3DToolbarProps) {
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);
  const fieldDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (fieldDropdownRef.current && !fieldDropdownRef.current.contains(e.target as Node)) {
        setFieldDropdownOpen(false);
      }
    }
    if (fieldDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [fieldDropdownOpen]);

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Transform tools */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 dark:border-gray-700">
        {TRANSFORM_TOOLS.map(({ tool, icon: Icon, label }) => (
          <ToolButton
            key={tool}
            active={activeTool === tool}
            onClick={() => onToolChange(tool)}
            title={label}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
          </ToolButton>
        ))}
      </div>

      {/* Shape tools */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 dark:border-gray-700">
        {SHAPE_TOOLS.map(({ tool, icon: Icon, label }) => (
          <ToolButton
            key={tool}
            active={activeTool === tool}
            onClick={() => onToolChange(tool)}
            title={`Add ${label}`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
          </ToolButton>
        ))}
      </div>

      {/* Library & Import */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 dark:border-gray-700">
        <ToolButton onClick={onOpenPropLibrary} title="Prop Library">
          <Library className="w-4 h-4" aria-hidden="true" />
        </ToolButton>
        <ToolButton onClick={onOpenModelImporter} title="Import Model">
          <Upload className="w-4 h-4" aria-hidden="true" />
        </ToolButton>
        <ToolButton onClick={onOpenPrimitiveBuilder} title="Primitive Builder">
          <Wrench className="w-4 h-4" aria-hidden="true" />
        </ToolButton>
      </div>

      {/* Camera Presets */}
      {onCameraPreset && (
        <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 dark:border-gray-700">
          {CAMERA_PRESETS.map((preset) => {
            const Icon = CAMERA_PRESET_ICONS[preset.id];
            return (
              <ToolButton
                key={preset.id}
                onClick={() => onCameraPreset(preset)}
                title={preset.label}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
              </ToolButton>
            );
          })}
        </div>
      )}

      {/* Field Type Selector */}
      {onFieldTypeChange && (
        <div className="relative pr-2 border-r border-gray-200 dark:border-gray-700" ref={fieldDropdownRef}>
          <button
            onClick={() => setFieldDropdownOpen((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Select field type"
            aria-expanded={fieldDropdownOpen}
          >
            {FIELD_TYPE_LABELS[fieldType]}
            <ChevronDown className="w-3 h-3" aria-hidden="true" />
          </button>
          {fieldDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
              {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((ft) => (
                <button
                  key={ft}
                  onClick={() => {
                    onFieldTypeChange(ft);
                    setFieldDropdownOpen(false);
                  }}
                  className={`
                    w-full text-left px-3 py-1.5 text-xs transition-colors
                    ${ft === fieldType
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {FIELD_TYPE_LABELS[ft]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings toggles */}
      <div className="flex items-center gap-0.5">
        <ToolButton active={showGrid} onClick={onToggleGrid} title="Toggle Grid">
          <Grid3X3 className="w-4 h-4" aria-hidden="true" />
        </ToolButton>
        <ToolButton active={showLabels} onClick={onToggleLabels} title="Toggle Labels">
          <Tag className="w-4 h-4" aria-hidden="true" />
        </ToolButton>
        <ToolButton active={showShadows} onClick={onToggleShadows} title="Toggle Shadows">
          <Sun className="w-4 h-4" aria-hidden="true" />
        </ToolButton>
      </div>
    </div>
  );
}

function ToolButton({
  active = false,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={title}
      aria-pressed={active}
      className={`
        p-1.5 rounded transition-colors
        ${active
          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
        }
      `}
    >
      {children}
    </button>
  );
}
