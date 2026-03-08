/**
 * Tauri Desktop Bridge
 *
 * Feature-detection layer that enables native desktop features when running
 * inside a Tauri webview. All exports no-op gracefully in the browser.
 *
 * Uses dynamic import() with module path variables to avoid TypeScript
 * resolution errors when @tauri-apps/api is not installed (web-only dev).
 */

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
}

/** Returns true when the app is running inside Tauri's webview. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

// Type for Tauri event listen/unlisten
type UnlistenFn = () => void;
type TauriListenFn = (event: string, handler: (event: { payload: unknown }) => void) => Promise<UnlistenFn>;

/**
 * Dynamically import the Tauri core invoke function.
 * Uses a variable to prevent TypeScript from resolving the module at compile time.
 */
async function getTauriInvoke(): Promise<(cmd: string, args?: Record<string, unknown>) => Promise<unknown>> {
  const mod = '@tauri-apps/api/core';
  const { invoke } = await (Function('m', 'return import(m)')(mod) as Promise<{ invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> }>);
  return invoke;
}

/** Dynamically import the Tauri event listen function. */
async function getTauriListen(): Promise<TauriListenFn> {
  const mod = '@tauri-apps/api/event';
  const { listen } = await (Function('m', 'return import(m)')(mod) as Promise<{ listen: TauriListenFn }>);
  return listen;
}

/** Persist the current window position and size to disk. */
export async function saveWindowState(state: WindowState): Promise<void> {
  if (!isTauri()) return;
  const invoke = await getTauriInvoke();
  await invoke('save_window_state', { state });
}

/** Load previously saved window position and size. */
export async function loadWindowState(): Promise<WindowState | null> {
  if (!isTauri()) return null;
  const invoke = await getTauriInvoke();
  return invoke('load_window_state') as Promise<WindowState | null>;
}

/** Open a route in a separate native window (e.g. the formation editor). */
export async function openDetachedWindow(path: string): Promise<void> {
  if (!isTauri()) {
    window.open(path, '_blank');
    return;
  }
  const invoke = await getTauriInvoke();
  await invoke('open_detached_window', { path });
}

/** Update the system tray badge with the current unread count. */
export async function updateTrayBadge(count: number): Promise<void> {
  if (!isTauri()) return;
  const invoke = await getTauriInvoke();
  await invoke('update_tray_badge', { count });
}

/**
 * Listen for deep-link activations (web+fluxstudio:// URLs).
 * Returns an unsubscribe function.
 */
export function onDeepLink(callback: (url: string) => void): () => void {
  if (!isTauri()) return () => {};

  let unlisten: (() => void) | undefined;

  (async () => {
    try {
      const mod = 'tauri-plugin-deep-link-api';
      const deepLink = await (Function('m', 'return import(m)')(mod) as Promise<{ onOpenUrl: (handler: (urls: string[]) => void) => Promise<() => void> }>);
      unlisten = await deepLink.onOpenUrl((urls: string[]) => {
        for (const url of urls) {
          callback(url);
        }
      });
    } catch {
      // Deep-link plugin not available; ignore.
    }
  })();

  return () => {
    unlisten?.();
  };
}

export interface FileDropEvent {
  paths: string[];
}

/**
 * Listen for native file drag-and-drop events.
 * Returns an unsubscribe function.
 */
export function onFileDrop(callback: (event: FileDropEvent) => void): () => void {
  if (!isTauri()) return () => {};

  let unlisten: (() => void) | undefined;

  (async () => {
    try {
      const listen = await getTauriListen();
      unlisten = await listen('tauri://file-drop', (event) => {
        callback(event.payload as FileDropEvent);
      });
    } catch {
      // File drop listener not available; ignore.
    }
  })();

  return () => {
    unlisten?.();
  };
}

/**
 * Listen for native file drag hover events (files dragged over window).
 * Returns an unsubscribe function.
 */
export function onFileDropHover(callback: () => void): () => void {
  if (!isTauri()) return () => {};

  let unlisten: (() => void) | undefined;

  (async () => {
    try {
      const listen = await getTauriListen();
      unlisten = await listen('tauri://file-drop-hover', () => {
        callback();
      });
    } catch {
      // Listener not available; ignore.
    }
  })();

  return () => {
    unlisten?.();
  };
}

/**
 * Listen for native file drag cancelled events (files dragged away from window).
 * Returns an unsubscribe function.
 */
export function onFileDropCancelled(callback: () => void): () => void {
  if (!isTauri()) return () => {};

  let unlisten: (() => void) | undefined;

  (async () => {
    try {
      const listen = await getTauriListen();
      unlisten = await listen('tauri://file-drop-cancelled', () => {
        callback();
      });
    } catch {
      // Listener not available; ignore.
    }
  })();

  return () => {
    unlisten?.();
  };
}
