import {
  Users,
  Save,
  Eye,
  Edit,
  MessageCircle,
  Undo,
  Redo
} from 'lucide-react';
import { getFileIcon } from './editor-utils';
import type { Collaborator } from './editor-types';

interface EditorHeaderProps {
  fileName: string;
  currentVersion: number;
  isModified: boolean;
  collaborators: Collaborator[];
  userId: string | undefined;
  editorMode: 'edit' | 'preview';
  setEditorMode: (mode: 'edit' | 'preview') => void;
  showComments: boolean;
  setShowComments: (show: boolean) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  undoStack: string[];
  redoStack: string[];
  setShowSaveModal: (show: boolean) => void;
  onClose: () => void;
  mimeType: string;
}

export function EditorHeader({
  fileName,
  currentVersion,
  isModified,
  collaborators,
  userId,
  editorMode,
  setEditorMode,
  showComments,
  setShowComments,
  handleUndo,
  handleRedo,
  undoStack,
  redoStack,
  setShowSaveModal,
  onClose,
  mimeType,
}: EditorHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-white/10">
      <div className="flex items-center space-x-3">
        {getFileIcon(mimeType)}
        <div>
          <h2 className="text-xl font-bold text-white">{fileName}</h2>
          <div className="flex items-center space-x-4 text-sm text-white/60">
            <span>Version {currentVersion}</span>
            <span>{isModified ? 'Modified' : 'Saved'}</span>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" aria-hidden="true" />
              <span>{collaborators.length} collaborators</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Collaborators */}
        <div className="flex items-center space-x-2">
          {collaborators.slice(0, 3).map(collaborator => (
            <div
              key={collaborator.id}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                collaborator.isTyping ? 'ring-2 ring-blue-400 animate-pulse' : ''
              } ${
                collaborator.id === userId ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'
              }`}
              title={`${collaborator.name}${collaborator.isTyping ? ' (typing...)' : ''}`}
            >
              {collaborator.name[0]}
            </div>
          ))}
          {collaborators.length > 3 && (
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
              +{collaborators.length - 3}
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setEditorMode('edit')}
            className={`px-3 py-1 rounded text-sm ${
              editorMode === 'edit' ? 'bg-blue-500 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <Edit className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => setEditorMode('preview')}
            className={`px-3 py-1 rounded text-sm ${
              editorMode === 'preview' ? 'bg-blue-500 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Actions */}
        <button
          onClick={() => setShowComments(!showComments)}
          className={`p-2 rounded-lg transition-colors ${
            showComments ? 'bg-blue-500 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <MessageCircle className="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          onClick={handleUndo}
          disabled={undoStack.length <= 1}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Undo className="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Redo className="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          onClick={() => setShowSaveModal(true)}
          disabled={!isModified}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <Save className="w-4 h-4" aria-hidden="true" />
          <span>Save</span>
        </button>

        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-2xl"
        >
          ×
        </button>
      </div>
    </div>
  );
}
