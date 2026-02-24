/**
 * PluginAPIFactory — Creates a real FluxStudioAPI for a given plugin,
 * gated by the plugin's declared permissions.
 *
 * Sprint 36: Phase 4.1 Plugin System.
 */

import type {
  FluxStudioAPI,
  PluginInstance,
  PluginPermission,
  PluginCommand,
  PluginPanel,
  PluginToolbarItem,
  PluginSubscription,
  NotificationOptions,
} from './types';
import { toast } from '@/lib/toast';
import { getApiUrl } from '@/utils/apiHelpers';

// ==================== Global Registries ====================

// Registered commands from all plugins
const commandRegistry = new Map<string, { pluginId: string; callback: (...args: unknown[]) => unknown }>();

// Registered panels from plugins
const panelRegistry = new Map<string, { pluginId: string; panel: PluginPanel; component: unknown }>();

// Registered toolbar items
const toolbarRegistry = new Map<string, { pluginId: string; item: PluginToolbarItem }>();

// Global event bus
type EventCallback = (...args: unknown[]) => void;
const eventBus = new Map<string, Set<{ pluginId: string; callback: EventCallback }>>();

// Configuration change listeners
const configListeners = new Set<{ pluginId: string; callback: (e: { affectsConfiguration: (s: string) => boolean }) => void }>();

// ==================== Public Accessors ====================

/** Get all registered commands (for command palette integration) */
export function getRegisteredCommands(): Array<PluginCommand & { pluginId: string }> {
  return Array.from(commandRegistry.entries()).map(([id, entry]) => ({
    id,
    title: id.replace(/\./g, ': ').replace(/-/g, ' '),
    pluginId: entry.pluginId,
  }));
}

/** Get all registered panels (for UI injection) */
export function getRegisteredPanels(): Array<{ pluginId: string; panel: PluginPanel; component: unknown }> {
  return Array.from(panelRegistry.values());
}

/** Get all registered toolbar items */
export function getRegisteredToolbarItems(): Array<{ pluginId: string; item: PluginToolbarItem }> {
  return Array.from(toolbarRegistry.values());
}

/** Execute a registered command by ID */
export async function executeCommand(commandId: string, ...args: unknown[]): Promise<unknown> {
  const entry = commandRegistry.get(commandId);
  if (!entry) throw new Error(`Command not found: ${commandId}`);
  return entry.callback(...args);
}

/** Emit a global event */
export function emitGlobalEvent(event: string, ...args: unknown[]): void {
  const listeners = eventBus.get(event);
  if (listeners) {
    for (const listener of listeners) {
      try {
        listener.callback(...args);
      } catch (err) {
        console.error(`[Plugin:${listener.pluginId}] Event handler error:`, err);
      }
    }
  }
}

/** Clean up all registrations for a plugin */
export function cleanupPlugin(pluginId: string): void {
  // Commands
  for (const [id, entry] of commandRegistry) {
    if (entry.pluginId === pluginId) commandRegistry.delete(id);
  }
  // Panels
  for (const [id, entry] of panelRegistry) {
    if (entry.pluginId === pluginId) panelRegistry.delete(id);
  }
  // Toolbar items
  for (const [id, entry] of toolbarRegistry) {
    if (entry.pluginId === pluginId) toolbarRegistry.delete(id);
  }
  // Events
  for (const [, listeners] of eventBus) {
    for (const listener of listeners) {
      if (listener.pluginId === pluginId) listeners.delete(listener);
    }
  }
  // Config listeners
  for (const listener of configListeners) {
    if (listener.pluginId === pluginId) configListeners.delete(listener);
  }
}

// ==================== Factory ====================

function requirePermission(plugin: PluginInstance, permission: PluginPermission, action: string): void {
  if (!plugin.manifest.permissions.includes(permission)) {
    throw new Error(
      `Plugin "${plugin.manifest.name}" lacks "${permission}" permission for: ${action}`
    );
  }
}

