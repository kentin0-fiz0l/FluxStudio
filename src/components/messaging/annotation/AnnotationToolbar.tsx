/**
 * AnnotationToolbar Component
 * Tool selection, color picker, brush size, zoom, and history controls
 */

import React from 'react';
import {
  Pencil,
  Square,
  Circle,
  ArrowRight,
  Type,
  Users,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Layers,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Card, CardContent } from '../../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Separator } from '../../ui/separator';
import { Slider } from '../../ui/slider';
import { Label } from '../../ui/label';
import { MessageUser } from '../../../types/messaging';
import { cn } from '../../../lib/utils';

type AnnotationType = 'point' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'freehand';

const annotationTools = [
  { type: 'point' as AnnotationType, icon: Pencil, label: 'Point' },
  { type: 'rectangle' as AnnotationType, icon: Square, label: 'Rectangle' },
  { type: 'circle' as AnnotationType, icon: Circle, label: 'Circle' },
  { type: 'arrow' as AnnotationType, icon: ArrowRight, label: 'Arrow' },
  { type: 'text' as AnnotationType, icon: Type, label: 'Text' },
  { type: 'freehand' as AnnotationType, icon: Pencil, label: 'Freehand' },
];

const defaultColors = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFA500', '#800080', '#008000', '#800000', '#000080', '#808000',
  '#FF69B4', '#32CD32', '#1E90FF', '#FFD700', '#DC143C', '#00CED1'
];

interface AnnotationToolbarProps {
  selectedTool: AnnotationType;
  onToolChange: (tool: AnnotationType) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onResetView: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isConnected: boolean;
  collaborators: MessageUser[];
  showCollaborators: boolean;
  onToggleCollaborators: () => void;
  showLayers: boolean;
  onToggleLayers: () => void;
}

export function AnnotationToolbar({
  selectedTool,
  onToolChange,
  selectedColor,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  zoom,
  onZoomChange,
  onResetView,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isConnected,
  collaborators,
  showCollaborators,
  onToggleCollaborators,
  showLayers,
  onToggleLayers
}: AnnotationToolbarProps) {
  return (
    <Card className="border-b rounded-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Tools */}
            <div className="flex gap-2">
              {annotationTools.map(tool => (
                <Button
                  key={tool.type}
                  variant={selectedTool === tool.type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToolChange(tool.type)}
                  className="h-9"
                >
                  <tool.icon className="w-4 h-4 mr-2" />
                  {tool.label}
                </Button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Color and Brush Size */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-9 h-9 p-0">
                    <div
                      className="w-5 h-5 rounded border"
                      style={{ backgroundColor: selectedColor }}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <div className="grid grid-cols-6 gap-2">
                    {defaultColors.map(color => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => onColorChange(color)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-2">
                <Label htmlFor="brush-size" className="text-sm whitespace-nowrap">
                  Size:
                </Label>
                <Slider
                  id="brush-size"
                  min={1}
                  max={10}
                  step={1}
                  value={[brushSize]}
                  onValueChange={(value) => onBrushSizeChange(value[0])}
                  className="w-20"
                />
                <span className="text-sm text-gray-500 w-6">{brushSize}</span>
              </div>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* History Controls */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onUndo}
                disabled={!canUndo}
                className="h-9"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRedo}
                disabled={!canRedo}
                className="h-9"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
                className="h-9"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onZoomChange(Math.min(3, zoom + 0.1))}
                className="h-9"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onResetView}
                className="h-9"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm text-gray-500">
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* Collaborators */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <div className="flex -space-x-2">
                {collaborators.slice(0, 3).map(user => (
                  <Avatar key={user.id} className="w-6 h-6 border-2 border-white">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-xs">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {collaborators.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs">
                    +{collaborators.length - 3}
                  </div>
                )}
              </div>
            </div>

            {/* Toggle Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleCollaborators}
                className={cn("h-9", showCollaborators && "bg-blue-50")}
              >
                {showCollaborators ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleLayers}
                className={cn("h-9", showLayers && "bg-blue-50")}
              >
                <Layers className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export type { AnnotationType };
export { annotationTools, defaultColors };
