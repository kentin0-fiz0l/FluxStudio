/**
 * GoogleOAuthManager - Ultra-sleek singleton service for Google OAuth
 *
 * Features:
 * - Single instance guarantee across the entire application
 * - Intelligent script loading with caching
 * - Proactive duplicate prevention
 * - Performance optimization with preloading
 * - Comprehensive error handling and fallbacks
 */

interface ElementWithObserver extends HTMLElement {
  _darkModeObserver?: MutationObserver;
}

interface ElementWithReactInternals extends HTMLElement {
  _reactInternalInstance?: unknown;
  __reactInternalInstance?: unknown;
  __reactInternals?: unknown;
}

import { serviceLogger } from '../lib/logger';

const oauthLogger = serviceLogger.child('GoogleOAuth');

interface GoogleOAuthConfig {
  clientId: string;
  scope?: string;
  hostedDomain?: string;
}

interface GoogleOAuthButton {
  id: string;
  element: HTMLElement;
  cleanup: () => void;
}

class GoogleOAuthManager {
  private static instance: GoogleOAuthManager;
  private isInitialized = false;
  private isScriptLoaded = false;
  private isScriptLoading = false;
  private activeButtons = new Map<string, GoogleOAuthButton>();
  private config: GoogleOAuthConfig | null = null;
  private loadPromise: Promise<void> | null = null;
  private hasConfigurationError = false;
  private errorListenerSetup = false;

  // Singleton pattern
  private constructor() {}

  public static getInstance(): GoogleOAuthManager {
    if (!GoogleOAuthManager.instance) {
      GoogleOAuthManager.instance = new GoogleOAuthManager();
    }
    return GoogleOAuthManager.instance;
  }

  /**
   * Initialize the Google OAuth manager with configuration
   */
  public async initialize(config: GoogleOAuthConfig): Promise<void> {
    if (this.isInitialized && this.config?.clientId === config.clientId) {
      return; // Already initialized with same config
    }

    // Check if we already detected a configuration error
    if (this.hasConfigurationError) {
      throw new Error('Google OAuth configuration error: This domain is not authorized for the client ID');
    }

    this.config = config;

    // Set up global error listeners for OAuth failures
    this.setupGlobalErrorListeners();

    // AGGRESSIVE: Global cleanup before initializing
    this.globalCleanup();
    this.cleanup();

    try {
      await this.loadGoogleScript();
      this.isInitialized = true;
    } catch (error) {
      oauthLogger.error('Failed to initialize Google OAuth', error);
      this.isInitialized = false;
      this.hasConfigurationError = true;
      throw error;
    }
  }

  /**
   * Load Google Identity Services script with intelligent caching
   */
  private async loadGoogleScript(): Promise<void> {
    if (this.isScriptLoaded) {
      return;
    }

    if (this.isScriptLoading) {
      return this.loadPromise!;
    }

    this.isScriptLoading = true;
    this.loadPromise = new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existingScript) {
        this.isScriptLoaded = true;
        this.isScriptLoading = false;
        resolve();
        return;
      }

