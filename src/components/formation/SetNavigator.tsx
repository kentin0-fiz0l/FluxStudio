/**
 * SetNavigator - Horizontal strip of drill set blocks for navigation.
 *
 * Displays drill sets as clickable blocks with name, count duration,
 * and optional rehearsal marks. Supports right-click context menus
 * for editing, inserting, and deleting sets.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, Edit3, ArrowLeftToLine, ArrowRightToLine } from 'lucide-react';
import type { DrillSet } from '../../services/formationTypes';

export interface SetNavigatorProps {
  sets: DrillSet[];
  currentSetId: string | null;
  onSetSelect: (setId: string) => void;
  onSetUpdate: (setId: string, updates: Partial<DrillSet>) => void;
  onSetAdd: (afterIndex?: number) => void;
  onSetRemove: (setId: string) => void;
  onSetsReorder: (fromIndex: number, toIndex: number) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  setId: string;
  setIndex: number;
}

export function SetNavigator({
  sets,
  currentSetId,
  onSetSelect,
  onSetUpdate: _onSetUpdate,
  onSetAdd,
  onSetRemove,
  onSetsReorder: _onSetsReorder,
}: SetNavigatorProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    setId: '',
    setIndex: -1,
  });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenu.visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu.visible]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, setId: string, setIndex: number) => {
      e.preventDefault();
      e.stopPropagation();

      // Position the context menu near the click, but within container bounds
      const containerRect = containerRef.current?.getBoundingClientRect();
      const x = containerRect
        ? Math.min(e.clientX - containerRect.left, containerRect.width - 180)
        : e.clientX;
      const y = containerRect
        ? e.clientY - containerRect.top
        : e.clientY;

      setContextMenu({
        visible: true,
        x,
        y,
        setId,
        setIndex,
      });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleInsertBefore = useCallback(() => {
    const idx = contextMenu.setIndex;
    onSetAdd(idx > 0 ? idx - 1 : undefined);
    closeContextMenu();
  }, [contextMenu.setIndex, onSetAdd, closeContextMenu]);

  const handleInsertAfter = useCallback(() => {
    onSetAdd(contextMenu.setIndex);
    closeContextMenu();
  }, [contextMenu.setIndex, onSetAdd, closeContextMenu]);

  const handleDelete = useCallback(() => {
    onSetRemove(contextMenu.setId);
    closeContextMenu();
  }, [contextMenu.setId, onSetRemove, closeContextMenu]);

  const handleEdit = useCallback(() => {
    // Select the set so the parent can open an edit panel
    onSetSelect(contextMenu.setId);
    closeContextMenu();
  }, [contextMenu.setId, onSetSelect, closeContextMenu]);

  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div ref={containerRef} className="relative mb-2">
      {/* Scrollable set strip */}
      <div className="flex items-center gap-1 overflow-x-auto py-1 px-1 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        {sortedSets.map((set, index) => {
          const isCurrent = set.id === currentSetId;
          return (
            <button
              key={set.id}
              onClick={() => onSetSelect(set.id)}
              onContextMenu={(e) => handleContextMenu(e, set.id, index)}
              className={`
                shrink-0 flex flex-col items-center justify-center
                px-3 py-1.5 rounded-md text-xs font-medium
                transition-colors cursor-pointer select-none
                min-w-[64px]
                ${
                  isCurrent
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                }
              `}
              title={set.notes || set.name}
            >
              {/* Rehearsal mark badge */}
              {set.rehearsalMark && (
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${
                    isCurrent
                      ? 'text-blue-100'
                      : 'text-indigo-500 dark:text-indigo-400'
                  }`}
                >
                  {set.rehearsalMark}
                </span>
              )}

              {/* Set name */}
              <span className="truncate max-w-[80px]">{set.label || set.name}</span>

              {/* Count duration */}
              <span
                className={`text-[10px] mt-0.5 ${
                  isCurrent
                    ? 'text-blue-200'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {set.counts} cts
              </span>
            </button>
          );
        })}

        {/* Add set button */}
        <button
          onClick={() => onSetAdd()}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Add set"
          title="Add set"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="absolute z-50 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[160px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y + 28}px`,
          }}
        >
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Set
          </button>
          <button
            onClick={handleInsertBefore}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <ArrowLeftToLine className="w-3.5 h-3.5" />
            Insert Before
          </button>
          <button
            onClick={handleInsertAfter}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <ArrowRightToLine className="w-3.5 h-3.5" />
            Insert After
          </button>
          <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Set
          </button>
        </div>
      )}
    </div>
  );
}

export default SetNavigator;
