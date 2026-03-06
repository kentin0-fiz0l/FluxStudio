/**
 * SetNavigator - Horizontal strip of drill set blocks for navigation.
 *
 * Displays drill sets as clickable blocks with name, count duration,
 * and optional rehearsal marks. Supports:
 * - Right-click context menu: Insert Before, Insert After, Delete Set, Edit Properties
 * - Double-click to open SetPropertiesPanel
 * - Drag-to-reorder with visual drop indicator
 * - "Add Set" button that creates a new keyframe + DrillSet atomically
 * - Rehearsal mark badges
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  ArrowLeftToLine,
  ArrowRightToLine,
  GripVertical,
} from 'lucide-react';
import type { DrillSet } from '../../services/formationTypes';

// ============================================================================
// Types
// ============================================================================

export interface SetNavigatorProps {
  sets: DrillSet[];
  currentSetId: string | null;
  onSetSelect: (setId: string) => void;
  onSetUpdate: (setId: string, updates: Partial<DrillSet>) => void;
  onSetAdd: (afterIndex?: number) => void;
  onSetRemove: (setId: string) => void;
  onSetsReorder: (fromIndex: number, toIndex: number) => void;
  /** Called when user double-clicks a set or selects "Edit Properties" from context menu */
  onEditProperties?: (setId: string) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  setId: string;
  setIndex: number;
}

interface DragState {
  /** Index of the set currently being dragged */
  dragIndex: number | null;
  /** Index where the drop indicator should appear */
  dropIndex: number | null;
}

// ============================================================================
// Main Component
// ============================================================================

export function SetNavigator({
  sets,
  currentSetId,
  onSetSelect,
  onSetUpdate: _onSetUpdate,
  onSetAdd,
  onSetRemove,
  onSetsReorder,
  onEditProperties,
}: SetNavigatorProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    setId: '',
    setIndex: -1,
  });
  const [drag, setDrag] = useState<DragState>({
    dragIndex: null,
    dropIndex: null,
  });

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const doubleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickIdRef = useRef<string | null>(null);

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

  // ---- Context Menu handlers ----

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, setId: string, setIndex: number) => {
      e.preventDefault();
      e.stopPropagation();

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
    [],
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

  const handleEditProperties = useCallback(() => {
    if (onEditProperties) {
      onEditProperties(contextMenu.setId);
    } else {
      // Fallback: select the set
      onSetSelect(contextMenu.setId);
    }
    closeContextMenu();
  }, [contextMenu.setId, onEditProperties, onSetSelect, closeContextMenu]);

  // ---- Click / Double-click handling ----

  const handleClick = useCallback(
    (setId: string) => {
      // Check for double-click (two clicks on same set within 300ms)
      if (lastClickIdRef.current === setId && doubleClickTimerRef.current) {
        // Double click detected
        clearTimeout(doubleClickTimerRef.current);
        doubleClickTimerRef.current = null;
        lastClickIdRef.current = null;
        if (onEditProperties) {
          onEditProperties(setId);
        }
        return;
      }

      // First click: select and start double-click timer
      lastClickIdRef.current = setId;
      onSetSelect(setId);

      if (doubleClickTimerRef.current) {
        clearTimeout(doubleClickTimerRef.current);
      }
      doubleClickTimerRef.current = setTimeout(() => {
        lastClickIdRef.current = null;
        doubleClickTimerRef.current = null;
      }, 300);
    },
    [onSetSelect, onEditProperties],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (doubleClickTimerRef.current) {
        clearTimeout(doubleClickTimerRef.current);
      }
    };
  }, []);

  // ---- Drag-to-reorder handlers ----

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
      setDrag({ dragIndex: index, dropIndex: null });
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (drag.dragIndex === null || drag.dragIndex === index) {
        setDrag((prev) => ({ ...prev, dropIndex: null }));
        return;
      }

      setDrag((prev) => ({ ...prev, dropIndex: index }));
    },
    [drag.dragIndex],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = drag.dragIndex;
      if (fromIndex !== null && fromIndex !== toIndex) {
        onSetsReorder(fromIndex, toIndex);
      }
      setDrag({ dragIndex: null, dropIndex: null });
    },
    [drag.dragIndex, onSetsReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDrag({ dragIndex: null, dropIndex: null });
  }, []);

  // ---- Render ----

  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div ref={containerRef} className="relative mb-2">
      {/* Scrollable set strip */}
      <div className="flex items-center gap-1 overflow-x-auto py-1 px-1 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        {sortedSets.map((set, index) => {
          const isCurrent = set.id === currentSetId;
          const isDragging = drag.dragIndex === index;
          const isDropTarget = drag.dropIndex === index;

          return (
            <div
              key={set.id}
              className="relative shrink-0"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Drop indicator (left edge) */}
              {isDropTarget && drag.dragIndex !== null && drag.dragIndex > index && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-full z-10 -translate-x-1" />
              )}

              <button
                onClick={() => handleClick(set.id)}
                onContextMenu={(e) => handleContextMenu(e, set.id, index)}
                className={`
                  flex flex-col items-center justify-center
                  px-3 py-1.5 rounded-md text-xs font-medium
                  transition-all cursor-pointer select-none
                  min-w-[64px]
                  ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}
                  ${
                    isCurrent
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  }
                `}
                title={set.notes || set.name}
              >
                {/* Drag grip indicator */}
                <div className="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-100 hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-2.5 h-2.5 text-gray-400" />
                </div>

                {/* Rehearsal mark badge */}
                {set.rehearsalMark && (
                  <span
                    className={`
                      inline-block px-1.5 py-0 rounded-sm text-[9px] font-bold uppercase tracking-wider mb-0.5
                      ${
                        isCurrent
                          ? 'bg-blue-400/30 text-blue-100'
                          : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                      }
                    `}
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

              {/* Drop indicator (right edge) */}
              {isDropTarget && drag.dragIndex !== null && drag.dragIndex < index && (
                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-full z-10 translate-x-1" />
              )}
            </div>
          );
        })}

        {/* Add set button */}
        <button
          onClick={() => onSetAdd()}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Add set"
          title="Add set (creates new keyframe)"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="absolute z-50 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[180px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y + 28}px`,
          }}
        >
          <button
            onClick={handleEditProperties}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Properties
          </button>
          <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
          <button
            onClick={handleInsertBefore}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <ArrowLeftToLine className="w-3.5 h-3.5" />
            Insert Set Before
          </button>
          <button
            onClick={handleInsertAfter}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <ArrowRightToLine className="w-3.5 h-3.5" />
            Insert Set After
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
