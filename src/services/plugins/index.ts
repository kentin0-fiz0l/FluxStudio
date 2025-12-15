/**
 * Plugin System Index
 *
 * Exports the core plugin infrastructure.
 */

// Types
export * from './types';

// Registry
export { pluginRegistry, default as PluginRegistry } from './PluginRegistry';

// Marketplace
export { pluginMarketplace, default as PluginMarketplace } from './PluginMarketplace';
export type { MarketplacePlugin, MarketplaceSearchOptions, MarketplaceSearchResult, PluginReview } from './PluginMarketplace';
