import * as React from 'react';
import { RowComponentProps } from 'react-window';
import {
  Settings,
  Power,
  PowerOff,
  Trash2,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { PluginInstance } from '@/services/plugins/PluginRegistry';
import type { ViewMode } from './pluginManagerHelpers';

export interface InstalledPluginRowProps {
  plugins: PluginInstance[];
  viewMode: ViewMode;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onUninstall: (id: string) => void;
  onSettings: (id: string) => void;
}

export function InstalledPluginRow({
  index,
  style,
  plugins,
  viewMode,
  onActivate,
  onDeactivate,
  onUninstall,
  onSettings,
}: RowComponentProps<InstalledPluginRowProps>): React.ReactElement {
  const plugin = plugins[index];
  return (
    <div style={style}>
      <InstalledPluginCard
        plugin={plugin}
        viewMode={viewMode}
        onActivate={onActivate}
        onDeactivate={onDeactivate}
        onUninstall={onUninstall}
        onSettings={() => onSettings(plugin.manifest.id)}
      />
    </div>
  );
}

interface InstalledPluginCardProps {
  plugin: PluginInstance;
  viewMode: ViewMode;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onUninstall: (id: string) => void;
  onSettings: () => void;
}

function InstalledPluginCard({
  plugin,
  viewMode,
  onActivate,
  onDeactivate,
  onUninstall,
  onSettings,
}: InstalledPluginCardProps) {
  const isActive = plugin.state === 'active';
  const hasError = plugin.state === 'error';

  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
          {plugin.manifest.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {plugin.manifest.name}
            </h3>
            <span className="text-xs text-neutral-500">v{plugin.manifest.version}</span>
            {isActive && (
              <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                Active
              </span>
            )}
            {hasError && (
              <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
                Error
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
            {plugin.manifest.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? (
            <button
              onClick={() => onDeactivate(plugin.manifest.id)}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
              title="Disable"
            >
              <PowerOff className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              onClick={() => onActivate(plugin.manifest.id)}
              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
              title="Enable"
            >
              <Power className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <button
            onClick={onSettings}
            className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
            title="Settings"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => onUninstall(plugin.manifest.id)}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
            title="Uninstall"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
          {plugin.manifest.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {plugin.manifest.name}
          </h3>
          <p className="text-xs text-neutral-500">v{plugin.manifest.version}</p>
        </div>
        {isActive && <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />}
        {hasError && <AlertTriangle className="w-5 h-5 text-red-500" aria-hidden="true" />}
      </div>

      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2">
        {plugin.manifest.description}
      </p>

      {hasError && plugin.error && (
        <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs rounded">
          {plugin.error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-neutral-500">
          by {plugin.manifest.author.name}
        </div>
        <div className="flex items-center gap-1">
          {isActive ? (
            <button
              onClick={() => onDeactivate(plugin.manifest.id)}
              className="p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
              title="Disable"
            >
              <PowerOff className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              onClick={() => onActivate(plugin.manifest.id)}
              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
              title="Enable"
            >
              <Power className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <button
            onClick={onSettings}
            className="p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
            title="Settings"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => onUninstall(plugin.manifest.id)}
            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            title="Uninstall"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
