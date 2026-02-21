/**
 * Scene3DToolbar - Toolbar for 3D scene editing tools
 *
 * Provides buttons for adding primitives, transform tools,
 * prop library, model import, and scene settings.
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
} from 'lucide-react';
import type { Scene3DTool } from '../../services/scene3d/types';

interface Scene3DToolbarProps {
  activeTool: Scene3DTool;
  showGrid: boolean;
  showLabels: boolean;
  showShadows: boolean;
  onToolChange: (tool: Scene3DTool) => void;
  onToggleGrid: () => void;
  onToggleLabels: () => void;
  onToggleShadows: () => void;
  onOpenPropLibrary: () => void;
  onOpenModelImporter: () => void;
  onOpenPrimitiveBuilder: () => void;
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

export function Scene3DToolbar({
  activeTool,
  showGrid,
  showLabels,
  showShadows,
  onToolChange,
  onToggleGrid,
  onToggleLabels,
  onToggleShadows,
  onOpenPropLibrary,
  onOpenModelImporter,
  onOpenPrimitiveBuilder,
}: Scene3DToolbarProps) {
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
            <Icon className="w-4 h-4" />
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
            <Icon className="w-4 h-4" />
          </ToolButton>
        ))}
      </div>

      {/* Library & Import */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200 dark:border-gray-700">
        <ToolButton onClick={onOpenPropLibrary} title="Prop Library">
          <Library className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={onOpenModelImporter} title="Import Model">
          <Upload className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={onOpenPrimitiveBuilder} title="Primitive Builder">
          <Wrench className="w-4 h-4" />
        </ToolButton>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings toggles */}
      <div className="flex items-center gap-0.5">
        <ToolButton active={showGrid} onClick={onToggleGrid} title="Toggle Grid">
          <Grid3X3 className="w-4 h-4" />
        </ToolButton>
        <ToolButton active={showLabels} onClick={onToggleLabels} title="Toggle Labels">
          <Tag className="w-4 h-4" />
        </ToolButton>
        <ToolButton active={showShadows} onClick={onToggleShadows} title="Toggle Shadows">
          <Sun className="w-4 h-4" />
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
      title={title}
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
