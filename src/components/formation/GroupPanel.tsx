/**
 * GroupPanel - FluxStudio Drill Writer
 *
 * Sidebar panel for managing named performer groups.
 * Supports creating, selecting, renaming, deleting, and color-coding groups.
 */

import { useState, useCallback } from 'react';
import { Users, Plus, Trash2, Edit2, Check, X, Eye } from 'lucide-react';
import type { PerformerGroup, Performer } from '../../services/formationTypes';

interface GroupPanelProps {
  groups: PerformerGroup[];
  performers: Performer[];
  selectedPerformerIds: Set<string>;
  onCreateGroup: (name: string, performerIds: string[], color: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onSelectGroup: (performerIds: string[]) => void;
  onUpdateGroupColor: (groupId: string, color: string) => void;
  onClose: () => void;
}

const GROUP_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

export function GroupPanel({
  groups,
  performers,
  selectedPerformerIds,
  onCreateGroup,
  onDeleteGroup,
  onRenameGroup,
  onSelectGroup,
  onUpdateGroupColor,
  onClose,
}: GroupPanelProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreateGroup = useCallback(() => {
    if (!newGroupName.trim() || selectedPerformerIds.size === 0) return;

    const colorIndex = groups.length % GROUP_COLORS.length;
    onCreateGroup(
      newGroupName.trim(),
      Array.from(selectedPerformerIds),
      GROUP_COLORS[colorIndex],
    );
    setNewGroupName('');
  }, [newGroupName, selectedPerformerIds, groups.length, onCreateGroup]);

  const handleStartEdit = useCallback((group: PerformerGroup) => {
    setEditingGroupId(group.id);
    setEditName(group.name);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingGroupId && editName.trim()) {
      onRenameGroup(editingGroupId, editName.trim());
    }
    setEditingGroupId(null);
    setEditName('');
  }, [editingGroupId, editName, onRenameGroup]);

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <h3 className="font-medium text-sm text-gray-900 dark:text-white">Groups</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          aria-label="Close group panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Create new group */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
            placeholder="Group name..."
            className="flex-1 px-2 py-1.5 text-xs border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleCreateGroup}
            disabled={!newGroupName.trim() || selectedPerformerIds.size === 0}
            className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title={selectedPerformerIds.size === 0 ? 'Select performers first' : 'Create group from selection'}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {selectedPerformerIds.size > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {selectedPerformerIds.size} performer{selectedPerformerIds.size > 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Group list */}
      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">
            No groups yet. Select performers and create a group above.
          </div>
        ) : (
          groups.map((group) => {
            const memberCount = group.performerIds.filter((id) =>
              performers.some((p) => p.id === id)
            ).length;

            return (
              <div
                key={group.id}
                className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
              >
                <div className="flex items-center gap-2">
                  {/* Color swatch */}
                  <button
                    className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0"
                    style={{ backgroundColor: group.color }}
                    onClick={() => {
                      const currentIdx = GROUP_COLORS.indexOf(group.color);
                      const nextIdx = (currentIdx + 1) % GROUP_COLORS.length;
                      onUpdateGroupColor(group.id, GROUP_COLORS[nextIdx]);
                    }}
                    title="Click to change color"
                  />

                  {/* Name / Edit */}
                  {editingGroupId === group.id ? (
                    <div className="flex-1 flex gap-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        className="flex-1 px-1 py-0.5 text-xs border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        autoFocus
                      />
                      <button onClick={handleSaveEdit} className="p-0.5 text-green-500 hover:text-green-600">
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="flex-1 text-xs font-medium text-gray-900 dark:text-white truncate">
                      {group.name}
                    </span>
                  )}

                  {/* Member count */}
                  <span className="text-xs text-gray-400">{memberCount}</span>

                  {/* Actions */}
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => onSelectGroup(group.performerIds)}
                      className="p-1 text-gray-400 hover:text-blue-500 rounded"
                      title="Select group members"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleStartEdit(group)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Rename group"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteGroup(group.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                      title="Delete group"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default GroupPanel;
