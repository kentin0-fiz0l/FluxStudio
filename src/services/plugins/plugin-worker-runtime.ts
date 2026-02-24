/**
 * Plugin Worker Runtime — runs inside the Web Worker.
 *
 * Receives RPC messages from the main thread, delegates to the loaded
 * plugin module, and proxies FluxStudioAPI calls back via postMessage.
 *
 * Sprint 36: Phase 4.1 Plugin System.
 */

 

interface RPCRequest {
  type: 'rpc';
  id: string;
  method: string;
  args: unknown[];
}

interface RPCResponse {
  type: 'rpc-response';
  id: string;
  result?: unknown;
  error?: string;
}

interface APICallRequest {
  type: 'api-call';
  id: string;
  path: string; // e.g. "ui.showNotification"
  args: unknown[];
}

interface APICallResponse {
  type: 'api-response';
  id: string;
  result?: unknown;
  error?: string;
}

// Pending API call promises (worker → main thread)
const pendingAPICalls = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let apiCallCounter = 0;

// The loaded plugin module
let pluginModule: {
  activate?: (context: unknown, api: unknown) => Promise<void> | void;
  deactivate?: () => Promise<void> | void;
} | null = null;

/**
 * Create a proxy API object that forwards calls to the main thread.
 */
function createAPIProxy(): unknown {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, namespace: string) {
      return new Proxy({}, {
        get(_t, method: string) {
          return (...args: unknown[]) => {
            const id = `api_${++apiCallCounter}`;
            const path = `${namespace}.${method}`;

            return new Promise((resolve, reject) => {
              pendingAPICalls.set(id, { resolve, reject });

              (self as unknown as Worker).postMessage({
                type: 'api-call',
                id,
                path,
                args,
              } satisfies APICallRequest);

              // Timeout after 30s
              setTimeout(() => {
                if (pendingAPICalls.has(id)) {
                  pendingAPICalls.delete(id);
                  reject(new Error(`API call ${path} timed out`));
                }
              }, 30_000);
            });
          };
        },
      });
    },
  };

  return new Proxy({}, handler);
}

/**
 * Load plugin code and extract the module.
 */
function loadPluginCode(code: string): void {
  // Create a module-like environment
  const exports: Record<string, unknown> = {};
  const module = { exports };

  // Wrap in a function to provide module/exports
  const wrapped = `(function(module, exports, self) {\n${code}\n})`;

   
  const factory = (0, eval)(wrapped);
  factory(module, exports, self);

  // Extract the plugin — support both CJS and ESM-like patterns
  const mod = module.exports as Record<string, unknown>;
  if (mod.default && typeof mod.default === 'object') {
    pluginModule = mod.default as typeof pluginModule;
  } else if (typeof mod.activate === 'function') {
    pluginModule = mod as typeof pluginModule;
  } else {
    pluginModule = mod as typeof pluginModule;
  }
}

// ==================== Message Handler ====================

self.addEventListener('message', async (event: MessageEvent) => {
  const data = event.data;

  // RPC call from main thread → worker
  if (data.type === 'rpc') {
    const req = data as RPCRequest;
    try {
      let result: unknown;

      switch (req.method) {
        case 'load': {
          const [code] = req.args as [string];
          loadPluginCode(code);
          result = true;
          break;
        }

        case 'activate': {
          const [context] = req.args as [unknown];
          const api = createAPIProxy();
          if (pluginModule?.activate) {
            await pluginModule.activate(context, api);
          }
          result = true;
          break;
        }

        case 'deactivate': {
          if (pluginModule?.deactivate) {
            await pluginModule.deactivate();
          }
          pluginModule = null;
          result = true;
          break;
        }

        default:
          throw new Error(`Unknown RPC method: ${req.method}`);
      }

      (self as unknown as Worker).postMessage({
        type: 'rpc-response',
        id: req.id,
        result,
      } satisfies RPCResponse);
    } catch (error) {
      (self as unknown as Worker).postMessage({
        type: 'rpc-response',
        id: req.id,
        error: error instanceof Error ? error.message : String(error),
      } satisfies RPCResponse);
    }
  }

  // API response from main thread → worker
  if (data.type === 'api-response') {
    const resp = data as APICallResponse;
    const pending = pendingAPICalls.get(resp.id);
    if (pending) {
      pendingAPICalls.delete(resp.id);
      if (resp.error) {
        pending.reject(new Error(resp.error));
      } else {
        pending.resolve(resp.result);
      }
    }
  }
});

// Signal ready
(self as unknown as Worker).postMessage({ type: 'ready' });