/**
 * Get the auth token from localStorage (same pattern as useAuth).
 */
function getToken(): string {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('Not authenticated');
  return token;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(getApiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export function createPluginAPI(plugin: PluginInstance): FluxStudioAPI {
  const pluginId = plugin.manifest.id;

  return {
    version: '1.0.0',

    // ==================== Commands ====================
    commands: {
      register(id: string, callback: (...args: unknown[]) => unknown): PluginSubscription {
        requirePermission(plugin, 'commands', `register command ${id}`);
        const fullId = `${pluginId}.${id}`;
        commandRegistry.set(fullId, { pluginId, callback });
        return {
          dispose: () => { commandRegistry.delete(fullId); },
        };
      },

      async execute(id: string, ...args: unknown[]): Promise<unknown> {
        return executeCommand(id, ...args);
      },

      getAll(): PluginCommand[] {
        return Array.from(commandRegistry.keys()).map((id) => ({
          id,
          title: id.replace(/\./g, ': ').replace(/-/g, ' '),
        }));
      },
    },

    // ==================== UI ====================
    ui: {
      showNotification(options: NotificationOptions): void {
        requirePermission(plugin, 'ui', 'showNotification');
        switch (options.type) {
          case 'success': toast.success(options.title); break;
          case 'error': toast.error(options.title); break;
          case 'warning': if (toast.warning) { toast.warning(options.title); } else { toast.error(options.title); } break;
          default: if (toast.info) { toast.info(options.title); } else { toast.success(options.title); } break;
        }
      },

      async showModal(_component: unknown): Promise<unknown> {
        requirePermission(plugin, 'ui', 'showModal');
        // Modal rendering is handled by the React layer listening to events
        emitGlobalEvent('plugin:modal', { pluginId, component: _component });
        return null;
      },

      registerPanel(panel: PluginPanel, component: unknown): PluginSubscription {
        requirePermission(plugin, 'ui', `registerPanel ${panel.id}`);
        const fullId = `${pluginId}.${panel.id}`;
        panelRegistry.set(fullId, { pluginId, panel, component });
        emitGlobalEvent('plugin:panels-changed');
        return {
          dispose: () => {
            panelRegistry.delete(fullId);
            emitGlobalEvent('plugin:panels-changed');
          },
        };
      },

      registerToolbarItem(item: PluginToolbarItem): PluginSubscription {
        requirePermission(plugin, 'ui', `registerToolbarItem ${item.id}`);
        const fullId = `${pluginId}.${item.id}`;
        toolbarRegistry.set(fullId, { pluginId, item });
        emitGlobalEvent('plugin:toolbar-changed');
        return {
          dispose: () => {
            toolbarRegistry.delete(fullId);
            emitGlobalEvent('plugin:toolbar-changed');
          },
        };
      },
    },

    // ==================== Projects ====================
    projects: {
      async getCurrent() {
        requirePermission(plugin, 'projects', 'getCurrent');
        // Return null — the active project is UI-level state
        return null;
      },

      async getAll() {
        requirePermission(plugin, 'projects', 'getAll');
        const data = await apiFetch<{ projects: unknown[] }>('/api/projects');
        return (data.projects || []).map((p) => {
          const proj = p as Record<string, unknown>;
          return {
          id: proj.id as string,
          name: proj.name as string,
          type: (proj.type as string) || 'default',
          createdAt: proj.created_at as string,
          updatedAt: proj.updated_at as string,
          };
        });
      },

      async open(_projectId: string) {
        requirePermission(plugin, 'projects', 'open');
        emitGlobalEvent('plugin:navigate', `/projects/${_projectId}`);
      },

      async create(options) {
        requirePermission(plugin, 'projects', 'create');
        const data = await apiFetch<{ project: Record<string, unknown> }>('/api/projects', {
          method: 'POST',
          body: JSON.stringify({ name: options.name, type: options.type }),
        });
        const p = data.project;
        return {
          id: p.id as string,
          name: p.name as string,
          type: (p.type as string) || options.type,
          createdAt: p.created_at as string,
          updatedAt: p.updated_at as string,
        };
      },
    },

    // ==================== Files ====================
    files: {
      async read(path: string) {
        requirePermission(plugin, 'files', 'read');
        const data = await apiFetch<{ content: string }>(`/api/files/read?path=${encodeURIComponent(path)}`);
        return data.content;
      },

      async write(path: string, content: string) {
        requirePermission(plugin, 'files', 'write');
        await apiFetch('/api/files/write', {
          method: 'POST',
          body: JSON.stringify({ path, content }),
        });
      },

      async delete(path: string) {
        requirePermission(plugin, 'files', 'delete');
        await apiFetch('/api/files/delete', {
          method: 'DELETE',
          body: JSON.stringify({ path }),
        });
      },

      async exists(path: string) {
        requirePermission(plugin, 'files', 'exists');
        const data = await apiFetch<{ exists: boolean }>(`/api/files/exists?path=${encodeURIComponent(path)}`);
        return data.exists;
      },

      async list(path: string) {
        requirePermission(plugin, 'files', 'list');
        const data = await apiFetch<{ files: unknown[] }>(`/api/files/list?path=${encodeURIComponent(path)}`);
        return (data.files || []).map((item) => {
          const f = item as Record<string, unknown>;
          return {
            name: f.name as string,
            path: f.path as string,
            type: f.type as 'file' | 'directory',
            size: f.size as number | undefined,
            modifiedAt: f.modified_at as string | undefined,
          };
        });
      },
    },

    // ==================== AI ====================
    ai: {
      async chat(messages) {
        requirePermission(plugin, 'ai', 'chat');
        const data = await apiFetch<{ content: string }>('/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify({ messages }),
        });
        return { content: data.content };
      },

      async generate(prompt: string, type: string) {
        requirePermission(plugin, 'ai', 'generate');
        const data = await apiFetch<{ result: unknown }>('/api/ai/generate', {
          method: 'POST',
          body: JSON.stringify({ prompt, type }),
        });
        return { result: data.result, type };
      },

      async suggest(context: unknown) {
        requirePermission(plugin, 'ai', 'suggest');
        const data = await apiFetch<{ suggestions: unknown[] }>('/api/ai/suggest', {
          method: 'POST',
          body: JSON.stringify({ context }),
        });
        return (data.suggestions || []).map((item) => {
          const s = item as Record<string, unknown>;
          return {
            id: s.id as string,
            title: s.title as string,
            description: s.description as string,
            confidence: s.confidence as number,
          };
        });
      },
    },

    // ==================== Events ====================
    events: {
      on(event: string, callback: (...args: unknown[]) => void): PluginSubscription {
        if (!eventBus.has(event)) eventBus.set(event, new Set());
        const entry = { pluginId, callback };
        eventBus.get(event)!.add(entry);
        return {
          dispose: () => { eventBus.get(event)?.delete(entry); },
        };
      },

      emit(event: string, ...args: unknown[]): void {
        emitGlobalEvent(`${pluginId}:${event}`, ...args);
      },
    },

    // ==================== Workspace ====================
    workspace: {
      getConfiguration(section?: string) {
        const settings = plugin.settings || {};
        if (section) {
          return { [section]: settings[section] };
        }
        return { ...settings };
      },

      async updateConfiguration(section: string, value: unknown) {
        // Import dynamically to avoid circular dependency
        const { pluginRegistry } = await import('./PluginRegistry');
        await pluginRegistry.updateSettings(pluginId, { [section]: value });
        for (const listener of configListeners) {
          if (listener.pluginId === pluginId) {
            listener.callback({
              affectsConfiguration: (s: string) => s === section,
            });
          }
        }
      },

      onDidChangeConfiguration(callback) {
        const entry = { pluginId, callback };
        configListeners.add(entry);
        return {
          dispose: () => { configListeners.delete(entry); },
        };
      },
    },
  };
}