      // Create and configure script element
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.isScriptLoaded = true;
        this.isScriptLoading = false;
        resolve();
      };

      script.onerror = () => {
        this.isScriptLoading = false;
        reject(new Error('Failed to load Google OAuth script'));
      };

      // Add to document head
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  /**
   * Set up global error listeners to catch OAuth configuration errors
   */
  private setupGlobalErrorListeners(): void {
    if (this.errorListenerSetup) {
      return;
    }

    // Listen for console errors that indicate OAuth configuration problems
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ').toLowerCase();
      if (message.includes('not allowed') && message.includes('client id')) {
        this.hasConfigurationError = true;
        oauthLogger.warn('Google OAuth configuration error detected - disabling OAuth features');
      }
      originalConsoleError.apply(console, args);
    };

    // Listen for unhandled promise rejections that might be OAuth related
    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason?.message?.toLowerCase() || '';
      if (message.includes('not allowed') || message.includes('origin') || message.includes('403')) {
        this.hasConfigurationError = true;
        oauthLogger.warn('Google OAuth configuration error detected via promise rejection');
      }
    });

    // Listen for resource load errors (like 403 from iframes)
    window.addEventListener('error', (event) => {
      const target = event.target as HTMLElement;
      if (target &&
          target.tagName === 'IFRAME' &&
          target.getAttribute &&
          target.getAttribute('src')?.includes('accounts.google.com')) {
        this.hasConfigurationError = true;
        oauthLogger.warn('Google OAuth iframe failed to load - likely configuration error');
      }
    }, true);

    // Listen for Cross-Origin-Opener-Policy errors from Google OAuth
    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      const message = args.join(' ').toLowerCase();
      if (message.includes('cross-origin-opener-policy') &&
          message.includes('postmessage')) {
        oauthLogger.debug('Google OAuth Cross-Origin-Opener-Policy warning detected - this is expected and handled');
        // Don't disable OAuth for COOP warnings as they don't prevent functionality
      }
      originalConsoleWarn.apply(console, args);
    };

    this.errorListenerSetup = true;
  }

  /**
   * Create a unique Google OAuth button with guaranteed single instance
   */
  public async createButton(
    containerId: string,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      onSuccess: (response: any) => void;
      onError?: (error: any) => void;
    }
  ): Promise<string> {
    if (!this.isInitialized || !this.config) {
      throw new Error('GoogleOAuthManager not initialized');
    }

    // Check for configuration errors before attempting to create button
    if (this.hasConfigurationError) {
      throw new Error('Google OAuth is not configured for this domain. Please contact support.');
    }

    // Remove any existing button in this container
    this.removeButton(containerId);

    // Clean up any orphaned Google OAuth elements globally
    this.cleanupOrphanedElements();

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id '${containerId}' not found`);
    }

    // Clear container
    container.innerHTML = '';

    // Generate unique button ID
    const buttonId = `google-oauth-btn-${containerId}-${Date.now()}`;

    try {
      // Wait for Google script to be ready
      await this.waitForGoogle();

      // Initialize Google Identity Services FIRST
      window.google.accounts.id.initialize({
        client_id: this.config.clientId,
        callback: (response: any) => {
          try {
            options.onSuccess(response);
          } catch (error) {
            oauthLogger.error('Google OAuth success callback error', error);
            options.onError?.(error);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // THEN create button with Google Identity Services
      window.google.accounts.id.renderButton(container, {
        theme: options.theme || 'filled_black',
        size: options.size || 'large',
        text: options.text || 'signup_with',
        shape: options.shape || 'rectangular',
        click_listener: () => {
          // Handle click for analytics if needed
        }
      });

      // Apply aggressive dark mode styling after button creation
      setTimeout(() => {
        this.applyDarkModeStyles(container);
      }, 100);

      // Store button reference
      const cleanup = () => {
        // Disconnect dark mode observer if it exists
        const observer = (container as ElementWithObserver)._darkModeObserver;
        if (observer) {
          observer.disconnect();
          delete (container as ElementWithObserver)._darkModeObserver;
        }
        container.innerHTML = '';
        this.activeButtons.delete(containerId);
      };

      this.activeButtons.set(containerId, {
        id: buttonId,
        element: container,
        cleanup
      });

      return buttonId;

    } catch (error) {
      oauthLogger.error('Failed to create Google OAuth button', error);

      // Check for specific OAuth configuration errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not allowed') ||
          errorMessage.includes('403') ||
          errorMessage.includes('origin') ||
          errorMessage.includes('client_id')) {
        const configError = new Error('Google OAuth is not configured for this domain. Please contact support.');
        options.onError?.(configError);
        throw configError;
      }

      options.onError?.(error);
      throw error;
    }
  }

  /**
   * Remove a specific button
   */
  public removeButton(containerId: string): void {
    const button = this.activeButtons.get(containerId);
    if (button) {
      button.cleanup();
    }
  }

  /**
   * Clean up all orphaned Google OAuth elements globally
   */
  private cleanupOrphanedElements(): void {
    // Remove orphaned iframes safely
    const orphanedIframes = document.querySelectorAll('iframe[src*="accounts.google.com"], iframe[src*="gsi"]');
    orphanedIframes.forEach(iframe => {
      if (!this.isElementInActiveButton(iframe)) {
        this.safeRemoveElement(iframe);
      }
    });

    // Remove orphaned divs safely
    const orphanedDivs = document.querySelectorAll('div[data-client-id], div[jscontroller]');
    orphanedDivs.forEach(div => {
      if (!this.isElementInActiveButton(div)) {
        this.safeRemoveElement(div);
      }
    });

    // Remove orphaned Google elements safely
    const orphanedElements = document.querySelectorAll('[id*="gsi"], [class*="gsi"]');
    orphanedElements.forEach(element => {
      if (!this.isElementInActiveButton(element)) {
        this.safeRemoveElement(element);
      }
    });
  }

  /**
   * Check if an element belongs to an active button
   */
  private isElementInActiveButton(element: Element): boolean {
    for (const button of this.activeButtons.values()) {
      if (button.element.contains(element)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Wait for Google Identity Services to be available
   */
  private async waitForGoogle(timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkGoogle = () => {
        if (window.google && window.google.accounts && window.google.accounts.id) {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for Google Identity Services'));
          return;
        }

        setTimeout(checkGoogle, 100);
      };

      checkGoogle();
    });
  }


  /**
   * Preload Google OAuth resources for faster rendering
   */
  public async preload(): Promise<void> {
    // Add DNS prefetch and preconnect hints
    this.addResourceHints();

    // Preload the script but don't initialize yet
    if (!this.isScriptLoaded && !this.isScriptLoading) {
      try {
        await this.loadGoogleScript();
      } catch (error) {
        oauthLogger.warn('Failed to preload Google OAuth script', error);
      }
    }
  }

  /**
   * Add resource hints for better performance
   */
  private addResourceHints(): void {
    const hints = [
      { rel: 'dns-prefetch', href: '//accounts.google.com' },
      { rel: 'dns-prefetch', href: '//ssl.gstatic.com' },
      { rel: 'preconnect', href: 'https://accounts.google.com' },
      { rel: 'preconnect', href: 'https://ssl.gstatic.com' },
    ];

    hints.forEach(hint => {
      if (!document.querySelector(`link[href="${hint.href}"]`)) {
        const link = document.createElement('link');
        link.rel = hint.rel;
        link.href = hint.href;
        if (hint.rel === 'preconnect') {
          link.crossOrigin = 'anonymous';
        }
        document.head.appendChild(link);
      }
    });
  }

  /**
   * Complete cleanup of all OAuth instances
   */
  public cleanup(): void {
    // Clean up all active buttons
    for (const button of this.activeButtons.values()) {
      button.cleanup();
    }
    this.activeButtons.clear();

    // Global cleanup of all Google OAuth elements
    this.cleanupOrphanedElements();
  }

  /**
   * Targeted cleanup to remove only orphaned Google OAuth elements
   */
  private globalCleanup(): void {
    // Only remove orphaned iframes that are not in our active containers
    const orphanedIframes = document.querySelectorAll('iframe[src*="accounts.google.com"], iframe[src*="gsi"]');
    orphanedIframes.forEach(iframe => {
      if (!this.isElementInActiveButton(iframe) && !this.isElementInOurContainers(iframe)) {
        this.safeRemoveElement(iframe);
      }
    });

    // Only remove orphaned Google divs that are not in our active containers
    const orphanedDivs = document.querySelectorAll('div[id*="gsi"], div[class*="gsi"], div[data-client-id], div[jscontroller]');
    orphanedDivs.forEach(div => {
      if (!this.isElementInActiveButton(div) && !this.isElementInOurContainers(div)) {
        this.safeRemoveElement(div);
      }
    });

    // Only reset state if we have no active buttons
    if (this.activeButtons.size === 0) {
      this.isInitialized = false;
      this.isScriptLoaded = false;
      this.isScriptLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Safely remove an element to prevent React DOM conflicts
   */
  private safeRemoveElement(element: Element): void {
    try {
      // Check if element still exists in DOM
      if (!element.parentNode) {
        return;
      }

      // Check if it's part of a React component tree
      const el = element as ElementWithReactInternals;
      const reactInstance = el._reactInternalInstance ||
                           el.__reactInternalInstance ||
                           el.__reactInternals;

      if (reactInstance) {
        // Let React handle cleanup
        return;
      }

      // Safe removal with additional checks
      if (element.parentNode && element.parentNode.contains(element)) {
        element.parentNode.removeChild(element);
      }
    } catch (error) {
      // Silently ignore removal errors - element may already be removed
      oauthLogger.debug('Safe element removal failed', { error });
    }
  }

  /**
   * Check if element is within one of our OAuth containers
   */
  private isElementInOurContainers(element: Element): boolean {
    const ourContainers = document.querySelectorAll('[id*="google-oauth-"], .google-oauth-wrapper');
    for (const container of ourContainers) {
      if (container.contains(element)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Inject global CSS to completely override Google OAuth styling
   */
  private injectGlobalOAuthCSS(): void {
    // Check if CSS is already injected
    if (document.querySelector('#google-oauth-override-styles')) {
      return;
    }

    const css = `
      /* Complete Google OAuth visual override */
      .S9gUrf-YoZ4jf,
      .S9gUrf-YoZ4jf *,
      .L5Fo6c-PQbLGe,
      iframe[src*="accounts.google.com"],
      iframe[src*="gsi"],
      div[data-client-id],
      div[jscontroller] {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
        border: none !important;
        box-shadow: none !important;
        outline: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* Target any Google OAuth wrapper divs */
      div[class*="gsi"],
      div[id*="gsi"] {
        background: transparent !important;
        background-color: transparent !important;
        border: none !important;
        box-shadow: none !important;
        outline: none !important;
      }

      /* Override any inline styles */
      .S9gUrf-YoZ4jf[style*="background"],
      .L5Fo6c-PQbLGe[style*="background"],
      iframe[src*="accounts.google.com"][style*="background"] {
        background: transparent !important;
        background-color: transparent !important;
      }
    `;

    const style = document.createElement('style');
    style.id = 'google-oauth-override-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Apply aggressive dark mode styling to remove white backgrounds
   */
  private applyDarkModeStyles(container: HTMLElement): void {
    const applyStyles = (element: HTMLElement) => {
      // Nuclear removal of ALL backgrounds and visual artifacts
      element.style.setProperty('background', 'transparent', 'important');
      element.style.setProperty('background-color', 'transparent', 'important');
      element.style.setProperty('background-image', 'none', 'important');
      element.style.setProperty('box-shadow', 'none', 'important');
      element.style.setProperty('border', 'none', 'important');
      element.style.setProperty('outline', 'none', 'important');

      // SPECIFIC: Target Google's S9gUrf-YoZ4jf wrapper class
      if (element.classList.contains('S9gUrf-YoZ4jf')) {
        element.style.setProperty('background', 'transparent', 'important');
        element.style.setProperty('background-color', 'transparent', 'important');
        element.style.setProperty('border', 'none', 'important');
        element.style.setProperty('box-shadow', 'none', 'important');
        element.style.setProperty('outline', 'none', 'important');
        element.style.setProperty('margin', '0', 'important');
        element.style.setProperty('padding', '0', 'important');
      }

      // IFRAME SPECIFIC: Target Google OAuth iframe margins and backgrounds
      if (element.tagName === 'IFRAME') {
        element.style.setProperty('margin', '0', 'important');
        element.style.setProperty('padding', '0', 'important');
        element.style.setProperty('background', 'transparent', 'important');
        element.style.setProperty('background-color', 'transparent', 'important');
        element.style.setProperty('border', 'none', 'important');

        // Target specific Google iframe classes
        if (element.classList.contains('L5Fo6c-PQbLGe')) {
          element.style.setProperty('margin', '0', 'important');
          element.style.setProperty('padding', '0', 'important');
        }
      }

      // Force remove any white backgrounds on hover/focus states
      element.style.setProperty('background-color', 'transparent', 'important');
      element.style.setProperty('background', 'transparent', 'important');

      // Clean styling without any visual artifacts
      if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
        element.style.setProperty('border', 'none', 'important');
        element.style.setProperty('border-radius', '8px', 'important');
        element.style.setProperty('background', 'transparent', 'important');
        element.style.setProperty('background-color', 'transparent', 'important');
      }

      // Remove any inline styles that might force backgrounds
      if (element.hasAttribute('style')) {
        const style = element.getAttribute('style');
        if (style && (style.includes('background') || style.includes('border') || style.includes('box-shadow') || style.includes('margin'))) {
          element.style.setProperty('background', 'transparent', 'important');
          element.style.setProperty('background-color', 'transparent', 'important');
          element.style.setProperty('background-image', 'none', 'important');
          element.style.setProperty('border', 'none', 'important');
          element.style.setProperty('box-shadow', 'none', 'important');
          if (element.tagName === 'IFRAME') {
            element.style.setProperty('margin', '0', 'important');
          }
        }
      }
    };

    // Inject global CSS to override Google's styles
    this.injectGlobalOAuthCSS();

    // Apply to container and all descendants
    applyStyles(container);

    // Target the wrapper container too
    const wrapper = container.closest('.google-oauth-wrapper');
    if (wrapper instanceof HTMLElement) {
      applyStyles(wrapper);
    }

    // Apply to all nested elements
    const allElements = container.querySelectorAll('*');
    allElements.forEach(el => {
      if (el instanceof HTMLElement) {
        applyStyles(el);

        // Special targeting for common Google container patterns
        if (el.style && (el.style.background || el.style.backgroundColor)) {
          el.style.setProperty('background', 'transparent', 'important');
          el.style.setProperty('background-color', 'transparent', 'important');
        }
      }
    });

    // Target any parent containers that might have backgrounds
    let parent = container.parentElement;
    while (parent && parent !== document.body) {
      if (parent.classList.contains('google-oauth-wrapper') ||
          parent.id === 'google-oauth-container' ||
          parent.querySelector('#google-oauth-container')) {
        applyStyles(parent);
      }
      parent = parent.parentElement;
    }

    // Set up observer to catch dynamically added Google elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) {
            applyStyles(node);

            // Special handling for iframes
            if (node.tagName === 'IFRAME') {
              node.style.setProperty('margin', '0', 'important');
              node.style.setProperty('background', 'transparent', 'important');
              node.style.setProperty('border', 'none', 'important');
            }

            const nestedElements = node.querySelectorAll('*');
            nestedElements.forEach(el => {
              if (el instanceof HTMLElement) {
                applyStyles(el);

                // Extra iframe targeting
                if (el.tagName === 'IFRAME') {
                  el.style.setProperty('margin', '0', 'important');
                  el.style.setProperty('background', 'transparent', 'important');
                  el.style.setProperty('border', 'none', 'important');
                }
              }
            });
          }
        });
      });
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // Store observer for cleanup
    (container as ElementWithObserver)._darkModeObserver = observer;
  }

  /**
   * Get current status for debugging
   */
  public getStatus() {
    return {
      isInitialized: this.isInitialized,
      isScriptLoaded: this.isScriptLoaded,
      isScriptLoading: this.isScriptLoading,
      activeButtonsCount: this.activeButtons.size,
      hasConfigurationError: this.hasConfigurationError,
      config: this.config
    };
  }
}

// Global type definitions
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default GoogleOAuthManager;