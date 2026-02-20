/**
 * PluginPermissionDialog — Shown before plugin install to get user consent
 * for the plugin's requested permissions.
 *
 * Sprint 36: Phase 4.1 Plugin System.
 */

import React from 'react';
import {
  Shield,
  Database,
  FolderOpen,
  Globe,
  Bell,
  Terminal,
  Layout,
  Sparkles,
  Users,
  Lock,
  X,
} from 'lucide-react';
import type { PluginManifest, PluginPermission } from '@/services/plugins/types';

interface PluginPermissionDialogProps {
  manifest: PluginManifest;
  onApprove: () => void;
  onDeny: () => void;
}

const PERMISSION_INFO: Record<PluginPermission, { icon: React.ReactNode; label: string; description: string }> = {
  storage: {
    icon: <Database className="w-4 h-4" />,
    label: 'Storage',
    description: 'Save data in plugin-scoped storage',
  },
  projects: {
    icon: <FolderOpen className="w-4 h-4" />,
    label: 'Projects',
    description: 'Read and write your projects',
  },
  files: {
    icon: <FolderOpen className="w-4 h-4" />,
    label: 'Files',
    description: 'Read, write, and delete files',
  },
  network: {
    icon: <Globe className="w-4 h-4" />,
    label: 'Network',
    description: 'Make network requests to external services',
  },
  notifications: {
    icon: <Bell className="w-4 h-4" />,
    label: 'Notifications',
    description: 'Show notifications',
  },
  commands: {
    icon: <Terminal className="w-4 h-4" />,
    label: 'Commands',
    description: 'Register commands in the command palette',
  },
  ui: {
    icon: <Layout className="w-4 h-4" />,
    label: 'UI',
    description: 'Add panels, toolbar items, and UI components',
  },
  ai: {
    icon: <Sparkles className="w-4 h-4" />,
    label: 'AI',
    description: 'Access AI features (chat, generation, suggestions)',
  },
  collaboration: {
    icon: <Users className="w-4 h-4" />,
    label: 'Collaboration',
    description: 'Access real-time collaboration features',
  },
  system: {
    icon: <Lock className="w-4 h-4" />,
    label: 'System',
    description: 'System-level access (admin only)',
  },
};

export function PluginPermissionDialog({
  manifest,
  onApprove,
  onDeny,
}: PluginPermissionDialogProps) {
  const hasSystemPermission = manifest.permissions.includes('system');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              {manifest.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Install {manifest.name}?
              </h2>
              <p className="text-xs text-neutral-500">
                v{manifest.version} by {manifest.author.name}
              </p>
            </div>
          </div>
          <button
            onClick={onDeny}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {manifest.description}
          </p>
        </div>

        {/* Permissions */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-neutral-500" />
            <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
              Requested Permissions
            </h3>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {manifest.permissions.map((perm) => {
              const info = PERMISSION_INFO[perm];
              if (!info) return null;
              const isSensitive = perm === 'system' || perm === 'network' || perm === 'files';

              return (
                <div
                  key={perm}
                  className={`flex items-start gap-2.5 p-2 rounded-lg ${
                    isSensitive
                      ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                      : 'bg-neutral-50 dark:bg-neutral-700/50'
                  }`}
                >
                  <div className={`mt-0.5 ${isSensitive ? 'text-amber-600' : 'text-neutral-500'}`}>
                    {info.icon}
                  </div>
                  <div>
                    <div className={`text-xs font-medium ${
                      isSensitive ? 'text-amber-800 dark:text-amber-300' : 'text-neutral-800 dark:text-neutral-200'
                    }`}>
                      {info.label}
                    </div>
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      {info.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasSystemPermission && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                This plugin requests system-level access. Only install from trusted sources.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={onDeny}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onApprove}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Install & Approve
          </button>
        </div>
      </div>
    </div>
  );
}
