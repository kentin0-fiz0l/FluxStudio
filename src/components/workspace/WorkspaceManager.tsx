import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Save,
  RotateCcw,
  RotateCw,
  Settings,
  Download,
  Upload,
  Lock,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Move,
  MousePointer,
  Square,
  Circle,
  Type,
  Image,
  Ruler,
  Grid3X3,
  Maximize,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface WorkspaceElement {
  id: string;
  type: 'text' | 'shape' | 'image' | 'line' | 'annotation';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  visible: boolean;
  opacity: number;
  zIndex: number;
  style: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
  };
  content?: string;
  src?: string;
}

interface WorkspaceState {
  elements: WorkspaceElement[];
  selectedElements: string[];
  clipboard: WorkspaceElement[];
  history: WorkspaceElement[][];
  historyIndex: number;
  zoom: number;
  pan: { x: number; y: number };
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  showRulers: boolean;
  artboardSize: { width: number; height: number };
  viewMode: 'desktop' | 'tablet' | 'mobile';
}

interface WorkspaceManagerProps {
  initialState?: Partial<WorkspaceState>;
  onSave: (state: WorkspaceState) => void;
  onLoad: () => Promise<WorkspaceState>;
  onExport: (format: 'png' | 'jpg' | 'svg' | 'pdf') => void;
  readOnly?: boolean;
  showToolbar?: boolean;
  showPanels?: boolean;
}

const tools = [
  { id: 'select', icon: MousePointer, label: 'Select' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'image', icon: Image, label: 'Image' },
  { id: 'move', icon: Move, label: 'Move' }
];

type ViewModeId = 'desktop' | 'tablet' | 'mobile';

