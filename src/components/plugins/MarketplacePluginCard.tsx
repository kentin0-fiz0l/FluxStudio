import * as React from 'react';
import { RowComponentProps } from 'react-window';
import {
  Download,
  Star,
  Shield,
} from 'lucide-react';
import { pluginRegistry } from '@/services/plugins/PluginRegistry';
import { MarketplacePlugin } from '@/services/plugins/PluginMarketplace';
import { cn } from '@/lib/utils';
import type { ViewMode } from './pluginManagerHelpers';
import { formatNumber } from './pluginManagerHelpers';

export interface MarketplacePluginRowProps {
  plugins: MarketplacePlugin[];
  viewMode: ViewMode;
  onInstall: (plugin: MarketplacePlugin) => void;
}

export function MarketplacePluginRow({
  index,
  style,
  plugins,
  viewMode,
  onInstall,
}: RowComponentProps<MarketplacePluginRowProps>): React.ReactElement {
  const plugin = plugins[index];
  return (
    <div style={style}>
      <MarketplacePluginCard
        plugin={plugin}
        viewMode={viewMode}
        isInstalled={pluginRegistry.isInstalled(plugin.id)}
        onInstall={() => onInstall(plugin)}
      />
    </div>
  );
}

interface MarketplacePluginCardProps {
  plugin: MarketplacePlugin;
  viewMode: ViewMode;
  isInstalled: boolean;
  onInstall: () => void;
}

function MarketplacePluginCard({
  plugin,
  viewMode,
  isInstalled,
  onInstall,
}: MarketplacePluginCardProps) {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
          {plugin.manifest.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {plugin.manifest.name}
            </h3>
            {plugin.verified && <span title="Verified"><Shield className="w-4 h-4 text-blue-500" aria-hidden="true" /></span>}
            {plugin.featured && <span title="Featured"><Star className="w-4 h-4 text-amber-500 fill-amber-500" aria-hidden="true" /></span>}
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
            {plugin.manifest.description}
          </p>
          <div className="flex items-center gap-4 mt-1 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" aria-hidden="true" />
              {formatNumber(plugin.downloads)}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" aria-hidden="true" />
              {plugin.rating.toFixed(1)}
            </span>
          </div>
        </div>
        <button
          onClick={onInstall}
          disabled={isInstalled}
          className={cn(
            'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
            isInstalled
              ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          )}
        >
          {isInstalled ? 'Installed' : 'Install'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
          {plugin.manifest.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {plugin.manifest.name}
            </h3>
            {plugin.verified && <Shield className="w-4 h-4 text-blue-500" aria-hidden="true" />}
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-amber-500" aria-hidden="true" />
              {plugin.rating.toFixed(1)}
            </span>
            <span>{formatNumber(plugin.downloads)} downloads</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2">
        {plugin.manifest.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="text-xs text-neutral-500">
          by {plugin.manifest.author.name}
        </div>
        <button
          onClick={onInstall}
          disabled={isInstalled}
          className={cn(
            'px-3 py-1.5 rounded-lg font-medium text-sm transition-colors',
            isInstalled
              ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          )}
        >
          {isInstalled ? 'Installed' : 'Install'}
        </button>
      </div>
    </div>
  );
}
