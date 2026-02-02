/**
 * PluginMarketplace - Discover and install plugins
 *
 * Connects to a plugin registry server to browse, search, and install plugins.
 */

import { PluginManifest, PluginPermission } from './types';

export interface MarketplacePlugin {
  id: string;
  manifest: PluginManifest;
  downloads: number;
  rating: number;
  ratingCount: number;
  featured: boolean;
  verified: boolean;
  categories: string[];
  screenshots: string[];
  changelog?: string;
  publishedAt: string;
  updatedAt: string;
}

export interface MarketplaceSearchOptions {
  query?: string;
  category?: string;
  sortBy?: 'downloads' | 'rating' | 'newest' | 'name';
  page?: number;
  limit?: number;
  featured?: boolean;
  verified?: boolean;
}

export interface MarketplaceSearchResult {
  plugins: MarketplacePlugin[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PluginReview {
  id: string;
  pluginId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful: number;
}

class PluginMarketplace {
  private baseUrl: string;
  private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(baseUrl = '/api/plugins') {
    this.baseUrl = baseUrl;
  }

  // ============================================================================
  // Search & Discovery
  // ============================================================================

  async search(options: MarketplaceSearchOptions = {}): Promise<MarketplaceSearchResult> {
    const {
      query = '',
      category,
      sortBy = 'downloads',
      page = 1,
      limit = 20,
      featured,
      verified,
    } = options;

    const cacheKey = JSON.stringify(options);
    const cached = this.getFromCache<MarketplaceSearchResult>(cacheKey);
    if (cached) return cached;

    // In production, this would be an API call
    // For now, return simulated data
    const result = await this.simulateSearch(options);

    this.setCache(cacheKey, result);
    return result;
  }

  async getFeatured(): Promise<MarketplacePlugin[]> {
    const result = await this.search({ featured: true, limit: 6 });
    return result.plugins;
  }

  async getPopular(): Promise<MarketplacePlugin[]> {
    const result = await this.search({ sortBy: 'downloads', limit: 10 });
    return result.plugins;
  }

  async getNewest(): Promise<MarketplacePlugin[]> {
    const result = await this.search({ sortBy: 'newest', limit: 10 });
    return result.plugins;
  }

  async getCategories(): Promise<{ id: string; name: string; count: number }[]> {
    const cacheKey = 'categories';
    const cached = this.getFromCache<{ id: string; name: string; count: number }[]>(cacheKey);
    if (cached) return cached;

    // Simulated categories
    const categories = [
      { id: 'themes', name: 'Themes', count: 45 },
      { id: 'productivity', name: 'Productivity', count: 32 },
      { id: 'ai', name: 'AI & ML', count: 28 },
      { id: 'design', name: 'Design Tools', count: 24 },
      { id: 'collaboration', name: 'Collaboration', count: 18 },
      { id: 'analytics', name: 'Analytics', count: 15 },
      { id: 'integrations', name: 'Integrations', count: 22 },
      { id: 'utilities', name: 'Utilities', count: 38 },
    ];

    this.setCache(cacheKey, categories);
    return categories;
  }

  // ============================================================================
  // Plugin Details
  // ============================================================================

  async getPlugin(pluginId: string): Promise<MarketplacePlugin | null> {
    const cacheKey = `plugin_${pluginId}`;
    const cached = this.getFromCache<MarketplacePlugin>(cacheKey);
    if (cached) return cached;

    // Simulated plugin details
    const plugin = await this.simulateGetPlugin(pluginId);

    if (plugin) {
      this.setCache(cacheKey, plugin);
    }
    return plugin;
  }

  async getPluginReadme(pluginId: string): Promise<string> {
    const cacheKey = `readme_${pluginId}`;
    const cached = this.getFromCache<string>(cacheKey);
    if (cached) return cached;

    // Simulated readme
    const readme = `# ${pluginId}

A powerful plugin for FluxStudio.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

Install from the FluxStudio marketplace.

## Usage

Configure the plugin in Settings > Plugins.
`;

    this.setCache(cacheKey, readme);
    return readme;
  }

  async getPluginReviews(pluginId: string, _page = 1): Promise<{ reviews: PluginReview[]; total: number }> {
    // Simulated reviews
    return {
      reviews: [
        {
          id: '1',
          pluginId,
          userId: 'user1',
          userName: 'John Doe',
          rating: 5,
          comment: 'Great plugin! Works exactly as described.',
          createdAt: new Date().toISOString(),
          helpful: 12,
        },
        {
          id: '2',
          pluginId,
          userId: 'user2',
          userName: 'Jane Smith',
          rating: 4,
          comment: 'Very useful, would recommend.',
          createdAt: new Date().toISOString(),
          helpful: 8,
        },
      ],
      total: 2,
    };
  }

  // ============================================================================
  // Installation
  // ============================================================================

  async getDownloadUrl(pluginId: string, version?: string): Promise<string> {
    // In production, this would return a signed URL
    return `${this.baseUrl}/download/${pluginId}${version ? `@${version}` : ''}`;
  }

  async getVersions(_pluginId: string): Promise<{ version: string; publishedAt: string; changelog?: string }[]> {
    // Simulated versions
    return [
      { version: '1.2.0', publishedAt: new Date().toISOString(), changelog: 'Added new features' },
      { version: '1.1.0', publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), changelog: 'Bug fixes' },
      { version: '1.0.0', publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), changelog: 'Initial release' },
    ];
  }

