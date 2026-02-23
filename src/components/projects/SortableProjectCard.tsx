/**
 * SortableProjectCard — Drag-and-drop wrapper for ProjectCard
 *
 * Uses @dnd-kit/sortable for accessible reordering.
 * Sprint 54: Project list drag-and-drop
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableProjectCardProps {
  id: string;
  children: React.ReactNode;
}

export function SortableProjectCard({ id, children }: SortableProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-white/80 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-grab active:cursor-grabbing opacity-0 group-hover/card:opacity-100 transition-opacity focus:opacity-100"
        aria-label="Drag to reorder"
        aria-roledescription="sortable"
      >
        <GripVertical className="w-4 h-4" aria-hidden="true" />
      </button>
      <div className="group/card">
        {children}
      </div>
    </div>
  );
}
