/**
 * BranchSwitcher — Dropdown for switching between design branches.
 *
 * Sprint 33: Fork branches from snapshots, switch between them, merge back to main.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GitBranch, Plus, Merge, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import type { MetMapBranch } from '../../hooks/useMetMapBranches';
import type { MetMapSnapshot } from '../../hooks/useMetMapSnapshots';

interface BranchSwitcherProps {
  branches: MetMapBranch[];
  snapshots: MetMapSnapshot[];
  activeBranchId: string | null;
  currentUserId: string;
  onSwitchBranch: (branchId: string | null) => void;
  onCreateBranch: (body: { name: string; description?: string; sourceSnapshotId?: string }) => Promise<unknown>;
  onDeleteBranch: (id: string) => Promise<unknown>;
  onMergeBranch: (id: string) => Promise<unknown>;
  isCreating: boolean;
  isMerging: boolean;
}

export const BranchSwitcher = React.memo(function BranchSwitcher({
  branches,
  snapshots,
  activeBranchId,
  currentUserId,
  onSwitchBranch,
  onCreateBranch,
  onDeleteBranch,
  onMergeBranch,
  isCreating,
  isMerging,
}: BranchSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [sourceSnapshotId, setSourceSnapshotId] = useState('');
  const [confirmMergeId, setConfirmMergeId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
        setConfirmMergeId(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const displayName = activeBranch ? activeBranch.name : 'main';

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    const created = await onCreateBranch({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      sourceSnapshotId: sourceSnapshotId || undefined,
    });
    setNewName('');
    setNewDescription('');
    setSourceSnapshotId('');
    setShowCreateForm(false);
    // Auto-switch to the new branch
    if (created && typeof created === 'object' && 'id' in created) {
      onSwitchBranch((created as MetMapBranch).id);
    }
  }, [newName, newDescription, sourceSnapshotId, onCreateBranch, onSwitchBranch]);

  const handleMerge = useCallback(async (branchId: string) => {
    await onMergeBranch(branchId);
    setConfirmMergeId(null);
    // Switch back to main after merge
    onSwitchBranch(null);
  }, [onMergeBranch, onSwitchBranch]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Branch: ${displayName}`}
      >
        <GitBranch className="w-3 h-3 text-green-600" aria-hidden="true" />
        <span className="text-neutral-700 dark:text-neutral-300 font-medium max-w-[120px] truncate">{displayName}</span>
        <ChevronDown className="w-3 h-3 text-neutral-400" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 text-xs" role="listbox" aria-label="Branch switcher">
          <div className="px-2 py-1 text-[10px] font-medium text-neutral-400 uppercase">Branches</div>

          {/* Main branch (always first) */}
          <button
            onClick={() => {
              onSwitchBranch(null);
              setIsOpen(false);
            }}
            role="option"
            aria-selected={!activeBranchId}
            className={`w-full flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors ${
              !activeBranchId ? 'bg-green-50 dark:bg-green-900/20' : ''
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${!activeBranchId ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
            <span className="text-neutral-800 dark:text-neutral-200 font-medium">main</span>
            {!activeBranchId && <span className="text-[10px] text-green-600 dark:text-green-400 ml-auto">(current)</span>}
          </button>

          {/* Feature branches */}
          {branches
            .filter((b) => !b.isMain)
            .map((branch) => {
              const isActive = branch.id === activeBranchId;
              const isMerged = !!branch.mergedAt;

              return (
                <div key={branch.id} role="option" aria-selected={isActive} className={`px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 ${isActive ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onSwitchBranch(branch.id);
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-2 flex-1 min-w-0"
                      aria-label={`Switch to branch ${branch.name}`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        isActive ? 'bg-green-500' : isMerged ? 'bg-purple-400' : 'bg-neutral-300 dark:bg-neutral-600'
                      }`} />
                      <span className={`truncate ${isMerged ? 'text-neutral-400 line-through' : 'text-neutral-800 dark:text-neutral-200'}`}>
                        {branch.name}
                      </span>
                    </button>
                    {isActive && <span className="text-[10px] text-green-600 dark:text-green-400 shrink-0">(current)</span>}
                  </div>

                  {/* Branch actions */}
                  {!isMerged && (
                    <div className="flex items-center gap-1 mt-1 ml-4">
                      {confirmMergeId === branch.id ? (
                        <>
                          <span className="text-[10px] text-amber-600">Merge to main?</span>
                          <button
                            onClick={() => handleMerge(branch.id)}
                            disabled={isMerging}
                            className="px-1 py-0.5 text-[10px] bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 flex items-center gap-0.5"
                          >
                            {isMerging && <Loader2 className="w-2.5 h-2.5 animate-spin" aria-hidden="true" />}
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmMergeId(null)}
                            className="px-1 py-0.5 text-[10px] text-neutral-500"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setConfirmMergeId(branch.id)}
                            className="flex items-center gap-0.5 px-1 py-0.5 text-[10px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                            aria-label={`Merge branch ${branch.name}`}
                          >
                            <Merge className="w-2.5 h-2.5" aria-hidden="true" />
                            Merge
                          </button>
                          {branch.userId === currentUserId && (
                            <button
                              onClick={() => onDeleteBranch(branch.id)}
                              className="flex items-center gap-0.5 px-1 py-0.5 text-[10px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                              aria-label={`Delete branch ${branch.name}`}
                            >
                              <Trash2 className="w-2.5 h-2.5" aria-hidden="true" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          {/* Separator */}
          <div className="border-t border-neutral-100 dark:border-neutral-700 my-1" />

          {/* New branch */}
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
            >
              <Plus className="w-3 h-3" aria-hidden="true" />
              New Branch
            </button>
          ) : (
            <div className="px-2 py-2 space-y-1.5">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Branch name..."
                aria-label="Branch name"
                maxLength={60}
                className="w-full px-2 py-1 text-xs border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) handleCreate();
                  if (e.key === 'Escape') setShowCreateForm(false);
                }}
              />
              {snapshots.length > 0 && (
                <select
                  value={sourceSnapshotId}
                  onChange={(e) => setSourceSnapshotId(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  aria-label="Source snapshot"
                >
                  <option value="">From current state</option>
                  {snapshots.map((snap) => (
                    <option key={snap.id} value={snap.id}>
                      From: {snap.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={() => { setShowCreateForm(false); setNewName(''); }}
                  className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || isCreating}
                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {isCreating && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />}
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
