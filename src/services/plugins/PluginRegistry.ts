/**
 * PluginRegistry - Manages installed plugins
 *
 * Handles plugin installation, activation, deactivation, and updates.
 */

import {
  PluginManifest,
  PluginInstance,
  PluginContext,
  PluginStorage,
  PluginLogger,
  PluginSubscription,
  PluginModule,
  FluxStudioAPI,
} from './types';

// Re-export PluginInstance type for consumers
export type { PluginInstance } from './types';

export interface PluginRegistryEvents {
  'plugin:installed': (plugin: PluginInstance) => void;
  'plugin:activated': (plugin: PluginInstance) => void;
  'plugin:deactivated': (plugin: PluginInstance) => void;
  'plugin:uninstalled': (pluginId: string) => void;
  'plugin:error': (pluginId: string, error: Error) => void;
  'plugin:updated': (plugin: PluginInstance) => void;
}

type EventCallback<K extends keyof PluginRegistryEvents> = PluginRegistryEvents[K];

class PluginRegistry {
  private plugins: Map<string, PluginInstance> = new Map();
  private activeModules: Map<string, PluginModule> = new Map();
  private subscriptions: Map<string, PluginSubscription[]> = new Map();
  private eventListeners: Map<keyof PluginRegistryEvents, Set<EventCallback<keyof PluginRegistryEvents>>> = new Map();

  private storagePrefix = 'flux_plugin_';

  // ============================================================================
  // Plugin Lifecycle
  // ============================================================================

