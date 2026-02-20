/**
 * SnapshotPanel — Collapsible panel for creating and restoring named checkpoints.
 *
 * Sprint 33: Users can save, list, restore, and delete snapshots of the Y.Doc state.
 */

import React, { useState, useCallback } from 'react';
import { Camera, RotateCcw, Trash2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { MetMapSnapshot } from '../../hooks/useMetMapSnapshots';

interface SnapshotPanelProps {
  snapshots: MetMapSnapshot[];
  isLoading: boolean;
  currentUserId: string;
  sectionCount: number;
  totalBars: number;
  onCreateSnapshot: (body: { name: string; description?: string; sectionCount?: number; totalBars?: number }) => Promise<unknown>;
  onDeleteSnapshot: (id: string) => Promise<unknown>;
  onRestoreSnapshot: (id: string) => Promise<unknown>;
  isCreating: boolean;
  isRestoring: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const SnapshotPanel = React.memo(function SnapshotPanel({
  snapshots,
  isLoading,
  currentUserId,
  sectionCount,
  totalBars,
  onCreateSnapshot,
  onDeleteSnapshot,
  onRestoreSnapshot,
  isCreating,
  isRestoring,
}: SnapshotPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    await onCreateSnapshot({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      sectionCount,
      totalBars,
    });
    setNewName('');
    setNewDescription('');
    setShowCreateForm(false);
  }, [newName, newDescription, sectionCount, totalBars, onCreateSnapshot]);

  const handleRestore = useCallback(async (id: string) => {
    await onRestoreSnapshot(id);
    setConfirmRestoreId(null);
  }, [onRestoreSnapshot]);

  return (
    <div className="border border-neutral-200 rounded-lg bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <Camera className="w-3.5 h-3.5" />
          <span>Snapshots</span>
          {snapshots.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500 text-[10px]">
              {snapshots.length}
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Create snapshot button / form */}
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors"
            >
              <Camera className="w-3 h-3" />
              Save Checkpoint
            </button>
          ) : (
            <div className="space-y-1.5 p-2 bg-neutral-50 rounded border border-neutral-200">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Checkpoint name..."
                maxLength={100}
                className="w-full px-2 py-1 text-xs border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) handleCreate();
                  if (e.key === 'Escape') setShowCreateForm(false);
                }}
              />
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                maxLength={250}
                className="w-full px-2 py-1 text-xs border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || isCreating}
                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {isCreating && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Snapshot list */}
          {isLoading ? (
            <div className="text-xs text-neutral-400 text-center py-3">Loading snapshots...</div>
          ) : snapshots.length === 0 ? (
            <div className="text-xs text-neutral-400 text-center py-3">No snapshots yet</div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {snapshots.map((snap) => (
                <div key={snap.id} className="p-2 bg-neutral-50 rounded border border-neutral-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-800 truncate">{snap.name}</span>
                    <span className="text-[10px] text-neutral-400 shrink-0 ml-2">
                      {formatRelativeTime(snap.createdAt)}
                    </span>
                  </div>
                  {snap.description && (
                    <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-2">{snap.description}</p>
                  )}
                  <div className="text-[10px] text-neutral-400 mt-1">
                    {snap.sectionCount} sections &middot; {snap.totalBars} bars
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {confirmRestoreId === snap.id ? (
                      <>
                        <span className="text-[10px] text-amber-600">Restore this checkpoint?</span>
                        <button
                          onClick={() => handleRestore(snap.id)}
                          disabled={isRestoring}
                          className="px-1.5 py-0.5 text-[10px] bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-0.5"
                        >
                          {isRestoring && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmRestoreId(null)}
                          className="px-1.5 py-0.5 text-[10px] text-neutral-500 hover:text-neutral-700 transition-colors"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setConfirmRestoreId(snap.id)}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          Restore
                        </button>
                        {snap.userId === currentUserId && (
                          <button
                            onClick={() => onDeleteSnapshot(snap.id)}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