  // ============================================================================
  // User Actions
  // ============================================================================

  async submitReview(pluginId: string, rating: number, comment: string): Promise<PluginReview> {
    // In production, this would submit to API
    return {
      id: Date.now().toString(),
      pluginId,
      userId: 'current-user',
      userName: 'Current User',
      rating,
      comment,
      createdAt: new Date().toISOString(),
      helpful: 0,
    };
  }

  async reportPlugin(pluginId: string, reason: string): Promise<void> {
    console.log(`Reported plugin ${pluginId}: ${reason}`);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTTL,
    });
  }

  private async simulateSearch(options: MarketplaceSearchOptions): Promise<MarketplaceSearchResult> {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 200));

    const samplePlugins: MarketplacePlugin[] = [
      this.createSamplePlugin('dark-theme-pro', 'Dark Theme Pro', 'themes', true, true),
      this.createSamplePlugin('figma-import', 'Figma Import', 'integrations', true, true),
      this.createSamplePlugin('ai-copilot-plus', 'AI Copilot Plus', 'ai', true, true),
      this.createSamplePlugin('color-palette-gen', 'Color Palette Generator', 'design', false, true),
      this.createSamplePlugin('analytics-dashboard', 'Analytics Dashboard', 'analytics', false, true),
      this.createSamplePlugin('git-integration', 'Git Integration', 'productivity', false, true),
      this.createSamplePlugin('spell-checker', 'Spell Checker', 'utilities', false, false),
      this.createSamplePlugin('markdown-preview', 'Markdown Preview', 'utilities', false, true),
    ];

    let filtered = samplePlugins;

    if (options.query) {
      const q = options.query.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.manifest.name.toLowerCase().includes(q) ||
          p.manifest.description.toLowerCase().includes(q)
      );
    }

    if (options.category) {
      filtered = filtered.filter((p) => p.categories.includes(options.category!));
    }

    if (options.featured) {
      filtered = filtered.filter((p) => p.featured);
    }

    if (options.verified) {
      filtered = filtered.filter((p) => p.verified);
    }

    // Sort
    switch (options.sortBy) {
      case 'downloads':
        filtered.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        break;
      case 'name':
        filtered.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
        break;
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    return {
      plugins: paged,
      total: filtered.length,
      page,
      limit,
      hasMore: start + limit < filtered.length,
    };
  }

  private async simulateGetPlugin(pluginId: string): Promise<MarketplacePlugin | null> {
    await new Promise((r) => setTimeout(r, 100));

    const result = await this.simulateSearch({ query: pluginId });
    return result.plugins.find((p) => p.id === pluginId) || null;
  }

  private createSamplePlugin(
    id: string,
    name: string,
    category: string,
    featured: boolean,
    verified: boolean
  ): MarketplacePlugin {
    return {
      id,
      manifest: {
        id,
        name,
        version: '1.0.0',
        description: `${name} for FluxStudio - enhance your workflow`,
        author: { name: 'FluxStudio Community' },
        main: `plugins/${id}/index.js`,
        permissions: ['storage', 'ui'] as PluginPermission[],
        fluxStudioVersion: '^1.0.0',
      },
      downloads: Math.floor(Math.random() * 50000) + 1000,
      rating: 3.5 + Math.random() * 1.5,
      ratingCount: Math.floor(Math.random() * 500) + 10,
      featured,
      verified,
      categories: [category],
      screenshots: [],
      publishedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const pluginMarketplace = new PluginMarketplace();
export default pluginMarketplace;
