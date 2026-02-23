/**
 * Canvas Toolbar - Simplified layout with grouped tools
 *
 * Layout: [Drawing Tools] | [Undo/Redo] | [Zoom] | [Name] | [View Options ▾] | [Panels] | [Export] [Save]
 * View toggles (grid, labels, rotation, paths, snap, count, field) collapsed into dropdown.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Grid, Download, Save, ZoomIn, ZoomOut,
  Move, MousePointer, Layers, Eye, EyeOff,
  Loader2, Check, Music, Route, LayoutGrid, Users, Magnet, Hash,
  Minus, CircleDot, Grid3x3, Map, Bot, Hand, WifiOff, Cloud,
  Undo2, Redo2, Settings2, Circle, Share2, Code2,
} from 'lucide-react';
import { FormationPresencePanel } from '../FormationPresencePanel';
import { useSyncStatus } from '@/store/slices/offlineSlice';

type Tool = 'select' | 'pan' | 'add' | 'line' | 'arc' | 'block';

interface CanvasToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  showRotation: boolean;
  setShowRotation: (show: boolean) => void;
  showPaths: boolean;
  setShowPaths: (show: boolean) => void;
  snapEnabled: boolean;
  setSnapEnabled: (snap: boolean) => void;
  timeDisplayMode: 'time' | 'counts';
  setTimeDisplayMode: (mode: 'time' | 'counts') => void;
  showFieldOverlay: boolean;
  setShowFieldOverlay: (show: boolean) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  formationName: string;
  onNameChange: (name: string) => void;
  isCollaborativeEnabled: boolean;
  collab: { collaborators: import('@/services/formation/yjs/formationYjsTypes').FormationAwarenessState[]; isConnected: boolean; isSyncing: boolean };
  currentUser: { id: string; name: string; color: string; avatar?: string } | null;
  showPerformerPanel: boolean;
  setShowPerformerPanel: (show: boolean) => void;
  showAudioPanel: boolean;
  setShowAudioPanel: (show: boolean) => void;
  hasAudioTrack: boolean;
  setShowTemplatePicker: (show: boolean) => void;
  setIsExportDialogOpen: (open: boolean) => void;
  onSave: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  apiSaving: boolean;
  showDraftPanel?: boolean;
  setShowDraftPanel?: (show: boolean) => void;
  draftStatus?: string;
  // New props
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasUnsavedChanges?: boolean;
  sandboxMode?: boolean;
  formationId?: string;
  fingerMode?: 'select' | 'pan';
  setFingerMode?: (mode: 'select' | 'pan') => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  activeTool, setActiveTool,
  showGrid, setShowGrid, showLabels, setShowLabels,
  showRotation, setShowRotation, showPaths, setShowPaths,
  snapEnabled, setSnapEnabled,
  timeDisplayMode, setTimeDisplayMode,
  showFieldOverlay, setShowFieldOverlay,
  zoom, onZoomIn, onZoomOut,
  formationName, onNameChange,
  isCollaborativeEnabled, collab, currentUser,
  showPerformerPanel, setShowPerformerPanel,
  showAudioPanel, setShowAudioPanel, hasAudioTrack,
  setShowTemplatePicker, setIsExportDialogOpen,
  onSave, saveStatus, apiSaving,
  showDraftPanel, setShowDraftPanel, draftStatus,
  onUndo, onRedo, canUndo = false, canRedo = false,
  hasUnsavedChanges = false, sandboxMode = false, formationId,
  fingerMode = 'select', setFingerMode,
}) => {
  const { t } = useTranslation('common');
  const [showViewOptions, setShowViewOptions] = useState(false);
  const viewOptionsRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (viewOptionsRef.current && !viewOptionsRef.current.contains(e.target as Node)) {
        setShowViewOptions(false);
      }
    };
    if (showViewOptions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showViewOptions]);

  // Count active view options for badge
  const activeViewCount = [showGrid, showLabels, showRotation, showPaths, snapEnabled, timeDisplayMode === 'counts', showFieldOverlay].filter(Boolean).length;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
      {/* Left: Drawing tools + Finger Mode + Undo/Redo + Zoom */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Drawing Tools */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
          <button onClick={() => setActiveTool('select')} className={`p-1.5 rounded ${activeTool === 'select' ? 'bg-white dark:bg-gray-600 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Select (V)">
            <MousePointer className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTool('pan')} className={`p-1.5 rounded ${activeTool === 'pan' ? 'bg-white dark:bg-gray-600 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Pan (H)">
            <Move className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTool('add')} className={`p-1.5 rounded ${activeTool === 'add' ? 'bg-white dark:bg-gray-600 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Add Performer">
            <Plus className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-500 mx-0.5 hidden sm:block" />
          <button onClick={() => setActiveTool('line')} className={`p-1.5 rounded hidden sm:block ${activeTool === 'line' ? 'bg-white dark:bg-gray-600 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Line Tool">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTool('arc')} className={`p-1.5 rounded hidden sm:block ${activeTool === 'arc' ? 'bg-white dark:bg-gray-600 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Arc Tool">
            <CircleDot className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTool('block')} className={`p-1.5 rounded hidden sm:block ${activeTool === 'block' ? 'bg-white dark:bg-gray-600 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`} title="Block Tool">
            <Grid3x3 className="w-4 h-4" />
          </button>
        </div>

        {/* Finger mode toggle (visible on touch devices via media query) */}
        {setFingerMode && (
          <button
            onClick={() => setFingerMode(fingerMode === 'select' ? 'pan' : 'select')}
            className={`p-1.5 rounded md:hidden ${fingerMode === 'pan' ? 'bg-blue-100 dark:bg-blue-900 text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
            title={fingerMode === 'select' ? 'Switch to pan mode' : 'Switch to select mode'}
          >
            {fingerMode === 'pan' ? <Hand className="w-4 h-4" /> : <MousePointer className="w-4 h-4" />}
          </button>
        )}

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded ${canUndo ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded ${canRedo ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />

        {/* Zoom */}
        <div className="flex items-center gap-0.5">
          <button onClick={onZoomOut} className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px] text-center tabular-nums hidden sm:inline">{Math.round(zoom * 100)}%</span>
          <button onClick={onZoomIn} className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center: Formation name + Collaboration status */}
      <div className="flex items-center gap-3 flex-shrink min-w-0">
        <input
          type="text"
          value={formationName}
          onChange={(e) => onNameChange(e.target.value)}
          className="px-2 py-0.5 text-center text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 outline-none min-w-0 max-w-[120px] sm:max-w-none"
          readOnly={sandboxMode}
        />
        {isCollaborativeEnabled && (
          <FormationPresencePanel
            collaborators={collab.collaborators}
            isConnected={collab.isConnected}
            isSyncing={collab.isSyncing}
            currentUser={currentUser || undefined}
          />
        )}
      </div>

      {/* Right: View Options dropdown + Panels + Export + Save */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* View Options Dropdown */}
        <div className="relative" ref={viewOptionsRef}>
          <button
            onClick={() => setShowViewOptions(!showViewOptions)}
            className={`flex items-center gap-1 p-1.5 rounded text-sm ${showViewOptions ? 'bg-gray-100 dark:bg-gray-700 text-blue-500' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="View Options"
          >
            <Settings2 className="w-4 h-4" />
            {activeViewCount > 0 && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full px-1 min-w-[16px] text-center">{activeViewCount}</span>
            )}
          </button>

          {showViewOptions && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
              <ViewToggleItem label="Grid" icon={<Grid className="w-4 h-4" />} active={showGrid} onClick={() => setShowGrid(!showGrid)} />
              <ViewToggleItem label="Labels" icon={showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} active={showLabels} onClick={() => setShowLabels(!showLabels)} />
              <ViewToggleItem label="Rotation Handles" icon={<Layers className="w-4 h-4" />} active={showRotation} onClick={() => setShowRotation(!showRotation)} />
              <ViewToggleItem label="Path Lines" icon={<Route className="w-4 h-4" />} active={showPaths} onClick={() => setShowPaths(!showPaths)} />
              <ViewToggleItem label="Snap to Grid" icon={<Magnet className="w-4 h-4" />} active={snapEnabled} onClick={() => setSnapEnabled(!snapEnabled)} />
              <ViewToggleItem label="Count Mode" icon={<Hash className="w-4 h-4" />} active={timeDisplayMode === 'counts'} onClick={() => setTimeDisplayMode(timeDisplayMode === 'time' ? 'counts' : 'time')} />
              <ViewToggleItem label="Field Overlay" icon={<Map className="w-4 h-4" />} active={showFieldOverlay} onClick={() => setShowFieldOverlay(!showFieldOverlay)} />
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />

        {/* Panel toggles */}
        <button onClick={() => setShowPerformerPanel(!showPerformerPanel)} className={`p-1.5 rounded ${showPerformerPanel ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`} title="Performers Panel">
          <Users className="w-4 h-4" />
        </button>
        <button onClick={() => setShowAudioPanel(!showAudioPanel)} className={`p-1.5 rounded ${hasAudioTrack ? 'text-green-500' : showAudioPanel ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`} title={hasAudioTrack ? 'Audio attached' : 'Add Audio'}>
          <Music className="w-4 h-4" />
        </button>
        <button onClick={() => setShowTemplatePicker(true)} className="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Formation Templates">
          <LayoutGrid className="w-4 h-4" />
        </button>
        {setShowDraftPanel && (
          <button
            onClick={() => setShowDraftPanel(!showDraftPanel)}
            className={`p-1.5 rounded ${showDraftPanel ? 'text-amber-500' : draftStatus && draftStatus !== 'idle' ? 'text-amber-400 animate-pulse' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            title="AI Draft Agent"
          >
            <Bot className="w-4 h-4" />
          </button>
        )}

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />

        {/* Export + Save */}
        {!sandboxMode ? (
          <>
            {formationId && (
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/share/${formationId}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    // Brief visual feedback (button will flash)
                  } catch {
                    // Fallback: select a temporary input
                    const input = document.createElement('input');
                    input.value = url;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Copy share link"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-xs hidden sm:inline">Share</span>
              </button>
            )}
            {formationId && (
              <button
                onClick={async () => {
                  const embedCode = `<iframe src="${window.location.origin}/embed/${formationId}" width="800" height="500" frameBorder="0" allow="autoplay" style="border-radius:8px;border:1px solid #374151"></iframe>`;
                  try {
                    await navigator.clipboard.writeText(embedCode);
                  } catch {
                    const input = document.createElement('textarea');
                    input.value = embedCode;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Copy embed code"
              >
                <Code2 className="w-4 h-4" />
                <span className="text-xs hidden sm:inline">Embed</span>
              </button>
            )}
            <button onClick={() => setIsExportDialogOpen(true)} className="flex items-center gap-1 px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              <Download className="w-4 h-4" />
              <span className="text-xs hidden sm:inline">{t('formation.export', 'Export')}</span>
            </button>

            {/* Offline/Sync indicator */}
            <OfflineBadge />
            {/* Save status indicator */}
            <div className="flex items-center gap-1.5">
              {hasUnsavedChanges && saveStatus === 'idle' && (
                <span className="flex items-center gap-1 text-xs text-amber-500">
                  <Circle className="w-2 h-2 fill-current" />
                  Unsaved
                </span>
              )}
              <button
                onClick={onSave}
                disabled={saveStatus === 'saving' || apiSaving}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs transition-colors ${saveStatus === 'saved' ? 'bg-green-500 text-white' : saveStatus === 'error' ? 'bg-red-500 text-white' : saveStatus === 'saving' || apiSaving ? 'bg-blue-400 text-white cursor-wait' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
              >
                {saveStatus === 'saving' || apiSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveStatus === 'saved' ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{saveStatus === 'saving' || apiSaving ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Failed' : 'Save'}</span>
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => {/* TODO: navigate to signup */}}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Sign up to save</span>
          </button>
        )}
      </div>
    </div>
  );
};

/** Compact offline/sync badge shown next to save button */
function OfflineBadge() {
  const { isOnline, pendingCount, syncStatus } = useSyncStatus();

  if (isOnline && pendingCount === 0) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        !isOnline
          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
          : syncStatus === 'syncing'
            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
      }`}
      title={!isOnline ? 'You are offline. Changes are saved locally.' : `${pendingCount} pending changes to sync`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-3 h-3" />
          <span className="hidden sm:inline">Offline</span>
        </>
      ) : syncStatus === 'syncing' ? (
        <>
          <Cloud className="w-3 h-3 animate-pulse" />
          <span className="hidden sm:inline">Syncing</span>
        </>
      ) : (
        <>
          <Cloud className="w-3 h-3" />
          <span className="hidden sm:inline">{pendingCount}</span>
        </>
      )}
    </span>
  );
}

/** Individual toggle item for the View Options dropdown */
function ViewToggleItem({ label, icon, active, onClick }: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50"
    >
      <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        {icon}
        {label}
      </span>
      <span className={`w-8 h-4 rounded-full transition-colors relative ${active ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}
