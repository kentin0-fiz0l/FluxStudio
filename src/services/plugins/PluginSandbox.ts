/**
 * PluginSandbox — Web Worker-based isolation for plugin execution.
 *
 * Each plugin gets its own Worker. All API calls from the plugin
 * are proxied back to the main thread via message passing and
 * resolved against the real FluxStudioAPI.
 *
 * Sprint 36: Phase 4.1 Plugin System.
 */

import type { FluxStudioAPI, PluginContext } from './types';

// Import the worker runtime as a URL for Vite
import PluginWorkerURL from './plugin-worker-runtime.ts?worker&url';

interface PendingRPC {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class PluginSandbox {
  private worker: Worker | null = null;
  private pendingRPCs = new Map<string, PendingRPC>();
  private rpcCounter = 0;
  private api: FluxStudioAPI | null = null;
  private ready = false;
  private readyPromise: Promise<void>;
  private resolveReady!: () => void;

  readonly pluginId: string;

  constructor(pluginId: string) {
    this.pluginId = pluginId;
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
  }

  /**
   * Bind the real API implementation so we can resolve proxied calls.
   */
  setAPI(api: FluxStudioAPI): void {
    this.api = api;
  }

  /**
   * Load plugin code into the sandbox worker.
   */
  async load(code: string): Promise<void> {
    // Create worker from the runtime bundle
    this.worker = new Worker(PluginWorkerURL, { type: 'module' });
    this.worker.addEventListener('message', this.handleMessage);
    this.worker.addEventListener('error', this.handleError);

    // Wait for worker ready signal
    await this.readyPromise;

    // Send the plugin code to the worker for evaluation
    await this.rpc('load', [code]);
  }

  /**
   * Activate the plugin inside the sandbox.
   */
  async activate(context: PluginContext): Promise<void> {
    // We send a serializable subset of the context (no functions)
    const serializableContext = {
      pluginId: context.pluginId,
      manifest: context.manifest,
    };
    await this.rpc('activate', [serializableContext]);
  }

  /**
   * Deactivate and clean up.
   */
  async deactivate(): Promise<void> {
    try {
      await this.rpc('deactivate', [], 5_000);
    } catch {
      // If deactivation times out, still proceed with cleanup
    }
  }

  /**
   * Terminate the worker and release resources.
   */
  dispose(): void {
    if (this.worker) {
      this.worker.removeEventListener('message', this.handleMessage);
      this.worker.removeEventListener('error', this.handleError);
      this.worker.terminate();
      this.worker = null;
    }

    // Reject all pending RPCs
    for (const [, pending] of this.pendingRPCs) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Plugin sandbox disposed'));
    }
    this.pendingRPCs.clear();
    this.api = null;
    this.ready = false;
  }

  // ==================== Private ====================

  private rpc(method: string, args: unknown[], timeout = 30_000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.worker || !this.ready) {
        return reject(new Error('Worker not initialized'));
      }

      const id = `rpc_${++this.rpcCounter}`;
      const timer = setTimeout(() => {
        this.pendingRPCs.delete(id);
        reject(new Error(`RPC ${method} timed out after ${timeout}ms`));
      }, timeout);

      this.pendingRPCs.set(id, { resolve, reject, timer });

      this.worker.postMessage({
        type: 'rpc',
        id,
        method,
        args,
      });
    });
  }

  private handleMessage = (event: MessageEvent): void => {
    const data = event.data;

    // Worker ready signal
    if (data.type === 'ready') {
      this.ready = true;
      this.resolveReady();
      return;
    }

    // RPC response from worker
    if (data.type === 'rpc-response') {
      const pending = this.pendingRPCs.get(data.id);
      if (pending) {
        this.pendingRPCs.delete(data.id);
        clearTimeout(pending.timer);
        if (data.error) {
          pending.reject(new Error(data.error));
        } else {
          pending.resolve(data.result);
        }
      }
      return;
    }

    // API call from worker → main thread
    if (data.type === 'api-call') {
      this.handleAPICall(data.id, data.path, data.args);
      return;
    }
  };

  private handleError = (event: ErrorEvent): void => {
    console.error(`[PluginSandbox:${this.pluginId}] Worker error:`, event.message);
  };

  /**
   * Resolve a proxied API call from the worker.
   * path is like "ui.showNotification" or "projects.getCurrent"
   */
  private async handleAPICall(id: string, path: string, args: unknown[]): Promise<void> {
    try {
      if (!this.api) {
        throw new Error('Plugin API not initialized');
      }

      const [namespace, method] = path.split('.');
      const ns = (this.api as unknown as Record<string, unknown>)[namespace];

      if (!ns || typeof ns !== 'object') {
        throw new Error(`Unknown API namespace: ${namespace}`);
      }

      const fn = (ns as Record<string, unknown>)[method];
      if (typeof fn !== 'function') {
        throw new Error(`Unknown API method: ${path}`);
      }

      const result = await fn(...args);

      this.worker?.postMessage({
        type: 'api-response',
        id,
        result,
      });
    } catch (error) {
      this.worker?.postMessage({
        type: 'api-response',
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