const viewModes: { id: ViewModeId; icon: typeof Monitor; label: string; size: { width: number; height: number } }[] = [
  { id: 'desktop', icon: Monitor, label: 'Desktop', size: { width: 1920, height: 1080 } },
  { id: 'tablet', icon: Tablet, label: 'Tablet', size: { width: 1024, height: 768 } },
  { id: 'mobile', icon: Smartphone, label: 'Mobile', size: { width: 375, height: 667 } }
];

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
  initialState = {},
  onSave,
  onLoad,
  onExport,
  readOnly = false,
  showToolbar = true,
  showPanels = true
}) => {
  const [state, setState] = useState<WorkspaceState>({
    elements: [],
    selectedElements: [],
    clipboard: [],
    history: [[]],
    historyIndex: 0,
    zoom: 1,
    pan: { x: 0, y: 0 },
    gridSize: 20,
    snapToGrid: true,
    showGrid: true,
    showRulers: true,
    artboardSize: { width: 1920, height: 1080 },
    viewMode: 'desktop',
    ...initialState
  });

  const [activeTool, setActiveTool] = useState('select');
  const [_isDrawing, _setIsDrawing] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [_isDragging, _setIsDragging] = useState(false);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const addToHistory = (newElements: WorkspaceElement[]) => {
    setState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push([...newElements]);

      return {
        ...prev,
        elements: newElements,
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  };

  const undo = () => {
    if (canUndo) {
      setState(prev => ({
        ...prev,
        historyIndex: prev.historyIndex - 1,
        elements: [...prev.history[prev.historyIndex - 1]]
      }));
    }
  };

  const redo = () => {
    if (canRedo) {
      setState(prev => ({
        ...prev,
        historyIndex: prev.historyIndex + 1,
        elements: [...prev.history[prev.historyIndex + 1]]
      }));
    }
  };

  const handleZoomIn = () => {
    setState(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 5) }));
  };

  const handleZoomOut = () => {
    setState(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.1) }));
  };

  const handleZoomFit = () => {
    // Calculate zoom to fit artboard in viewport
    const viewportWidth = window.innerWidth - (showPanels ? 600 : 0);
    const viewportHeight = window.innerHeight - 200;

    const scaleX = viewportWidth / state.artboardSize.width;
    const scaleY = viewportHeight / state.artboardSize.height;
    const newZoom = Math.min(scaleX, scaleY, 1);

    setState(prev => ({
      ...prev,
      zoom: newZoom,
      pan: { x: 0, y: 0 }
    }));
  };

  const handleElementSelect = (elementId: string, multiSelect = false) => {
    setState(prev => ({
      ...prev,
      selectedElements: multiSelect
        ? prev.selectedElements.includes(elementId)
          ? prev.selectedElements.filter(id => id !== elementId)
          : [...prev.selectedElements, elementId]
        : [elementId]
    }));
  };

  const handleElementUpdate = (elementId: string, updates: Partial<WorkspaceElement>) => {
    if (readOnly) return;

    const newElements = state.elements.map(el =>
      el.id === elementId ? { ...el, ...updates } : el
    );
    addToHistory(newElements);
  };

  // Note: Element delete/copy/paste handlers reserved for future keyboard shortcuts

  const handleViewModeChange = (mode: 'desktop' | 'tablet' | 'mobile') => {
    const modeConfig = viewModes.find(m => m.id === mode);
    if (modeConfig) {
      setState(prev => ({
        ...prev,
        viewMode: mode,
        artboardSize: modeConfig.size
      }));
    }
  };

  const selectedElement = state.selectedElements.length === 1
    ? state.elements.find(el => el.id === state.selectedElements[0])
    : null;

  return (
    <div className="w-full h-full bg-gray-100 flex flex-col">
      {/* Top Toolbar */}
      {showToolbar && (
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Left - File Operations */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onSave(state)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>

              <button
                onClick={onLoad}
                className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Load</span>
              </button>

              <div className="w-px h-6 bg-gray-300" />

              <button
                onClick={undo}
                disabled={!canUndo || readOnly}
                className="p-1.5 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Undo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={redo}
                disabled={!canRedo || readOnly}
                className="p-1.5 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Redo"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Center - Tools */}
            <div className="flex items-center space-x-1 bg-gray-50 rounded-lg p-1">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    disabled={readOnly && tool.id !== 'select'}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      activeTool === tool.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100',
                      readOnly && tool.id !== 'select' && 'opacity-50 cursor-not-allowed'
                    )}
                    title={tool.label}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>

            {/* Right - View Controls */}
            <div className="flex items-center space-x-2">
              {/* View Mode */}
              <div className="flex items-center space-x-1 bg-gray-50 rounded-lg p-1">
                {viewModes.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => handleViewModeChange(mode.id)}
                      className={cn(
                        'p-2 rounded-md transition-colors',
                        state.viewMode === mode.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                      )}
                      title={mode.label}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>

              <div className="w-px h-6 bg-gray-300" />

              {/* Zoom Controls */}
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-gray-600 hover:text-gray-800 transition-colors"
                title="Zoom Out"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="text-sm text-gray-600 min-w-[60px] text-center">
                {Math.round(state.zoom * 100)}%
              </div>

              <button
                onClick={handleZoomIn}
                className="p-1.5 text-gray-600 hover:text-gray-800 transition-colors"
                title="Zoom In"
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                onClick={handleZoomFit}
                className="p-1.5 text-gray-600 hover:text-gray-800 transition-colors"
                title="Fit to Screen"
              >
                <Maximize className="w-4 h-4" />
              </button>

              <div className="w-px h-6 bg-gray-300" />

              {/* Grid Toggle */}
              <button
                onClick={() => setState(prev => ({ ...prev, showGrid: !prev.showGrid }))}
                className={cn(
                  'p-1.5 transition-colors',
                  state.showGrid ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'
                )}
                title="Toggle Grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>

              {/* Rulers Toggle */}
              <button
                onClick={() => setState(prev => ({ ...prev, showRulers: !prev.showRulers }))}
                className={cn(
                  'p-1.5 transition-colors',
                  state.showRulers ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'
                )}
                title="Toggle Rulers"
              >
                <Ruler className="w-4 h-4" />
              </button>

              <div className="w-px h-6 bg-gray-300" />

              {/* Export */}
              <button
                onClick={() => onExport('png')}
                className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Layers */}
        {showPanels && (
          <AnimatePresence>
            {showLayersPanel && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 300 }}
                exit={{ width: 0 }}
                className="bg-white border-r border-gray-200 overflow-hidden"
              >
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Layers</h3>
                    <button
                      onClick={() => setShowLayersPanel(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                  {state.elements
                    .sort((a, b) => b.zIndex - a.zIndex)
                    .map((element) => (
                      <div
                        key={element.id}
                        onClick={() => handleElementSelect(element.id)}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors',
                          state.selectedElements.includes(element.id)
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleElementUpdate(element.id, { visible: !element.visible });
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {element.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          </button>

                          <span className="text-sm text-gray-900 capitalize">
                            {element.type} {element.content && `- ${element.content.slice(0, 20)}`}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          {element.locked && <Lock className="w-3 h-3 text-gray-400" />}
                        </div>
                      </div>
                    ))}

                  {state.elements.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No elements yet
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Canvas Area */}
        <div className="flex-1 bg-gray-100 overflow-hidden relative">
          {/* Rulers */}
          {state.showRulers && (
            <>
              {/* Horizontal Ruler */}
              <div className="absolute top-0 left-8 right-0 h-8 bg-white border-b border-gray-300 z-10">
                <svg className="w-full h-full">
                  {Array.from({ length: Math.ceil(state.artboardSize.width / 50) }).map((_, i) => (
                    <g key={i}>
                      <line
                        x1={i * 50 * state.zoom}
                        y1="24"
                        x2={i * 50 * state.zoom}
                        y2="32"
                        stroke="#666"
                        strokeWidth="1"
                      />
                      <text
                        x={i * 50 * state.zoom + 4}
                        y="20"
                        fontSize="10"
                        fill="#666"
                      >
                        {i * 50}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              {/* Vertical Ruler */}
              <div className="absolute top-8 left-0 bottom-0 w-8 bg-white border-r border-gray-300 z-10">
                <svg className="w-full h-full">
                  {Array.from({ length: Math.ceil(state.artboardSize.height / 50) }).map((_, i) => (
                    <g key={i}>
                      <line
                        x1="24"
                        y1={i * 50 * state.zoom}
                        x2="32"
                        y2={i * 50 * state.zoom}
                        stroke="#666"
                        strokeWidth="1"
                      />
                      <text
                        x="4"
                        y={i * 50 * state.zoom + 12}
                        fontSize="10"
                        fill="#666"
                        transform={`rotate(-90, 4, ${i * 50 * state.zoom + 12})`}
                      >
                        {i * 50}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              {/* Corner */}
              <div className="absolute top-0 left-0 w-8 h-8 bg-white border-r border-b border-gray-300 z-20" />
            </>
          )}

          {/* Canvas */}
          <div
            className={cn(
              'absolute bg-white shadow-lg',
              state.showRulers ? 'top-8 left-8' : 'top-4 left-4'
            )}
            style={{
              width: state.artboardSize.width * state.zoom,
              height: state.artboardSize.height * state.zoom,
              transform: `translate(${state.pan.x}px, ${state.pan.y}px)`
            }}
          >
            {/* Grid */}
            {state.showGrid && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width="100%"
                height="100%"
              >
                <defs>
                  <pattern
                    id="grid"
                    width={state.gridSize * state.zoom}
                    height={state.gridSize * state.zoom}
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d={`M ${state.gridSize * state.zoom} 0 L 0 0 0 ${state.gridSize * state.zoom}`}
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            )}

            {/* Elements */}
            {state.elements
              .filter(el => el.visible)
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((element) => (
                <div
                  key={element.id}
                  className={cn(
                    'absolute cursor-pointer',
                    state.selectedElements.includes(element.id) && 'ring-2 ring-blue-500'
                  )}
                  style={{
                    left: element.x * state.zoom,
                    top: element.y * state.zoom,
                    width: element.width * state.zoom,
                    height: element.height * state.zoom,
                    transform: `rotate(${element.rotation}deg)`,
                    opacity: element.opacity,
                    zIndex: element.zIndex
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleElementSelect(element.id, e.metaKey || e.ctrlKey);
                  }}
                >
                  {element.type === 'text' && (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        fontSize: (element.style.fontSize || 16) * state.zoom,
                        fontFamily: element.style.fontFamily || 'system-ui',
                        fontWeight: element.style.fontWeight || 'normal',
                        color: element.style.fill || '#000'
                      }}
                    >
                      {element.content}
                    </div>
                  )}

                  {element.type === 'shape' && (
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundColor: element.style.fill || 'transparent',
                        border: `${(element.style.strokeWidth || 1) * state.zoom}px solid ${element.style.stroke || '#000'}`
                      }}
                    />
                  )}

                  {element.type === 'image' && element.src && (
                    <img
                      src={element.src}
                      alt=""
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Right Panel - Properties */}
        {showPanels && (
          <AnimatePresence>
            {showPropertiesPanel && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 300 }}
                exit={{ width: 0 }}
                className="bg-white border-l border-gray-200 overflow-hidden"
              >
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Properties</h3>
                    <button
                      onClick={() => setShowPropertiesPanel(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {selectedElement ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Position
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={Math.round(selectedElement.x)}
                            onChange={(e) => handleElementUpdate(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                            placeholder="X"
                            className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={readOnly}
                          />
                          <input
                            type="number"
                            value={Math.round(selectedElement.y)}
                            onChange={(e) => handleElementUpdate(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                            placeholder="Y"
                            className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={readOnly}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Size
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={Math.round(selectedElement.width)}
                            onChange={(e) => handleElementUpdate(selectedElement.id, { width: parseInt(e.target.value) || 0 })}
                            placeholder="Width"
                            className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={readOnly}
                          />
                          <input
                            type="number"
                            value={Math.round(selectedElement.height)}
                            onChange={(e) => handleElementUpdate(selectedElement.id, { height: parseInt(e.target.value) || 0 })}
                            placeholder="Height"
                            className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={readOnly}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Opacity
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={selectedElement.opacity}
                          onChange={(e) => handleElementUpdate(selectedElement.id, { opacity: parseFloat(e.target.value) })}
                          className="w-full"
                          disabled={readOnly}
                        />
                      </div>

                      {selectedElement.type === 'text' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Content
                          </label>
                          <textarea
                            value={selectedElement.content || ''}
                            onChange={(e) => handleElementUpdate(selectedElement.id, { content: e.target.value })}
                            placeholder="Enter text..."
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={readOnly}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">
                      Select an element to edit properties
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Collapsed Panel Toggles */}
      {showPanels && (
        <>
          {!showLayersPanel && (
            <button
              onClick={() => setShowLayersPanel(true)}
              className="fixed left-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-r-lg p-2 shadow-lg z-50"
            >
              <Layers className="w-4 h-4 text-gray-600" />
            </button>
          )}

          {!showPropertiesPanel && (
            <button
              onClick={() => setShowPropertiesPanel(true)}
              className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-l-lg p-2 shadow-lg z-50"
            >
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </>
      )}
    </div>
  );
};
export default WorkspaceManager;