  async install(manifest: PluginManifest, _source: string): Promise<PluginInstance> {
    // Validate manifest
    this.validateManifest(manifest);

    // Check if already installed
    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} is already installed`);
    }

    // Create plugin instance
    const instance: PluginInstance = {
      manifest,
      state: 'inactive',
      settings: this.getDefaultSettings(manifest),
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store plugin
    this.plugins.set(manifest.id, instance);
    await this.persistPlugins();

    this.emit('plugin:installed', instance);
    return instance;
  }

  async uninstall(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Deactivate first if active
    if (plugin.state === 'active') {
      await this.deactivate(pluginId);
    }

    // Clear plugin storage
    await this.clearPluginStorage(pluginId);

    // Remove from registry
    this.plugins.delete(pluginId);
    await this.persistPlugins();

    this.emit('plugin:uninstalled', pluginId);
  }

  async activate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.state === 'active') {
      return; // Already active
    }

    plugin.state = 'loading';

    try {
      // Load the plugin module
      const module = await this.loadPluginModule(plugin.manifest);
      this.activeModules.set(pluginId, module);

      // Create plugin context
      const context = this.createPluginContext(plugin);
      const api = this.createPluginAPI(plugin);

      // Initialize subscriptions array
      this.subscriptions.set(pluginId, []);

      // Activate the plugin
      const activator = module.default || module;
      if (activator.activate) {
        await activator.activate(context, api);
      }

      plugin.state = 'active';
      plugin.enabledAt = new Date().toISOString();
      await this.persistPlugins();

      this.emit('plugin:activated', plugin);
    } catch (error) {
      plugin.state = 'error';
      plugin.error = error instanceof Error ? error.message : 'Unknown error';
      await this.persistPlugins();

      this.emit('plugin:error', pluginId, error as Error);
      throw error;
    }
  }

  async deactivate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.state !== 'active') {
      return; // Not active
    }

    try {
      const module = this.activeModules.get(pluginId);
      if (module) {
        const deactivator = module.default || module;
        if (deactivator.deactivate) {
          await deactivator.deactivate();
        }
      }

      // Dispose all subscriptions
      const subs = this.subscriptions.get(pluginId) || [];
      for (const sub of subs) {
        sub.dispose();
      }
      this.subscriptions.delete(pluginId);

      // Remove module
      this.activeModules.delete(pluginId);

      plugin.state = 'inactive';
      delete plugin.enabledAt;
      await this.persistPlugins();

      this.emit('plugin:deactivated', plugin);
    } catch (error) {
      plugin.state = 'error';
      plugin.error = error instanceof Error ? error.message : 'Unknown error';
      await this.persistPlugins();

      this.emit('plugin:error', pluginId, error as Error);
      throw error;
    }
  }

  async update(pluginId: string, newManifest: PluginManifest): Promise<PluginInstance> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Deactivate if active
    const wasActive = plugin.state === 'active';
    if (wasActive) {
      await this.deactivate(pluginId);
    }

    // Update manifest
    plugin.manifest = newManifest;
    plugin.updatedAt = new Date().toISOString();
    plugin.state = 'inactive';
    delete plugin.error;

    await this.persistPlugins();

    // Reactivate if was active
    if (wasActive) {
      await this.activate(pluginId);
    }

    this.emit('plugin:updated', plugin);
    return plugin;
  }

  // ============================================================================
  // Plugin Queries
  // ============================================================================

  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  getActivePlugins(): PluginInstance[] {
    return this.getAllPlugins().filter((p) => p.state === 'active');
  }

  isInstalled(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  isActive(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    return plugin?.state === 'active';
  }

  // ============================================================================
  // Plugin Settings
  // ============================================================================

  getSettings(pluginId: string): Record<string, unknown> {
    const plugin = this.plugins.get(pluginId);
    return plugin?.settings || {};
  }

  async updateSettings(pluginId: string, settings: Record<string, unknown>): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    plugin.settings = { ...plugin.settings, ...settings };
    plugin.updatedAt = new Date().toISOString();
    await this.persistPlugins();
  }

  // ============================================================================
  // Events
  // ============================================================================

  on<K extends keyof PluginRegistryEvents>(
    event: K,
    callback: EventCallback<K>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback as EventCallback<keyof PluginRegistryEvents>);

    return () => {
      this.eventListeners.get(event)?.delete(callback as EventCallback<keyof PluginRegistryEvents>);
    };
  }

  private emit<K extends keyof PluginRegistryEvents>(
    event: K,
    ...args: Parameters<PluginRegistryEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          (listener as (...args: unknown[]) => void)(...args);
        } catch (error) {
          console.error(`Error in plugin event listener for ${event}:`, error);
        }
      }
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id || !/^[a-z0-9-]+$/.test(manifest.id)) {
      throw new Error('Invalid plugin ID. Must be lowercase alphanumeric with hyphens.');
    }
    if (!manifest.name) {
      throw new Error('Plugin name is required');
    }
    if (!manifest.version || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      throw new Error('Invalid plugin version. Must follow semver.');
    }
    if (!manifest.main) {
      throw new Error('Plugin main entry point is required');
    }
    if (!manifest.permissions || !Array.isArray(manifest.permissions)) {
      throw new Error('Plugin permissions array is required');
    }
  }

  private getDefaultSettings(manifest: PluginManifest): Record<string, unknown> {
    const settings: Record<string, unknown> = {};
    if (manifest.settings?.properties) {
      for (const [key, setting] of Object.entries(manifest.settings.properties)) {
        settings[key] = setting.default;
      }
    }
    return settings;
  }

  private async loadPluginModule(manifest: PluginManifest): Promise<PluginModule> {
    // In production, this would load from a CDN or local file
    // For now, we simulate dynamic import
    // This would be something like:
    // return await import(/* webpackIgnore: true */ manifest.main);

    // For simulation, return a no-op module
    return {
      activate: async () => {
        console.log(`Plugin ${manifest.id} activated`);
      },
      deactivate: async () => {
        console.log(`Plugin ${manifest.id} deactivated`);
      },
    };
  }

  private createPluginContext(plugin: PluginInstance): PluginContext {
    const pluginId = plugin.manifest.id;

    return {
      pluginId,
      manifest: plugin.manifest,
      storage: this.createPluginStorage(pluginId),
      subscriptions: [],
      log: this.createPluginLogger(pluginId),
    };
  }

  private createPluginStorage(pluginId: string): PluginStorage {
    const prefix = `${this.storagePrefix}${pluginId}_`;

    return {
      async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
        const value = localStorage.getItem(prefix + key);
        if (value === null) return defaultValue;
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      },
      async set<T>(key: string, value: T): Promise<void> {
        localStorage.setItem(prefix + key, JSON.stringify(value));
      },
      async delete(key: string): Promise<void> {
        localStorage.removeItem(prefix + key);
      },
      async keys(): Promise<string[]> {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(prefix)) {
            keys.push(key.slice(prefix.length));
          }
        }
        return keys;
      },
      async clear(): Promise<void> {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        for (const key of keysToRemove) {
          localStorage.removeItem(key);
        }
      },
    };
  }

  private createPluginLogger(pluginId: string): PluginLogger {
    const prefix = `[Plugin:${pluginId}]`;
    return {
      info: (message, ...args) => console.info(prefix, message, ...args),
      warn: (message, ...args) => console.warn(prefix, message, ...args),
      error: (message, ...args) => console.error(prefix, message, ...args),
      debug: (message, ...args) => console.debug(prefix, message, ...args),
    };
  }

  private createPluginAPI(_plugin: PluginInstance): FluxStudioAPI {
    // This would provide the actual API implementation
    // For now, return a skeleton
    return {
      version: '1.0.0',
      commands: {
        register: (id, _callback) => ({
          dispose: () => console.log(`Command ${id} disposed`),
        }),
        execute: async (id, ...args) => {
          console.log(`Executing command ${id}`, args);
        },
        getAll: () => [],
      },
      ui: {
        showNotification: (options) => console.log('Notification:', options),
        showModal: async (_component) => null,
        registerPanel: (panel, _component) => ({
          dispose: () => console.log(`Panel ${panel.id} disposed`),
        }),
        registerToolbarItem: (item) => ({
          dispose: () => console.log(`Toolbar item ${item.id} disposed`),
        }),
      },
      projects: {
        getCurrent: async () => null,
        getAll: async () => [],
        open: async (projectId) => console.log(`Opening project ${projectId}`),
        create: async (options) => ({
          id: 'new-project',
          name: options.name,
          type: options.type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      },
      files: {
        read: async (_path) => '',
        write: async (path, _content) => console.log(`Writing to ${path}`),
        delete: async (path) => console.log(`Deleting ${path}`),
        exists: async (_path) => false,
        list: async (_path) => [],
      },
      ai: {
        chat: async (_messages) => ({ content: 'AI response' }),
        generate: async (_prompt, type) => ({ result: null, type }),
        suggest: async (_context) => [],
      },
      events: {
        on: (event, _callback) => ({
          dispose: () => console.log(`Event ${event} unsubscribed`),
        }),
        emit: (event, ...args) => console.log(`Emitting ${event}`, args),
      },
      workspace: {
        getConfiguration: (_section) => ({}),
        updateConfiguration: async (section, _value) => console.log(`Config updated: ${section}`),
        onDidChangeConfiguration: (_callback) => ({
          dispose: () => console.log('Config listener disposed'),
        }),
      },
    };
  }

  private async clearPluginStorage(pluginId: string): Promise<void> {
    const storage = this.createPluginStorage(pluginId);
    await storage.clear();
  }

  private async persistPlugins(): Promise<void> {
    const data = Array.from(this.plugins.entries());
    localStorage.setItem('flux_plugins_registry', JSON.stringify(data));
  }

  async loadPersistedPlugins(): Promise<void> {
    const data = localStorage.getItem('flux_plugins_registry');
    if (data) {
      try {
        const entries: [string, PluginInstance][] = JSON.parse(data);
        for (const [id, plugin] of entries) {
          plugin.state = 'inactive'; // Reset state on load
          this.plugins.set(id, plugin);
        }
      } catch (error) {
        console.error('Failed to load persisted plugins:', error);
      }
    }
  }
}

export const pluginRegistry = new PluginRegistry();
export default pluginRegistry;
