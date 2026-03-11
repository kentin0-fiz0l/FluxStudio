/**
 * FormationLibraryPanel - Grid panel for browsing and applying saved formations
 *
 * Features: save current, search/filter, preview via ghost pipeline, apply,
 * rename, edit tags, delete, import/export JSON.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Download,
  Upload,
  Trash2,
  Edit2,
  X,
  MoreHorizontal,
  Check,
  Tag,
} from 'lucide-react';
import type { Position } from '@/services/formationTypes';
import { useFormationLibrary, type SavedFormation } from '@/store/slices/formationLibrarySlice';
import { useGhostPreview } from '@/store/slices/ghostPreviewSlice';

// ============================================================================
// Types
// ============================================================================

interface FormationLibraryPanelProps {
  currentPositions: Map<string, Position>;
  performerIds: string[];
  onClose?: () => void;
}

// ============================================================================
// Save Dialog
// ============================================================================

function SaveDialog({
  onSave,
  onCancel,
}: {
  onSave: (name: string, tags: string[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [tagInput, setTagInput] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSave(name.trim(), tags);
  };

  return (
    <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Save Current Formation</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Formation name..."
        className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 mb-2 outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
      />
      <input
        type="text"
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        placeholder="Tags (comma separated)..."
        className="w-full text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 mb-2 outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-1.5">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="flex-1 text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Formation Card
// ============================================================================

function FormationCard({
  formation,
  onPreview,
  onApply,
  onRename,
  onEditTags,
  onDelete,
}: {
  formation: SavedFormation;
  onPreview: () => void;
  onApply: () => void;
  onRename: (name: string) => void;
  onEditTags: (tags: string[]) => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editName, setEditName] = useState(formation.name);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editTagInput, setEditTagInput] = useState(formation.tags.join(', '));

  const handleRenameSubmit = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setIsRenaming(false);
  };

  const handleTagsSubmit = () => {
    const tags = editTagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onEditTags(tags);
    setIsEditingTags(false);
  };

  return (
    <div
      className="group relative border border-gray-200 dark:border-gray-700 rounded-lg p-2 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors"
      onClick={onPreview}
      onDoubleClick={onApply}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded mb-1.5 flex items-center justify-center overflow-hidden">
        {formation.thumbnail ? (
          <img src={formation.thumbnail} alt={formation.name} className="w-full h-full object-contain" />
        ) : (
          <BookOpen className="w-6 h-6 text-gray-400" />
        )}
      </div>

      {/* Name */}
      {isRenaming ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit();
            if (e.key === 'Escape') setIsRenaming(false);
          }}
          className="w-full text-[10px] px-1 py-0.5 rounded border border-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300 truncate">
          {formation.name}
        </p>
      )}

      {/* Tags */}
      {isEditingTags ? (
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editTagInput}
            onChange={(e) => setEditTagInput(e.target.value)}
            onBlur={handleTagsSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTagsSubmit();
              if (e.key === 'Escape') setIsEditingTags(false);
            }}
            className="w-full text-[9px] px-1 py-0.5 rounded border border-blue-400 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 outline-none mt-0.5"
            autoFocus
          />
        </div>
      ) : (
        formation.tags.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-0.5">
            {formation.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-block px-1 py-px text-[8px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )
      )}

      <p className="text-[8px] text-gray-400 mt-0.5">{formation.performerCount} performers</p>

      {/* Context menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-0.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-opacity"
      >
        <MoreHorizontal className="w-3 h-3" />
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <div
          className="absolute top-7 right-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[100px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onApply(); setShowMenu(false); }}
            className="w-full text-left px-3 py-1.5 text-[10px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5"
          >
            <Check className="w-3 h-3" /> Apply
          </button>
          <button
            onClick={() => { setIsRenaming(true); setShowMenu(false); }}
            className="w-full text-left px-3 py-1.5 text-[10px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5"
          >
            <Edit2 className="w-3 h-3" /> Rename
          </button>
          <button
            onClick={() => { setIsEditingTags(true); setShowMenu(false); }}
            className="w-full text-left px-3 py-1.5 text-[10px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5"
          >
            <Tag className="w-3 h-3" /> Edit Tags
          </button>
          <button
            onClick={() => { onDelete(); setShowMenu(false); }}
            className="w-full text-left px-3 py-1.5 text-[10px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1.5"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Panel
// ============================================================================

export function FormationLibraryPanel({
  currentPositions,
  performerIds,
  onClose,
}: FormationLibraryPanelProps) {
  const library = useFormationLibrary();
  const ghostPreview = useGhostPreview();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter formations by search query
  const filtered = library.savedFormations.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleSave = useCallback(
    (name: string, tags: string[]) => {
      library.saveFormation({
        name,
        positions: Array.from(currentPositions.entries()),
        performerCount: performerIds.length,
        tags,
      });
      setShowSaveDialog(false);
    },
    [library, currentPositions, performerIds],
  );

  const handlePreview = useCallback(
    (formation: SavedFormation) => {
      const posMap = new Map(formation.positions);
      ghostPreview.setPreview({
        id: `library-${formation.id}`,
        source: 'prompt',
        sourceLabel: `Library: ${formation.name}`,
        proposedPositions: posMap,
        affectedPerformerIds: Array.from(posMap.keys()),
      });
    },
    [ghostPreview],
  );

  const handleExport = useCallback(() => {
    const data = library.exportLibrary();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formation-library.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [library]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (Array.isArray(data)) {
            library.importLibrary(data);
          }
        } catch {
          // Silently ignore invalid JSON
        }
      };
      reader.readAsText(file);
      // Reset input so same file can be re-imported
      e.target.value = '';
    },
    [library],
  );

  return (
    <div className="w-[300px] h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Library</span>
          <span className="text-[10px] text-gray-400">({library.savedFormations.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="p-1 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title="Save current formation"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Import library"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleExport}
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Export library"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
          <Search className="w-3 h-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or tag..."
            className="flex-1 text-xs bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="px-3 pb-2">
          <SaveDialog onSave={handleSave} onCancel={() => setShowSaveDialog(false)} />
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {library.savedFormations.length === 0
                ? 'No saved formations yet'
                : 'No formations match your search'}
            </p>
            {library.savedFormations.length === 0 && (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="mt-2 text-xs text-blue-500 hover:text-blue-600"
              >
                Save your first formation
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((formation) => (
              <FormationCard
                key={formation.id}
                formation={formation}
                onPreview={() => handlePreview(formation)}
                onApply={() => handlePreview(formation)}
                onRename={(name) => library.renameFormation(formation.id, name)}
                onEditTags={(tags) => library.updateTags(formation.id, tags)}
                onDelete={() => library.deleteFormation(formation.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FormationLibraryPanel;
