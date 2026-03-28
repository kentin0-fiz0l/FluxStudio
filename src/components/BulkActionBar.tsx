/**
 * BulkActionBar - Actions for multiple selected items
 */

// React import not needed with JSX transform
import { useState } from 'react';
import { X, Trash2, Archive, FolderInput, Tag, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onMove?: () => void;
  onTag?: () => void;
  onStatusChange?: (status: string) => void;
  className?: string;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export function BulkActionBar({
  selectedCount,
  onClear,
  onDelete,
  onArchive,
  onMove,
  onTag,
  onStatusChange,
  className,
}: BulkActionBarProps) {
  const [showStatusSelect, setShowStatusSelect] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900',
        'rounded-full shadow-2xl border border-neutral-800 dark:border-neutral-200',
        'px-6 py-3 flex items-center gap-4',
        'animate-in slide-in-from-bottom-4 duration-300',
        className
      )}
      role="toolbar"
      aria-label="Bulk actions"
    >
      {/* Selected Count */}
      <div className="flex items-center gap-2">
        <span className="font-semibold">{selectedCount}</span>
        <span className="text-sm opacity-90">selected</span>
      </div>

      <div className="h-6 w-px bg-neutral-700 dark:bg-neutral-300" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onStatusChange && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStatusSelect(!showStatusSelect)}
              className="text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200"
              aria-label="Change status of selected items"
            >
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              Status
            </Button>
            {showStatusSelect && (
              <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 min-w-[140px]">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onStatusChange(opt.value);
                      setShowStatusSelect(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {onMove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMove}
            className="text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200"
            aria-label="Move selected items"
          >
            <FolderInput className="w-4 h-4 mr-2" aria-hidden="true" />
            Move
          </Button>
        )}

        {onTag && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onTag}
            className="text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200"
            aria-label="Tag selected items"
          >
            <Tag className="w-4 h-4 mr-2" aria-hidden="true" />
            Tag
          </Button>
        )}

        {onArchive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onArchive}
            className="text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200"
            aria-label="Archive selected items"
          >
            <Archive className="w-4 h-4 mr-2" aria-hidden="true" />
            Archive
          </Button>
        )}

        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            aria-label="Delete selected items"
          >
            <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
            Delete
          </Button>
        )}
      </div>

      <div className="h-6 w-px bg-neutral-700 dark:bg-neutral-300" />

      {/* Clear */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClear}
        className="text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 w-8 h-8"
        aria-label="Clear selection"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
