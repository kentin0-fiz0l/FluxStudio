/**
 * useOAuth Hook
 * Manages OAuth authorization flows for integrations
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  IntegrationProvider,
  Integration,
  OAuthError,
  OAuthState
} from '../types/integrations';
import { integrationService } from '../services/integrationService';

interface UseOAuthOptions {
  onSuccess?: (integration: Integration) => void;
  onError?: (error: OAuthError) => void;
  autoRefresh?: boolean;
}

export function useOAuth(
  provider: IntegrationProvider,
  options: UseOAuthOptions = {}
) {
  const [state, setState] = useState<OAuthState>({
    isConnecting: false,
    isConnected: false,
    error: null,
    integration: null
  });

  const [statusMessage, setStatusMessage] = useState<string>('');

  // Detect if mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  /**
   * Check if integration is already connected
   */
  const checkConnection = useCallback(async () => {
    try {
      const integration = await integrationService.getIntegration(provider);

      if (integration) {
        setState(prev => ({
          ...prev,
          isConnected: integration.status === 'connected',
          integration,
          error: integration.status === 'expired' ? {
            code: 'TOKEN_EXPIRED',
            message: 'Your connection has expired. Please reconnect.',
          } : null
        }));
      }
    } catch (error) {
      console.error('Failed to check integration connection:', error);
    }
  }, [provider]);

  /**
   * Open OAuth popup window (desktop) with enhanced popup blocker detection
   */
  const openOAuthPopup = (authUrl: string): { popup: Window | null; blocked: boolean } => {
    const width = 600;
    const height = 700;
    const left = window.innerWidth / 2 - width / 2 + window.screenX;
    const top = window.innerHeight / 2 - height / 2 + window.screenY;

    let popup: Window | null = null;
    let blocked = false;

    try {
      popup = window.open(
        authUrl,
        'oauth-authorization',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      // Enhanced popup blocker detection
      if (!popup) {
        blocked = true;
      } else {
        // Check if popup is closed (some browsers return a window but close it immediately)
        try {
          if (popup.closed || typeof popup.closed === 'undefined') {
            blocked = true;
          }

          // Additional check: try to access popup location
          // If blocked, this will throw an error or return null
          setTimeout(() => {
            try {
              if (popup && (popup.closed || !popup.location)) {
                blocked = true;
              }
            } catch (_e) {
              // Some browsers throw when accessing popup.location if blocked
              blocked = true;
            }
          }, 100);
        } catch (_e) {
          blocked = true;
        }

        // Final check: verify popup has a valid window object
        if (popup && typeof popup.focus === 'function') {
          try {
            popup.focus();
          } catch (_e) {
            blocked = true;
          }
        }
      }
    } catch (_e) {
      // Exception thrown when opening popup = definitely blocked
      blocked = true;
    }

    return { popup, blocked };
  };

  /**
   * Handle OAuth callback message from popup
   */
  const handleOAuthCallback = useCallback((event: MessageEvent) => {
    // Verify origin
    if (event.origin !== window.location.origin) {
      return;
    }

    const { type, provider: callbackProvider, success, error } = event.data;

    if (type !== 'oauth-callback' || callbackProvider !== provider) {
      return;
    }

    if (success) {
      setStatusMessage(`Successfully connected to ${provider}`);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        isConnected: true,
        error: null
      }));

      // Refresh integration data
      checkConnection().then(() => {
        if (options.onSuccess && state.integration) {
          options.onSuccess(state.integration);
        }
      });
    } else {
      const oauthError: OAuthError = {
        code: error?.code || 'AUTHORIZATION_DENIED',
        message: error?.message || 'Authorization was denied or cancelled',
        details: error
      };

      setStatusMessage(`Failed to connect to ${provider}`);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: oauthError
      }));

      if (options.onError) {
        options.onError(oauthError);
      }
    }
  }, [provider, options, checkConnection, state.integration]);

  /**
   * Connect to integration via OAuth
   */
  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    setStatusMessage(`Connecting to ${provider}...`);

    try {
      const { authorizationUrl } = await integrationService.startAuthorization(provider);

      if (isMobile) {
        // Mobile: Store return URL and redirect in same window
        sessionStorage.setItem('oauth-return-url', window.location.href);
        sessionStorage.setItem('oauth-provider', provider);
        window.location.href = authorizationUrl;
      } else {
        // Desktop: Open popup window with enhanced blocker detection
        const { popup, blocked } = openOAuthPopup(authorizationUrl);

        if (blocked || !popup) {
          // Popup blocked - try fallback to new tab
          const newTab = window.open(authorizationUrl, '_blank');

          if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
            // New tab also blocked
            throw {
              code: 'POPUP_BLOCKED',
              message: 'Popup blocker detected. Please allow popups for FluxStudio and try again.',
              details: {
                instructions: [
                  'Click the popup blocker icon in your browser address bar',
                  `Select "Always allow popups from ${window.location.hostname}"`,
                  'Click "Try Again" to reconnect'
                ]
              }
            };
          }

          setStatusMessage('Please complete authorization in the new tab');

          // Store tab reference for monitoring
          const checkTabClosed = setInterval(() => {
            try {
              if (newTab.closed) {
                clearInterval(checkTabClosed);

                setState(prev => {
                  if (prev.isConnecting) {
                    return {
                      ...prev,
                      isConnecting: false,
                      error: {
                        code: 'AUTHORIZATION_DENIED',
                        message: 'Authorization tab was closed before completing'
                      }
                    };
                  }
                  return prev;
                });
              }
            } catch (_e) {
              // Tab closed or inaccessible
              clearInterval(checkTabClosed);
            }
          }, 500);
        } else {
          setStatusMessage('Opening authorization window...');

          // Monitor popup close
          const checkPopupClosed = setInterval(() => {
            try {
              if (popup.closed) {
                clearInterval(checkPopupClosed);

                // If still connecting after popup closed, assume it was cancelled
                setState(prev => {
                  if (prev.isConnecting) {
                    return {
                      ...prev,
                      isConnecting: false,
                      error: {
                        code: 'AUTHORIZATION_DENIED',
                        message: 'Authorization window was closed before completing'
                      }
                    };
                  }
                  return prev;
                });
              }
            } catch (_e) {
              // Popup closed or inaccessible
              clearInterval(checkPopupClosed);
            }
          }, 500);
        }
      }
    } catch (error: unknown) {
      const errorWithCode = error as { code?: string; message?: string };
      const validCodes = ['POPUP_BLOCKED', 'AUTHORIZATION_DENIED', 'NETWORK_ERROR', 'TOKEN_EXPIRED', 'UNKNOWN'] as const;
      const code = validCodes.includes(errorWithCode.code as typeof validCodes[number])
        ? (errorWithCode.code as OAuthError['code'])
        : 'NETWORK_ERROR';
      const oauthError: OAuthError = {
        code,
        message: errorWithCode.message || 'Failed to start authorization',
        details: error
      };

      setStatusMessage(`Failed to connect to ${provider}`);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: oauthError
      }));

      if (options.onError) {
        options.onError(oauthError);
      }
    }
  }, [provider, isMobile, options]);

  /**
   * Disconnect from integration
   */
  const disconnect = useCallback(async () => {
    try {
      await integrationService.disconnect(provider);

      setStatusMessage(`Disconnected from ${provider}`);
      setState({
        isConnecting: false,
        isConnected: false,
        error: null,
        integration: null
      });
    } catch (error: unknown) {
      const errorWithMessage = error as { message?: string };
      const oauthError: OAuthError = {
        code: 'NETWORK_ERROR',
        message: errorWithMessage.message || 'Failed to disconnect',
        details: error
      };

      setState(prev => ({ ...prev, error: oauthError }));

      if (options.onError) {
        options.onError(oauthError);
      }
    }
  }, [provider, options]);

  /**
   * Reconnect (refresh expired token)
   */
  const reconnect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    setStatusMessage(`Reconnecting to ${provider}...`);

    try {
      const integration = await integrationService.refresh(provider);

      setStatusMessage(`Successfully reconnected to ${provider}`);
      setState({
        isConnecting: false,
        isConnected: true,
        error: null,
        integration
      });

      if (options.onSuccess) {
        options.onSuccess(integration);
      }
    } catch (_error: unknown) {
      // If refresh fails, fall back to full OAuth flow
      connect();
    }
  }, [provider, options, connect]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
    setStatusMessage('');
  }, []);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Listen for OAuth callback messages
  useEffect(() => {
    window.addEventListener('message', handleOAuthCallback);
    return () => window.removeEventListener('message', handleOAuthCallback);
  }, [handleOAuthCallback]);

  // Handle mobile OAuth return
  useEffect(() => {
    const returnUrl = sessionStorage.getItem('oauth-return-url');
    const oauthProvider = sessionStorage.getItem('oauth-provider');

    if (returnUrl && oauthProvider === provider) {
      // Check if we have OAuth success/error in URL params
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (code || error) {
        // Clear session storage
        sessionStorage.removeItem('oauth-return-url');
        sessionStorage.removeItem('oauth-provider');

        if (code) {
          // Success - check connection will update state
          setStatusMessage(`Successfully connected to ${provider}`);
          checkConnection();
        } else {
          setState(prev => ({
            ...prev,
            isConnecting: false,
            error: {
              code: 'AUTHORIZATION_DENIED',
              message: error || 'Authorization failed'
            }
          }));
        }

        // Clean URL
        window.history.replaceState({}, '', returnUrl);
      }
    }
  }, [provider, checkConnection]);

  // Auto-refresh expired tokens
  useEffect(() => {
    if (!options.autoRefresh || !state.integration) {
      return;
    }

    if (state.integration.status === 'expired') {
      reconnect();
    }
  }, [options.autoRefresh, state.integration, reconnect]);

  return {
    ...state,
    statusMessage,
    connect,
    disconnect,
    reconnect,
    clearError,
    refresh: checkConnection
  };
}
