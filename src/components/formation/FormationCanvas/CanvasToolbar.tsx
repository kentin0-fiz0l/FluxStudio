/**
 * Canvas Toolbar - tool selection, view toggles, zoom, save/export controls
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Grid, Download, Save, ZoomIn, ZoomOut,
  Move, MousePointer, Layers, Eye, EyeOff,
  Loader2, Check, Music, Route, LayoutGrid, Users,
} from 'lucide-react';
import { FormationPresencePanel } from '../FormationPresencePanel';

type Tool = 'select' | 'pan' | 'add';

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
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  formationName: string;
  onNameChange: (name: string) => void;
  isCollaborativeEnabled: boolean;
  collab: { collaborators: any[]; isConnected: boolean; isSyncing: boolean };
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
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  activeTool, setActiveTool,
  showGrid, setShowGrid, showLabels, setShowLabels,
  showRotation, setShowRotation, showPaths, setShowPaths,
  zoom, onZoomIn, onZoomOut,
  formationName, onNameChange,
  isCollaborativeEnabled, collab, currentUser,
  showPerformerPanel, setShowPerformerPanel,
  showAudioPanel, setShowAudioPanel, hasAudioTrack,
  setShowTemplatePicker, setIsExportDialogOpen,
  onSave, saveStatus, apiSaving,
}) => {
  const { t } = useTranslation('common');

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Left: Tools */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button onClick={() => setActiveTool('select')} className={`p-2 rounded ${activeTool === 'select' ? 'bg-white dark:bg-gray-600 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`} title={t('formation.selectTool', 'Select')}>
            <MousePointer className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTool('pan')} className={`p-2 rounded ${activeTool === 'pan' ? 'bg-white dark:bg-gray-600 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`} title={t('formation.panTool', 'Pan')}>
            <Move className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTool('add')} className={`p-2 rounded ${activeTool === 'add' ? 'bg-white dark:bg-gray-600 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`} title={t('formation.addTool', 'Add Performer')}>
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        <button onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded ${showGrid ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`} title={t('formation.toggleGrid', 'Toggle Grid')}>
          <Grid className="w-4 h-4" />
        </button>
        <button onClick={() => setShowLabels(!showLabels)} className={`p-2 rounded ${showLabels ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`} title={t('formation.toggleLabels', 'Toggle Labels')}>
          {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button onClick={() => setShowRotation(!showRotation)} className={`p-2 rounded ${showRotation ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`} title={t('formation.toggleRotation', 'Toggle Rotation Handles')}>
          <Layers className="w-4 h-4" />
        </button>
        <button onClick={() => setShowPaths(!showPaths)} className={`p-2 rounded ${showPaths ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`} title={t('formation.togglePaths', 'Toggle Path Lines')}>
          <Route className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        <button onClick={onZoomOut} className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={onZoomIn} className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Center: Formation name + Collaboration status */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={formationName}
          onChange={(e) => onNameChange(e.target.value)}
          className="px-3 py-1 text-center font-medium bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 outline-none"
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

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowPerformerPanel(!showPerformerPanel)} className={`p-2 rounded ${showPerformerPanel ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`} title={t('formation.togglePerformers', 'Toggle Performers Panel')}>
          <Users className="w-4 h-4" />
        </button>
        <button onClick={() => setShowAudioPanel(!showAudioPanel)} className={`p-2 rounded ${hasAudioTrack ? 'text-green-500' : showAudioPanel ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`} title={hasAudioTrack ? t('formation.hasAudio', 'Audio attached') : t('formation.addAudio', 'Add Audio')}>
          <Music className="w-4 h-4" />
        </button>
        <button onClick={() => setShowTemplatePicker(true)} className="p-2 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title={t('formation.templates', 'Formation Templates')}>
          <LayoutGrid className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        <button onClick={() => setIsExportDialogOpen(true)} className="flex items-center gap-1 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          <Download className="w-4 h-4" />
          <span className="text-sm">{t('formation.export', 'Export')}</span>
        </button>
        <button
          onClick={onSave}
          disabled={saveStatus === 'saving' || apiSaving}
          className={`flex items-center gap-1 px-4 py-1.5 rounded-lg transition-colors ${saveStatus === 'saved' ? 'bg-green-500 text-white' : saveStatus === 'error' ? 'bg-red-500 text-white' : saveStatus === 'saving' || apiSaving ? 'bg-blue-400 text-white cursor-wait' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
        >
          {saveStatus === 'saving' || apiSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveStatus === 'saved' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span className="text-sm">{saveStatus === 'saving' || apiSaving ? t('actions.saving', 'Saving...') : saveStatus === 'saved' ? t('actions.saved', 'Saved!') : saveStatus === 'error' ? t('actions.saveFailed', 'Save Failed') : t('actions.save', 'Save')}</span>
        </button>
      </div>
    </div>
  );
};
