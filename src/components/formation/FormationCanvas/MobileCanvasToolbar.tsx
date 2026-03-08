/**
 * MobileCanvasToolbar - Bottom-anchored toolbar optimized for touch devices.
 *
 * Primary row: Select, Pan toggle, Add, Undo, Redo, Play/Pause, Overflow menu
 * Overflow sheet (slide-up): export, save, view toggles, settings
 */

import React, { useState } from 'react';
import {
  MousePointer, Hand, Plus, Undo2, Redo2, Play, Pause,
  Save, Download, Grid, Eye, EyeOff, Map,
  Loader2, Check, X, ChevronUp,
} from 'lucide-react';

type Tool = 'select' | 'pan' | 'add' | 'line' | 'arc' | 'block' | 'comment';

interface MobileCanvasToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  fingerMode: 'select' | 'pan';
  setFingerMode: (mode: 'select' | 'pan') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSave: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  setIsExportDialogOpen: (open: boolean) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  showFieldOverlay: boolean;
  setShowFieldOverlay: (show: boolean) => void;
  playbackState: { isPlaying: boolean };
  onPlay: () => void;
  onPause: () => void;
}

const touchTarget = 'min-w-[44px] min-h-[44px]';

export const MobileCanvasToolbar: React.FC<MobileCanvasToolbarProps> = React.memo(({
  activeTool,
  setActiveTool,
  fingerMode,
  setFingerMode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onSave,
  saveStatus,
  setIsExportDialogOpen,
  showGrid,
  setShowGrid,
  showLabels,
  setShowLabels,
  showFieldOverlay,
  setShowFieldOverlay,
  playbackState,
  onPlay,
  onPause,
}) => {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const isPlaying = playbackState.isPlaying;

  return (
    <>
      {/* Overflow sheet backdrop */}
      {overflowOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setOverflowOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Overflow sheet (slide-up) */}
      {overflowOpen && (
        <div className="fixed bottom-[60px] left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-t-2xl shadow-xl px-4 py-3 animate-in slide-in-from-bottom">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">Zoom</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onZoomOut}
                className={`${touchTarget} flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700`}
                aria-label="Zoom out"
              >
                <span className="text-lg font-medium">-</span>
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[48px] text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={onZoomIn}
                className={`${touchTarget} flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700`}
                aria-label="Zoom in"
              >
                <span className="text-lg font-medium">+</span>
              </button>
            </div>
          </div>

          {/* View toggles */}
          <div className="py-2 border-b border-gray-100 dark:border-gray-700 space-y-1">
            <MobileToggleRow
              label="Grid"
              icon={<Grid className="w-4 h-4" />}
              active={showGrid}
              onToggle={() => setShowGrid(!showGrid)}
            />
            <MobileToggleRow
              label="Labels"
              icon={showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              active={showLabels}
              onToggle={() => setShowLabels(!showLabels)}
            />
            <MobileToggleRow
              label="Field Overlay"
              icon={<Map className="w-4 h-4" />}
              active={showFieldOverlay}
              onToggle={() => setShowFieldOverlay(!showFieldOverlay)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3">
            <button
              onClick={() => { setIsExportDialogOpen(true); setOverflowOpen(false); }}
              className={`${touchTarget} flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium`}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => { onSave(); setOverflowOpen(false); }}
              disabled={saveStatus === 'saving'}
              className={`${touchTarget} flex-1 flex items-center justify-center gap-2 rounded-lg text-sm font-medium text-white ${
                saveStatus === 'saved' ? 'bg-green-500' :
                saveStatus === 'error' ? 'bg-red-500' :
                saveStatus === 'saving' ? 'bg-blue-400 cursor-wait' :
                'bg-blue-500'
              }`}
            >
              {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> :
               saveStatus === 'saved' ? <Check className="w-4 h-4" /> :
               <Save className="w-4 h-4" />}
              {saveStatus === 'saving' ? 'Saving...' :
               saveStatus === 'saved' ? 'Saved' :
               saveStatus === 'error' ? 'Failed' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Primary bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-pb"
        role="toolbar"
        aria-label="Canvas tools"
      >
        <div className="flex items-center justify-around px-2 py-1">
          {/* Select tool */}
          <button
            onClick={() => setActiveTool('select')}
            className={`${touchTarget} flex flex-col items-center justify-center rounded-lg ${
              activeTool === 'select' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-label="Select tool"
            aria-pressed={activeTool === 'select'}
          >
            <MousePointer className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Select</span>
          </button>

          {/* Pan / finger mode toggle */}
          <button
            onClick={() => setFingerMode(fingerMode === 'select' ? 'pan' : 'select')}
            className={`${touchTarget} flex flex-col items-center justify-center rounded-lg ${
              fingerMode === 'pan' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-label={fingerMode === 'select' ? 'Switch to pan mode' : 'Switch to select mode'}
          >
            <Hand className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Pan</span>
          </button>

          {/* Add performer */}
          <button
            onClick={() => setActiveTool('add')}
            className={`${touchTarget} flex flex-col items-center justify-center rounded-lg ${
              activeTool === 'add' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-label="Add performer"
            aria-pressed={activeTool === 'add'}
          >
            <Plus className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Add</span>
          </button>

          {/* Undo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`${touchTarget} flex flex-col items-center justify-center rounded-lg ${
              canUndo ? 'text-gray-600 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'
            }`}
            aria-label="Undo"
          >
            <Undo2 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Undo</span>
          </button>

          {/* Redo */}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`${touchTarget} flex flex-col items-center justify-center rounded-lg ${
              canRedo ? 'text-gray-600 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'
            }`}
            aria-label="Redo"
          >
            <Redo2 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Redo</span>
          </button>

          {/* Play/Pause */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            className={`${touchTarget} flex flex-col items-center justify-center rounded-lg ${
              isPlaying ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            <span className="text-[10px] mt-0.5">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Overflow menu */}
          <button
            onClick={() => setOverflowOpen(o => !o)}
            className={`${touchTarget} flex flex-col items-center justify-center rounded-lg ${
              overflowOpen ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
            }`}
            aria-label={overflowOpen ? 'Close menu' : 'More options'}
            aria-expanded={overflowOpen}
          >
            {overflowOpen ? <X className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </div>
      </div>
    </>
  );
});

MobileCanvasToolbar.displayName = 'MobileCanvasToolbar';

/** Toggle row for the overflow sheet */
function MobileToggleRow({ label, icon, active, onToggle }: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`${touchTarget} flex items-center justify-between w-full px-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50`}
      role="switch"
      aria-checked={active}
    >
      <span className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
        {icon}
        {label}
      </span>
      <span className={`w-9 h-5 rounded-full transition-colors relative ${active ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}
