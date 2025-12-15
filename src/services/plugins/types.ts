/**
 * Plugin System Types
 *
 * Core type definitions for the FluxStudio plugin architecture.
 */

// ============================================================================
// Plugin Metadata
// ============================================================================

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];

  // Entry points
  main: string; // Main JS bundle
  styles?: string; // Optional CSS

  // Required permissions
  permissions: PluginPermission[];

  // Compatibility
  fluxStudioVersion: string; // Semver range
  dependencies?: Record<string, string>;

  // Extension points
  contributes?: PluginContributions;

  // Settings schema
  settings?: PluginSettingsSchema;
}

export type PluginPermission =
  | 'storage'         // Access to plugin-scoped storage
  | 'projects'        // Read/write access to projects
  | 'files'           // Access file system operations
  | 'network'         // Make network requests
  | 'notifications'   // Show notifications
  | 'commands'        // Register commands
  | 'ui'              // Inject UI components
  | 'ai'              // Access AI features
  | 'collaboration'   // Access collaboration features
  | 'system'          // System-level access (admin only)
  ;

export interface PluginContributions {
  commands?: PluginCommand[];
  menus?: PluginMenuItem[];
  panels?: PluginPanel[];
  toolbarItems?: PluginToolbarItem[];
  contextMenus?: PluginContextMenu[];
  themes?: PluginTheme[];
  languages?: PluginLanguage[];
  fileTypes?: PluginFileType[];
}

// ============================================================================
// Plugin Commands
// ============================================================================

export interface PluginCommand {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  category?: string;
  when?: string; // Condition expression
}

export interface PluginMenuItem {
  id: string;
  command: string;
  group?: string;
  order?: number;
  when?: string;
}

// ============================================================================
// Plugin UI Components
// ============================================================================

export interface PluginPanel {
  id: string;
  title: string;
  icon?: string;
  location: 'sidebar' | 'bottomPanel' | 'rightPanel' | 'modal';
  defaultSize?: { width: number; height: number };
  when?: string;
}

export interface PluginToolbarItem {
  id: string;
  command: string;
  icon: string;
  tooltip?: string;
  location: 'main' | 'editor' | 'statusBar';
  order?: number;
  when?: string;
}

export interface PluginContextMenu {
  id: string;
  targetType: 'editor' | 'project' | 'file' | 'canvas' | 'timeline';
  items: PluginMenuItem[];
}

// ============================================================================
// Plugin Theming
// ============================================================================

export interface PluginTheme {
  id: string;
  name: string;
  type: 'dark' | 'light';
  colors: Record<string, string>;
}

export interface PluginLanguage {
  id: string;
  name: string;
  extensions: string[];
  configuration?: {
    comments?: {
      lineComment?: string;
      blockComment?: [string, string];
    };
    brackets?: [string, string][];
    autoClosingPairs?: { open: string; close: string }[];
  };
}

export interface PluginFileType {
  id: string;
  name: string;
  extensions: string[];
  icon?: string;
  editor?: string;
}

// ============================================================================
// Plugin Settings
// ============================================================================

export type PluginSettingType = 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'color' | 'file';

export interface PluginSetting {
  key: string;
  type: PluginSettingType;
  title: string;
  description?: string;
  default: unknown;
  enum?: { value: string | number; label: string }[];
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface PluginSettingsSchema {
  title?: string;
  properties: Record<string, PluginSetting>;
}

// ============================================================================
// Plugin State
// ============================================================================

export type PluginState = 'inactive' | 'loading' | 'active' | 'error' | 'disabled';

export interface PluginInstance {
  manifest: PluginManifest;
  state: PluginState;
  error?: string;
  settings: Record<string, unknown>;
  installedAt: string;
  updatedAt: string;
  enabledAt?: string;
}

// ============================================================================
// Plugin API
// ============================================================================

export interface PluginContext {
  // Plugin info
  pluginId: string;
  manifest: PluginManifest;

  // Storage
  storage: PluginStorage;

  // Subscriptions
  subscriptions: PluginSubscription[];

  // Logging
  log: PluginLogger;
}

export interface PluginStorage {
  get<T>(key: string, defaultValue?: T): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

export interface PluginSubscription {
  dispose(): void;
}

export interface PluginLogger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

// ============================================================================
// Plugin API Surface
// ============================================================================

export interface FluxStudioAPI {
  // Version info
  version: string;

  // Commands
  commands: {
    register(id: string, callback: (...args: unknown[]) => unknown): PluginSubscription;
    execute(id: string, ...args: unknown[]): Promise<unknown>;
    getAll(): PluginCommand[];
  };

  // UI
  ui: {
    showNotification(options: NotificationOptions): void;
    showModal(component: unknown): Promise<unknown>;
    registerPanel(panel: PluginPanel, component: unknown): PluginSubscription;
    registerToolbarItem(item: PluginToolbarItem): PluginSubscription;
  };

  // Projects
  projects: {
    getCurrent(): Promise<ProjectInfo | null>;
    getAll(): Promise<ProjectInfo[]>;
    open(projectId: string): Promise<void>;
    create(options: CreateProjectOptions): Promise<ProjectInfo>;
  };

  // Files
  files: {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    delete(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    list(path: string): Promise<FileInfo[]>;
  };

  // AI
  ai: {
    chat(messages: AIMessage[]): Promise<AIResponse>;
    generate(prompt: string, type: string): Promise<GenerationResult>;
    suggest(context: unknown): Promise<Suggestion[]>;
  };

  // Events
  events: {
    on(event: string, callback: (...args: unknown[]) => void): PluginSubscription;
    emit(event: string, ...args: unknown[]): void;
  };

  // Workspace
  workspace: {
    getConfiguration(section?: string): Record<string, unknown>;
    updateConfiguration(section: string, value: unknown): Promise<void>;
    onDidChangeConfiguration(callback: (e: ConfigurationChangeEvent) => void): PluginSubscription;
  };
}

// Supporting types for API
export interface NotificationOptions {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  actions?: { label: string; callback: () => void }[];
}

export interface ProjectInfo {
  id: string;
  name: string;
  type: string;
  path?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectOptions {
  name: string;
  type: string;
  template?: string;
}

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: { tokens: number };
}

export interface GenerationResult {
  result: unknown;
  type: string;
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
}

export interface ConfigurationChangeEvent {
  affectsConfiguration(section: string): boolean;
}

// ============================================================================
// Plugin Activation
// ============================================================================

export interface PluginActivator {
  activate(context: PluginContext, api: FluxStudioAPI): Promise<void> | void;
  deactivate?(): Promise<void> | void;
}

export interface PluginModule {
  default?: PluginActivator;
  activate?: PluginActivator['activate'];
  deactivate?: PluginActivator['deactivate'];
}
