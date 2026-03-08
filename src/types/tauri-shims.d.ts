/**
 * Type declarations for Tauri APIs.
 *
 * These modules are only available at runtime inside a Tauri webview.
 * The declarations satisfy the TypeScript compiler for dynamic imports
 * that are guarded by isTauri() checks.
 */

declare module '@tauri-apps/api/core' {
  export function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}

declare module 'tauri-plugin-deep-link-api' {
  export function onOpenUrl(callback: (urls: string[]) => void): Promise<() => void>;
}
