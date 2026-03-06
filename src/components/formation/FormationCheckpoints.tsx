/**
 * FormationCheckpoints Component
 *
 * Named checkpoints for formation editing sessions.
 * Users can save, name, and restore checkpoints collaboratively.
 * Checkpoints are stored in the Yjs meta map for real-time sync.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Check,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface Checkpoint {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  createdBy: string;
  createdByName: string;
  /** Snapshot data identifier (for Yjs restore) */
  snapshotId?: string;
}

interface FormationCheckpointsProps {
  /** List of saved checkpoints */
  checkpoints: Checkpoint[];
  /** Save a new checkpoint with a name */
  onSave: (name: string, description?: string) => void;
  /** Restore to a specific checkpoint */
  onRestore: (id: string) => void;
  /** Optional: delete a checkpoint */
  onDelete?: (id: string) => void;
  /** Whether save/restore operations are in progress */
  isBusy?: boolean;
  /** Optional class name */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ============================================================================
// Save Checkpoint Form
// ============================================================================

interface SaveCheckpointFormProps {
  onSave: (name: string, description?: string) => void;
  onCancel: () => void;
  isBusy?: boolean;
}

function SaveCheckpointForm({ onSave, onCancel, isBusy }: SaveCheckpointFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) return;
      onSave(trimmed, description.trim() || undefined);
      setName('');
      setDescription('');
    },
    [name, description, onSave],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel],
  );

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Checkpoint name..."
          maxLength={60}
          className="flex-1 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
          aria-label="Checkpoint name"
          disabled={isBusy}
        />
      </div>

      {showDescription ? (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          maxLength={200}
          rows={2}
          className="w-full px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 resize-none"
          aria-label="Checkpoint description"
          disabled={isBusy}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowDescription(true)}
          className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          + Add description
        </button>
      )}

      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
          disabled={isBusy}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isBusy}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 outline-none transition-colors"
        >
          <Check className="w-3 h-3" aria-hidden="true" />
          Save
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Checkpoint Item
// ============================================================================

interface CheckpointItemProps {
  checkpoint: Checkpoint;
  onRestore: (id: string) => void;
  onDelete?: (id: string) => void;
  isBusy?: boolean;
  isFirst?: boolean;
}

function CheckpointItem({ checkpoint, onRestore, onDelete, isBusy, isFirst }: CheckpointItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleRestore = useCallback(() => {
    if (confirmRestore) {
      onRestore(checkpoint.id);
      setConfirmRestore(false);
    } else {
      setConfirmRestore(true);
      // Auto-dismiss confirmation after 3 seconds
      setTimeout(() => setConfirmRestore(false), 3000);
    }
  }, [checkpoint.id, confirmRestore, onRestore]);

  const handleDelete = useCallback(() => {
    if (confirmDelete) {
      onDelete?.(checkpoint.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }, [checkpoint.id, confirmDelete, onDelete]);

  return (
    <div
      className={`border border-gray-100 dark:border-gray-700 rounded-lg transition-colors ${
        isFirst ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      <div className="flex items-center gap-2 p-2">
        {isFirst ? (
          <BookmarkCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" aria-hidden="true" />
        ) : (
          <Bookmark className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" aria-hidden="true" />
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 min-w-0 text-left focus-visible:ring-2 focus-visible:ring-blue-500 outline-none rounded"
        >
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {checkpoint.name}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {timeAgo(checkpoint.createdAt)} by {checkpoint.createdByName}
          </p>
        </button>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={handleRestore}
            disabled={isBusy}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none ${
              confirmRestore
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={confirmRestore ? 'Click again to confirm restore' : 'Restore to this checkpoint'}
            aria-label={confirmRestore ? 'Confirm restore' : `Restore checkpoint: ${checkpoint.name}`}
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            {confirmRestore ? 'Confirm' : 'Restore'}
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
            aria-expanded={expanded}
            aria-label="Toggle checkpoint details"
          >
            {expanded ? (
              <ChevronUp className="w-3 h-3" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3 h-3" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-2 pb-2 pt-0 border-t border-gray-100 dark:border-gray-700 mt-0">
          {checkpoint.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 mb-1">
              {checkpoint.description}
            </p>
          )}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              {formatTimestamp(checkpoint.createdAt)}
            </span>

            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={isBusy}
                className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded transition-colors focus-visible:ring-2 focus-visible:ring-red-500 outline-none ${
                  confirmDelete
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                aria-label={confirmDelete ? 'Confirm delete' : `Delete checkpoint: ${checkpoint.name}`}
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
                {confirmDelete ? 'Confirm' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function FormationCheckpoints({
  checkpoints,
  onSave,
  onRestore,
  onDelete,
  isBusy = false,
  className = '',
}: FormationCheckpointsProps) {
  const [showSaveForm, setShowSaveForm] = useState(false);

  // Sort checkpoints by creation time, most recent first
  const sortedCheckpoints = [...checkpoints].sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  const handleSave = useCallback(
    (name: string, description?: string) => {
      onSave(name, description);
      setShowSaveForm(false);
    },
    [onSave],
  );

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Checkpoints
          </span>
          {checkpoints.length > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-full px-1.5 py-0.5">
              {checkpoints.length}
            </span>
          )}
        </div>

        {!showSaveForm && (
          <button
            onClick={() => setShowSaveForm(true)}
            disabled={isBusy}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 outline-none transition-colors"
            aria-label="Save checkpoint"
          >
            <Plus className="w-3 h-3" aria-hidden="true" />
            Save
          </button>
        )}
      </div>

      {/* Save Form */}
      {showSaveForm && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <SaveCheckpointForm
            onSave={handleSave}
            onCancel={() => setShowSaveForm(false)}
            isBusy={isBusy}
          />
        </div>
      )}

      {/* Checkpoint List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {sortedCheckpoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Save className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" aria-hidden="true" />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              No checkpoints yet
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              Save a checkpoint to create a restore point
            </p>
          </div>
        ) : (
          sortedCheckpoints.map((checkpoint, index) => (
            <CheckpointItem
              key={checkpoint.id}
              checkpoint={checkpoint}
              onRestore={onRestore}
              onDelete={onDelete}
              isBusy={isBusy}
              isFirst={index === 0}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default FormationCheckpoints;
