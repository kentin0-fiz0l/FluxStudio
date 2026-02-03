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
import {
  Package,
  Search,
  Download,
  Trash2,
  Settings,
  Power,
  PowerOff,
  Star,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Grid,
  List,
} from 'lucide-react';
import { pluginRegistry, PluginInstance } from '@/services/plugins/PluginRegistry';
import { pluginMarketplace, MarketplacePlugin } from '@/services/plugins/PluginMarketplace';
import { cn } from '@/lib/utils';

type TabType = 'installed' | 'marketplace' | 'updates';
type ViewMode = 'grid' | 'list';

export function PluginManager() {
  const [activeTab, setActiveTab] = React.useState<TabType>('installed');
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [installedPlugins, setInstalledPlugins] = React.useState<PluginInstance[]>([]);
  const [marketplacePlugins, setMarketplacePlugins] = React.useState<MarketplacePlugin[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedPlugin, setSelectedPlugin] = React.useState<string | null>(null);

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
  React.useEffect(() => {
    if (activeTab === 'marketplace') {
      loadMarketplace();
    }
  }, [activeTab, searchQuery]);

  const loadMarketplace = async () => {
    setIsLoading(true);
    try {
      const result = await pluginMarketplace.search({ query: searchQuery });
      setMarketplacePlugins(result.plugins);
    } catch (error) {
      console.error('Failed to load marketplace:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleInstall = async (plugin: MarketplacePlugin) => {
    try {
      await pluginRegistry.install(plugin.manifest, 'marketplace');
      await pluginRegistry.activate(plugin.id);
    } catch (error) {
      console.error('Failed to install plugin:', error);
    }
  };

  const filteredInstalled = installedPlugins.filter(
    (p) =>
      p.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.manifest.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Plugins
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plugins..."
              className="pl-9 pr-4 py-2 w-64 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded',
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {(['installed', 'marketplace', 'updates'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              activeTab === tab
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            {tab === 'installed' && `Installed (${installedPlugins.length})`}
            {tab === 'marketplace' && 'Marketplace'}
            {tab === 'updates' && 'Updates'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : activeTab === 'installed' ? (
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            )}
          >
            {filteredInstalled.length === 0 ? (
              <EmptyState
                icon={<Package className="w-12 h-12" />}
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
              filteredInstalled.map((plugin) => (
                <InstalledPluginCard
                  key={plugin.manifest.id}
                  plugin={plugin}
                  viewMode={viewMode}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                  onUninstall={handleUninstall}
                  onSettings={() => setSelectedPlugin(plugin.manifest.id)}
                />
              ))
            )}
          </div>
        ) : activeTab === 'marketplace' ? (
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            )}
          >
            {marketplacePlugins.map((plugin) => (
              <MarketplacePluginCard
                key={plugin.id}
                plugin={plugin}
                viewMode={viewMode}
                isInstalled={pluginRegistry.isInstalled(plugin.id)}
                onInstall={() => handleInstall(plugin)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<RefreshCw className="w-12 h-12" />}
            title="All plugins up to date"
            description="Your installed plugins are using the latest versions"
          />
        )}
      </div>

      {/* Plugin settings modal would go here */}
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
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
          {plugin.manifest.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {plugin.manifest.name}
            </h3>
            <span className="text-xs text-gray-500">v{plugin.manifest.version}</span>
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
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {plugin.manifest.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? (
            <button
              onClick={() => onDeactivate(plugin.manifest.id)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Disable"
            >
              <PowerOff className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onActivate(plugin.manifest.id)}
              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
              title="Enable"
            >
              <Power className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onSettings}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => onUninstall(plugin.manifest.id)}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
            title="Uninstall"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
          {plugin.manifest.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {plugin.manifest.name}
          </h3>
          <p className="text-xs text-gray-500">v{plugin.manifest.version}</p>
        </div>
        {isActive && <CheckCircle className="w-5 h-5 text-green-500" />}
        {hasError && <AlertTriangle className="w-5 h-5 text-red-500" />}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {plugin.manifest.description}
      </p>

      {hasError && plugin.error && (
        <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs rounded">
          {plugin.error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          by {plugin.manifest.author.name}
        </div>
        <div className="flex items-center gap-1">
          {isActive ? (
            <button
              onClick={() => onDeactivate(plugin.manifest.id)}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Disable"
            >
              <PowerOff className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onActivate(plugin.manifest.id)}
              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
              title="Enable"
            >
              <Power className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onSettings}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => onUninstall(plugin.manifest.id)}
            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            title="Uninstall"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
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
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
          {plugin.manifest.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {plugin.manifest.name}
            </h3>
            {plugin.verified && <span title="Verified"><Shield className="w-4 h-4 text-blue-500" aria-hidden="true" /></span>}
            {plugin.featured && <span title="Featured"><Star className="w-4 h-4 text-amber-500 fill-amber-500" aria-hidden="true" /></span>}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {plugin.manifest.description}
          </p>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {formatNumber(plugin.downloads)}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
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
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          )}
        >
          {isInstalled ? 'Installed' : 'Install'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
          {plugin.manifest.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {plugin.manifest.name}
            </h3>
            {plugin.verified && <Shield className="w-4 h-4 text-blue-500" />}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-amber-500" />
              {plugin.rating.toFixed(1)}
            </span>
            <span>{formatNumber(plugin.downloads)} downloads</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {plugin.manifest.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          by {plugin.manifest.author.name}
        </div>
        <button
          onClick={onInstall}
          disabled={isInstalled}
          className={cn(
            'px-3 py-1.5 rounded-lg font-medium text-sm transition-colors',
            isInstalled
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          )}
        >
          {isInstalled ? 'Installed' : 'Install'}
        </button>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-gray-300 dark:text-gray-600 mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
      {action}
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default PluginManager;
