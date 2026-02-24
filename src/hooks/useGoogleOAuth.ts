import { useEffect, useState } from 'react';
import GoogleOAuthManager from '../services/GoogleOAuthManager';

interface UseGoogleOAuthOptions {
  clientId: string;
  preload?: boolean;
}

interface UseGoogleOAuthReturn {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  createButton: (
    containerId: string,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      onSuccess: (response: { credential: string; select_by?: string; clientId?: string }) => void;
      onError?: (error: unknown) => void;
    }
  ) => Promise<string>;
  removeButton: (containerId: string) => void;
  cleanup: () => void;
  getStatus: () => {
    isInitialized: boolean;
    isScriptLoaded: boolean;
    isScriptLoading: boolean;
    activeButtonsCount: number;
    hasConfigurationError: boolean;
    config: unknown;
  };
}

/**
 * Ultra-optimized hook for Google OAuth integration
 */
export function useGoogleOAuth(options: UseGoogleOAuthOptions): UseGoogleOAuthReturn {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const manager = GoogleOAuthManager.getInstance();

  useEffect(() => {
    let mounted = true;

    const initializeOAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Preload if requested
        if (options.preload) {
          await manager.preload();
        }

        // Initialize with configuration
        await manager.initialize({
          clientId: options.clientId,
        });

        if (mounted) {
          setIsReady(true);
        }
      } catch (err) {
        console.error('Failed to initialize Google OAuth:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize Google OAuth');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeOAuth();

    return () => {
      mounted = false;
    };
  }, [options.clientId, options.preload, manager]);

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup on unmount but preserve the singleton
      manager.cleanup();
    };
  }, [manager]);

  const createButton = async (
    containerId: string,
    buttonOptions: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      onSuccess: (response: { credential: string; select_by?: string; clientId?: string }) => void;
      onError?: (error: unknown) => void;
    }
  ): Promise<string> => {
    if (!isReady) {
      throw new Error('Google OAuth not ready. Wait for isReady to be true.');
    }

    try {
      return await manager.createButton(containerId, buttonOptions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create button';
      setError(errorMessage);
      throw err;
    }
  };

  const removeButton = (containerId: string) => {
    manager.removeButton(containerId);
  };

  const cleanup = () => {
    manager.cleanup();
    setIsReady(false);
  };

  const getStatus = () => {
    return manager.getStatus();
  };

  return {
    isReady,
    isLoading,
    error,
    createButton,
    removeButton,
    cleanup,
    getStatus,
  };
}