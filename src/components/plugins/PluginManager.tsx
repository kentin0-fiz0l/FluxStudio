/**
 * PluginManager - UI for managing installed plugins
 *
 * Features:
 * - Browse marketplace
 * - Install/uninstall plugins
 * - Enable/disable plugins
 * - Configure plugin settings
 */

import * as React from 'react';
import { List as VirtualList } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import {
  Package,
  Search,
  Loader2,
  RefreshCw,
  Grid,
  List,
} from 'lucide-react';
import { pluginRegistry, PluginInstance } from '@/services/plugins/PluginRegistry';
import { pluginMarketplace, MarketplacePlugin } from '@/services/plugins/PluginMarketplace';
import { PluginPermissionDialog } from './PluginPermissionDialog';
import { cn } from '@/lib/utils';
import type { TabType, ViewMode } from './pluginManagerHelpers';
import { PLUGIN_GRID_ROW_HEIGHT, PLUGIN_LIST_ROW_HEIGHT } from './pluginManagerHelpers';
import { InstalledPluginRow } from './InstalledPluginCard';
import { MarketplacePluginRow } from './MarketplacePluginCard';
import { PluginEmptyState } from './PluginEmptyState';

export function PluginManager() {
  const [activeTab, setActiveTab] = React.useState<TabType>('installed');
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [installedPlugins, setInstalledPlugins] = React.useState<PluginInstance[]>([]);
  const [marketplacePlugins, setMarketplacePlugins] = React.useState<MarketplacePlugin[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [, setSelectedPlugin] = React.useState<string | null>(null);
  const [pendingInstall, setPendingInstall] = React.useState<MarketplacePlugin | null>(null);

  // Load installed plugins
  React.useEffect(() => {
    setInstalledPlugins(pluginRegistry.getAllPlugins());

    // Subscribe to changes
    const unsubInstalled = pluginRegistry.on('plugin:installed', () => {
      setInstalledPlugins(pluginRegistry.getAllPlugins());
    });
    const unsubUninstalled = pluginRegistry.on('plugin:uninstalled', () => {
      setInstalledPlugins(pluginRegistry.getAllPlugins());
    });
    const unsubActivated = pluginRegistry.on('plugin:activated', () => {
      setInstalledPlugins(pluginRegistry.getAllPlugins());
    });
    const unsubDeactivated = pluginRegistry.on('plugin:deactivated', () => {
      setInstalledPlugins(pluginRegistry.getAllPlugins());
    });

    return () => {
      unsubInstalled();
      unsubUninstalled();
      unsubActivated();
      unsubDeactivated();
    };
  }, []);

  // Load marketplace plugins
  const loadMarketplace = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await pluginMarketplace.search({ query: searchQuery });
      setMarketplacePlugins(result.plugins);
    } catch (error) {
      console.error('Failed to load marketplace:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  React.useEffect(() => {
    if (activeTab === 'marketplace') {
      loadMarketplace();
    }
  }, [activeTab, loadMarketplace]);

  const handleActivate = async (pluginId: string) => {
    try {
      await pluginRegistry.activate(pluginId);
    } catch (error) {
      console.error('Failed to activate plugin:', error);
    }
  };

  const handleDeactivate = async (pluginId: string) => {
    try {
      await pluginRegistry.deactivate(pluginId);
    } catch (error) {
      console.error('Failed to deactivate plugin:', error);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    if (!confirm('Are you sure you want to uninstall this plugin?')) return;
    try {
      await pluginRegistry.uninstall(pluginId);
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
    }
  };

  const handleInstallRequest = (plugin: MarketplacePlugin) => {
    setPendingInstall(plugin);
  };

  const handleInstallApprove = async () => {
    if (!pendingInstall) return;
    try {
      await pluginRegistry.install(pendingInstall.manifest, 'marketplace');
      await pluginRegistry.activate(pendingInstall.id);
    } catch (error) {
      console.error('Failed to install plugin:', error);
    } finally {
      setPendingInstall(null);
    }
  };

  const filteredInstalled = installedPlugins.filter(
    (p) =>
      p.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.manifest.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Plugins
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plugins..."
              className="pl-9 pr-4 py-2 w-64 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-neutral-600 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              )}
            >
              <Grid className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded',
                viewMode === 'list'
                  ? 'bg-white dark:bg-neutral-600 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              )}
            >
              <List className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        {(['installed', 'marketplace', 'updates'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              activeTab === tab
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
            )}
          >
            {tab === 'installed' && `Installed (${installedPlugins.length})`}
            {tab === 'marketplace' && 'Marketplace'}
            {tab === 'updates' && 'Updates'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" aria-hidden="true" />
          </div>
        ) : activeTab === 'installed' ? (
          filteredInstalled.length === 0 ? (
            <PluginEmptyState
              icon={<Package className="w-12 h-12" aria-hidden="true" />}
              title="No plugins installed"
              description="Browse the marketplace to discover plugins"
              action={
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Browse Marketplace
                </button>
              }
            />
          ) : (
            <div className="h-full">
              <AutoSizer
                renderProp={({ height, width }) => (
                  <VirtualList
                    style={{ height: height ?? 0, width: width ?? 0 }}
                    rowComponent={InstalledPluginRow}
                    rowCount={filteredInstalled.length}
                    rowHeight={viewMode === 'list' ? PLUGIN_LIST_ROW_HEIGHT : PLUGIN_GRID_ROW_HEIGHT}
                    rowProps={{
                      plugins: filteredInstalled,
                      viewMode,
                      onActivate: handleActivate,
                      onDeactivate: handleDeactivate,
                      onUninstall: handleUninstall,
                      onSettings: (id: string) => setSelectedPlugin(id),
                    }}
                    overscanCount={5}
                  />
                )}
              />
            </div>
          )
        ) : activeTab === 'marketplace' ? (
          marketplacePlugins.length === 0 ? (
            <PluginEmptyState
              icon={<Package className="w-12 h-12" aria-hidden="true" />}
              title="No plugins found"
              description="Try a different search query"
            />
          ) : (
            <div className="h-full">
              <AutoSizer
                renderProp={({ height, width }) => (
                  <VirtualList
                    style={{ height: height ?? 0, width: width ?? 0 }}
                    rowComponent={MarketplacePluginRow}
                    rowCount={marketplacePlugins.length}
                    rowHeight={viewMode === 'list' ? PLUGIN_LIST_ROW_HEIGHT : PLUGIN_GRID_ROW_HEIGHT}
                    rowProps={{
                      plugins: marketplacePlugins,
                      viewMode,
                      onInstall: handleInstallRequest,
                    }}
                    overscanCount={5}
                  />
                )}
              />
            </div>
          )
        ) : (
          <PluginEmptyState
            icon={<RefreshCw className="w-12 h-12" aria-hidden="true" />}
            title="All plugins up to date"
            description="Your installed plugins are using the latest versions"
          />
        )}
      </div>

      {/* Permission dialog */}
      {pendingInstall && (
        <PluginPermissionDialog
          manifest={pendingInstall.manifest}
          onApprove={handleInstallApprove}
          onDeny={() => setPendingInstall(null)}
        />
      )}
    </div>
  );
}

export default PluginManager;
