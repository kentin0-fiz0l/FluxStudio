import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../lib/logger', () => ({
  serviceLogger: {
    child: () => ({
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
    }),
  },
}));

// We need to reset the singleton between tests, so we re-import each time
let GoogleOAuthManager: typeof import('../GoogleOAuthManager').default;

describe('GoogleOAuthManager', () => {
  let originalConsoleError: typeof console.error;
  let originalConsoleWarn: typeof console.warn;

  beforeEach(async () => {
    // Save original console methods
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;

    // Reset DOM
    document.head.innerHTML = '';
    document.body.innerHTML = '';

    // Reset module to get a fresh singleton
    vi.resetModules();
    vi.mock('../../lib/logger', () => ({
      serviceLogger: {
        child: () => ({
          error: vi.fn(),
          warn: vi.fn(),
          debug: vi.fn(),
          info: vi.fn(),
        }),
      },
    }));
    const mod = await import('../GoogleOAuthManager');
    GoogleOAuthManager = mod.default;
  });

  afterEach(() => {
    // Restore original console methods in case setupGlobalErrorListeners patched them
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    vi.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = GoogleOAuthManager.getInstance();
      const instance2 = GoogleOAuthManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return an object with expected public methods', () => {
      const instance = GoogleOAuthManager.getInstance();
      expect(typeof instance.initialize).toBe('function');
      expect(typeof instance.createButton).toBe('function');
      expect(typeof instance.removeButton).toBe('function');
      expect(typeof instance.preload).toBe('function');
      expect(typeof instance.cleanup).toBe('function');
      expect(typeof instance.getStatus).toBe('function');
    });
  });

  describe('getStatus', () => {
    it('should return initial status before initialization', () => {
      const status = GoogleOAuthManager.getInstance().getStatus();
      expect(status.isInitialized).toBe(false);
      expect(status.isScriptLoaded).toBe(false);
      expect(status.isScriptLoading).toBe(false);
      expect(status.activeButtonsCount).toBe(0);
      expect(status.hasConfigurationError).toBe(false);
      expect(status.config).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should load the Google script and mark as initialized', async () => {
      const manager = GoogleOAuthManager.getInstance();

      // Simulate script loading by catching the script element append
      const appendChildSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
        const script = node as HTMLScriptElement;
        // Trigger onload asynchronously
        setTimeout(() => script.onload?.(new Event('load')), 0);
        return node;
      });

      await manager.initialize({ clientId: 'test-client-id' });

      expect(manager.getStatus().isInitialized).toBe(true);
      expect(manager.getStatus().isScriptLoaded).toBe(true);
      expect(manager.getStatus().config?.clientId).toBe('test-client-id');
      appendChildSpy.mockRestore();
    });

    it('should be idempotent when called with the same config', async () => {
      const manager = GoogleOAuthManager.getInstance();
      const appendChildSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
        const script = node as HTMLScriptElement;
        setTimeout(() => script.onload?.(new Event('load')), 0);
        return node;
      });

      await manager.initialize({ clientId: 'test-id' });

      // Second call should be a no-op
      await manager.initialize({ clientId: 'test-id' });
      // The script shouldn't be appended again beyond the resource hints
      expect(manager.getStatus().isInitialized).toBe(true);
      appendChildSpy.mockRestore();
    });

    it('should detect existing script and not create a duplicate', async () => {
      const manager = GoogleOAuthManager.getInstance();

      // Pre-add a Google script to the DOM
      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);

      await manager.initialize({ clientId: 'test-id' });
      expect(manager.getStatus().isInitialized).toBe(true);
      expect(manager.getStatus().isScriptLoaded).toBe(true);
    });

    it('should throw and set configuration error when script fails to load', async () => {
      const manager = GoogleOAuthManager.getInstance();

      vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
        const script = node as HTMLScriptElement;
        setTimeout(() => script.onerror?.(new Event('error')), 0);
        return node;
      });

      // Remove any existing google script
      document.querySelectorAll('script[src*="accounts.google.com"]').forEach((s) => s.remove());

      await expect(manager.initialize({ clientId: 'test-id' })).rejects.toThrow('Failed to load Google OAuth script');
      expect(manager.getStatus().isInitialized).toBe(false);
      expect(manager.getStatus().hasConfigurationError).toBe(true);
    });

    it('should throw if called again after a configuration error', async () => {
      const manager = GoogleOAuthManager.getInstance();

      vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
        const script = node as HTMLScriptElement;
        setTimeout(() => script.onerror?.(new Event('error')), 0);
        return node;
      });

      await expect(manager.initialize({ clientId: 'test-id' })).rejects.toThrow();

      // Second call should throw immediately about configuration error
      await expect(manager.initialize({ clientId: 'test-id-2' })).rejects.toThrow(
        'Google OAuth configuration error'
      );
    });
  });

  describe('createButton', () => {
    it('should throw if not initialized', async () => {
      const manager = GoogleOAuthManager.getInstance();
      await expect(
        manager.createButton('btn-container', {
          onSuccess: vi.fn(),
        })
      ).rejects.toThrow('GoogleOAuthManager not initialized');
    });

    it('should throw if container element not found', async () => {
      const manager = GoogleOAuthManager.getInstance();

      // Initialize first
      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      // Set up window.google mock
      (window as any).google = {
        accounts: {
          id: {
            initialize: vi.fn(),
            renderButton: vi.fn(),
            prompt: vi.fn(),
          },
        },
      };

      await expect(
        manager.createButton('nonexistent', { onSuccess: vi.fn() })
      ).rejects.toThrow("Container with id 'nonexistent' not found");
    });

    it('should create a button and return an id', async () => {
      const manager = GoogleOAuthManager.getInstance();

      // Prepare DOM and Google mock
      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      (window as any).google = {
        accounts: {
          id: {
            initialize: vi.fn(),
            renderButton: vi.fn(),
            prompt: vi.fn(),
          },
        },
      };

      const container = document.createElement('div');
      container.id = 'btn-container';
      document.body.appendChild(container);

      const buttonId = await manager.createButton('btn-container', {
        onSuccess: vi.fn(),
      });

      expect(buttonId).toContain('google-oauth-btn-btn-container');
      expect(manager.getStatus().activeButtonsCount).toBe(1);
    });

    it('should call google.accounts.id.initialize and renderButton', async () => {
      const manager = GoogleOAuthManager.getInstance();

      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      const initializeFn = vi.fn();
      const renderButtonFn = vi.fn();
      (window as any).google = {
        accounts: {
          id: {
            initialize: initializeFn,
            renderButton: renderButtonFn,
            prompt: vi.fn(),
          },
        },
      };

      const container = document.createElement('div');
      container.id = 'btn-container';
      document.body.appendChild(container);

      await manager.createButton('btn-container', {
        theme: 'filled_blue',
        size: 'medium',
        onSuccess: vi.fn(),
      });

      expect(initializeFn).toHaveBeenCalledWith(
        expect.objectContaining({ client_id: 'test-id' })
      );
      expect(renderButtonFn).toHaveBeenCalledWith(
        container,
        expect.objectContaining({ theme: 'filled_blue', size: 'medium' })
      );
    });

    it('should remove existing button before creating a new one in same container', async () => {
      const manager = GoogleOAuthManager.getInstance();

      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      (window as any).google = {
        accounts: {
          id: {
            initialize: vi.fn(),
            renderButton: vi.fn(),
            prompt: vi.fn(),
          },
        },
      };

      const container = document.createElement('div');
      container.id = 'btn-container';
      document.body.appendChild(container);

      await manager.createButton('btn-container', { onSuccess: vi.fn() });
      expect(manager.getStatus().activeButtonsCount).toBe(1);

      await manager.createButton('btn-container', { onSuccess: vi.fn() });
      // Should still be 1, not 2 (old one removed first)
      expect(manager.getStatus().activeButtonsCount).toBe(1);
    });

    it('should use default theme/size/text/shape when not specified', async () => {
      const manager = GoogleOAuthManager.getInstance();

      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      const renderButtonFn = vi.fn();
      (window as any).google = {
        accounts: {
          id: {
            initialize: vi.fn(),
            renderButton: renderButtonFn,
            prompt: vi.fn(),
          },
        },
      };

      const container = document.createElement('div');
      container.id = 'defaults-container';
      document.body.appendChild(container);

      await manager.createButton('defaults-container', { onSuccess: vi.fn() });

      expect(renderButtonFn).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          theme: 'filled_black',
          size: 'large',
          text: 'signup_with',
          shape: 'rectangular',
        })
      );
    });

    it('should throw when there is a configuration error', async () => {
      const manager = GoogleOAuthManager.getInstance();

      // Initialize successfully first
      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      // Manually trigger configuration error state via the console.error listener
      // The setupGlobalErrorListeners patches console.error
      console.error('Something not allowed for this client id');

      const container = document.createElement('div');
      container.id = 'err-container';
      document.body.appendChild(container);

      await expect(
        manager.createButton('err-container', { onSuccess: vi.fn() })
      ).rejects.toThrow('Google OAuth is not configured for this domain');
    });

    it('should invoke onSuccess callback when Google credential response arrives', async () => {
      const manager = GoogleOAuthManager.getInstance();

      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      let capturedCallback: ((response: any) => void) | undefined;
      (window as any).google = {
        accounts: {
          id: {
            initialize: (config: any) => {
              capturedCallback = config.callback;
            },
            renderButton: vi.fn(),
            prompt: vi.fn(),
          },
        },
      };

      const container = document.createElement('div');
      container.id = 'callback-container';
      document.body.appendChild(container);

      const onSuccess = vi.fn();
      await manager.createButton('callback-container', { onSuccess });

      // Simulate Google calling back
      capturedCallback?.({ credential: 'fake-jwt-token' });
      expect(onSuccess).toHaveBeenCalledWith({ credential: 'fake-jwt-token' });
    });

    it('should call onError when success callback throws', async () => {
      const manager = GoogleOAuthManager.getInstance();

      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      let capturedCallback: ((response: any) => void) | undefined;
      (window as any).google = {
        accounts: {
          id: {
            initialize: (config: any) => {
              capturedCallback = config.callback;
            },
            renderButton: vi.fn(),
            prompt: vi.fn(),
          },
        },
      };

      const container = document.createElement('div');
      container.id = 'error-callback-container';
      document.body.appendChild(container);

      const onSuccess = vi.fn(() => {
        throw new Error('Callback error');
      });
      const onError = vi.fn();
      await manager.createButton('error-callback-container', { onSuccess, onError });

      capturedCallback?.({ credential: 'test' });
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('removeButton', () => {
    it('should remove button and clean up container', async () => {
      const manager = GoogleOAuthManager.getInstance();

      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      (window as any).google = {
        accounts: {
          id: {
            initialize: vi.fn(),
            renderButton: vi.fn(),
            prompt: vi.fn(),
          },
        },
      };

      const container = document.createElement('div');
      container.id = 'remove-btn';
      document.body.appendChild(container);

      await manager.createButton('remove-btn', { onSuccess: vi.fn() });
      expect(manager.getStatus().activeButtonsCount).toBe(1);

      manager.removeButton('remove-btn');
      expect(manager.getStatus().activeButtonsCount).toBe(0);
    });

    it('should be a no-op for nonexistent container id', () => {
      const manager = GoogleOAuthManager.getInstance();
      // Should not throw
      expect(() => manager.removeButton('nonexistent')).not.toThrow();
    });
  });

  describe('preload', () => {
    it('should add DNS prefetch and preconnect hints to document head', async () => {
      const manager = GoogleOAuthManager.getInstance();

      // Pre-add a script so loadGoogleScript resolves immediately
      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);

      await manager.preload();

      const dnsPrefetches = document.querySelectorAll('link[rel="dns-prefetch"]');
      const preconnects = document.querySelectorAll('link[rel="preconnect"]');
      expect(dnsPrefetches.length).toBeGreaterThanOrEqual(2);
      expect(preconnects.length).toBeGreaterThanOrEqual(2);
    });

    it('should not duplicate hints on multiple preload calls', async () => {
      const manager = GoogleOAuthManager.getInstance();

      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);

      await manager.preload();
      const countBefore = document.querySelectorAll('link[rel="dns-prefetch"]').length;

      await manager.preload();
      const countAfter = document.querySelectorAll('link[rel="dns-prefetch"]').length;

      expect(countAfter).toBe(countBefore);
    });

    it('should attempt to load the script', async () => {
      const manager = GoogleOAuthManager.getInstance();

      const appendChildSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
        const el = node as HTMLElement;
        if (el.tagName === 'SCRIPT') {
          const script = el as HTMLScriptElement;
          setTimeout(() => script.onload?.(new Event('load')), 0);
        }
        return node;
      });

      await manager.preload();
      expect(manager.getStatus().isScriptLoaded).toBe(true);
      appendChildSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should clear all active buttons', async () => {
      const manager = GoogleOAuthManager.getInstance();

      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      (window as any).google = {
        accounts: {
          id: {
            initialize: vi.fn(),
            renderButton: vi.fn(),
            prompt: vi.fn(),
          },
        },
      };

      const c1 = document.createElement('div');
      c1.id = 'cleanup-btn-1';
      document.body.appendChild(c1);
      const c2 = document.createElement('div');
      c2.id = 'cleanup-btn-2';
      document.body.appendChild(c2);

      await manager.createButton('cleanup-btn-1', { onSuccess: vi.fn() });
      await manager.createButton('cleanup-btn-2', { onSuccess: vi.fn() });
      expect(manager.getStatus().activeButtonsCount).toBe(2);

      manager.cleanup();
      expect(manager.getStatus().activeButtonsCount).toBe(0);
    });

    it('should not throw when called with no active buttons', () => {
      const manager = GoogleOAuthManager.getInstance();
      expect(() => manager.cleanup()).not.toThrow();
    });
  });

  describe('global error listeners', () => {
    it('should detect OAuth config error in console.error', async () => {
      const manager = GoogleOAuthManager.getInstance();

      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      expect(manager.getStatus().hasConfigurationError).toBe(false);

      // The initialize method patches console.error
      console.error('Request not allowed for this client id');

      expect(manager.getStatus().hasConfigurationError).toBe(true);
    });

    it('should not flag COOP warnings as configuration errors', async () => {
      const manager = GoogleOAuthManager.getInstance();

      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      // The initialize patches console.warn
      console.warn('Cross-Origin-Opener-Policy issue with postMessage');

      expect(manager.getStatus().hasConfigurationError).toBe(false);
    });

    it('should set up error listeners only once (idempotent)', async () => {
      const manager = GoogleOAuthManager.getInstance();

      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      // Re-initialize with different client id (triggers setupGlobalErrorListeners again)
      // Reset initialized flag by doing a full cleanup via new init
      vi.resetModules();
      vi.mock('../../lib/logger', () => ({
        serviceLogger: {
          child: () => ({
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
            info: vi.fn(),
          }),
        },
      }));
      const mod2 = await import('../GoogleOAuthManager');
      const manager2 = mod2.default.getInstance();

      const existingScript2 = document.createElement('script');
      existingScript2.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript2);
      await manager2.initialize({ clientId: 'test-id' });
      await manager2.initialize({ clientId: 'test-id' }); // second call is idempotent

      // Should not throw
      expect(manager2.getStatus().isInitialized).toBe(true);
    });
  });

  describe('dark mode observer', () => {
    it('should set up MutationObserver on container after button creation', async () => {
      const manager = GoogleOAuthManager.getInstance();

      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      (window as any).google = {
        accounts: {
          id: {
            initialize: vi.fn(),
            renderButton: vi.fn(),
            prompt: vi.fn(),
          },
        },
      };

      const container = document.createElement('div');
      container.id = 'observer-container';
      document.body.appendChild(container);

      await manager.createButton('observer-container', { onSuccess: vi.fn() });

      // Wait for the setTimeout in applyDarkModeStyles
      await new Promise((resolve) => setTimeout(resolve, 150));

      // The container should have a _darkModeObserver property
      expect((container as any)._darkModeObserver).toBeDefined();
    });

    it('should disconnect observer on button cleanup', async () => {
      const manager = GoogleOAuthManager.getInstance();

      const existingScript = document.createElement('script');
      existingScript.src = 'https://accounts.google.com/gsi/client';
      document.head.appendChild(existingScript);
      await manager.initialize({ clientId: 'test-id' });

      (window as any).google = {
        accounts: {
          id: {
            initialize: vi.fn(),
            renderButton: vi.fn(),
            prompt: vi.fn(),
          },
        },
      };

      const container = document.createElement('div');
      container.id = 'observer-cleanup';
      document.body.appendChild(container);

      await manager.createButton('observer-cleanup', { onSuccess: vi.fn() });

      // Wait for observer setup
      await new Promise((resolve) => setTimeout(resolve, 150));

      const observer = (container as any)._darkModeObserver;
      const disconnectSpy = vi.spyOn(observer, 'disconnect');

      manager.removeButton('observer-cleanup');
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
});
