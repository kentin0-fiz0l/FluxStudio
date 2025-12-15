/**
 * EditConflictDialog - Resolve concurrent edit conflicts
 *
 * Shows when two users edit the same entity simultaneously.
 */

import * as React from 'react';
import { AlertTriangle, GitMerge, ArrowLeft, ArrowRight, X } from 'lucide-react';

interface ConflictData {
  id: string;
  entityType: string;
  entityId: string;
  localData: unknown;
  serverData: unknown;
  localTimestamp: string;
  serverTimestamp: string;
  serverUser?: string;
}

interface EditConflictDialogProps {
  conflict: ConflictData;
  onResolve: (resolution: 'local' | 'server' | 'merge') => void;
  onDismiss: () => void;
  renderPreview?: (data: unknown) => React.ReactNode;
}

export function EditConflictDialog({
  conflict,
  onResolve,
  onDismiss,
  renderPreview,
}: EditConflictDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Edit Conflict</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {conflict.serverUser
                  ? `${conflict.serverUser} also edited this ${conflict.entityType}`
                  : `This ${conflict.entityType} was edited elsewhere`}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison */}
        <div className="grid grid-cols-2 gap-4 p-6">
          {/* Local version */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-700 dark:text-blue-400">Your Changes</span>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(conflict.localTimestamp)}
                </span>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 min-h-[120px]">
              {renderPreview ? (
                renderPreview(conflict.localData)
              ) : (
                <pre className="text-sm text-gray-600 dark:text-gray-300 overflow-auto">
                  {JSON.stringify(conflict.localData, null, 2)}
                </pre>
              )}
            </div>
          </div>

          {/* Server version */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="font-medium text-purple-700 dark:text-purple-400">
                  {conflict.serverUser ? `${conflict.serverUser}'s Changes` : 'Server Version'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(conflict.serverTimestamp)}
                </span>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 min-h-[120px]">
              {renderPreview ? (
                renderPreview(conflict.serverData)
              ) : (
                <pre className="text-sm text-gray-600 dark:text-gray-300 overflow-auto">
                  {JSON.stringify(conflict.serverData, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onResolve('local')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Keep My Changes
          </button>
          <button
            onClick={() => onResolve('server')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Accept Their Changes
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onResolve('merge')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <GitMerge className="w-4 h-4" />
            Merge Both
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default EditConflictDialog;
