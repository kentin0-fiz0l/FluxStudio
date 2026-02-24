/**
 * Lazy Loading Utilities
 * Advanced code splitting and lazy loading with retry logic and loading states
 */

import React, { Suspense, ComponentType, LazyExoticComponent } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyLoadOptions {
  fallback?: React.ReactNode;
  retryAttempts?: number;
  retryDelay?: number;
  preload?: boolean;
}

interface LoadableComponent<P extends Record<string, unknown> = Record<string, unknown>> {
  Component: LazyExoticComponent<ComponentType<P>>;
  preload: () => Promise<{ default: ComponentType<P> }>;
}

/**
 * Creates a lazy-loaded component with retry logic and preloading support
 */
export function lazyLoadWithRetry<P extends Record<string, unknown> = Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyLoadOptions = {}
): LoadableComponent<P> {
  const {
    retryAttempts = 3,
    retryDelay = 1000,
  } = options;

  let modulePromise: Promise<{ default: ComponentType<P> }> | null = null;

  const load = async (): Promise<{ default: ComponentType<P> }> => {
    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        const module = await importFn();
        return module;
      } catch (error) {
        const isLastAttempt = attempt === retryAttempts - 1;

        if (isLastAttempt) {
          console.error(`Failed to load component after ${retryAttempts} attempts:`, error);
          throw error;
        }

        console.warn(`Load attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }

    throw new Error('Failed to load component');
  };

  const Component = React.lazy(() => {
    if (!modulePromise) {
      modulePromise = load();
    }
    return modulePromise;
  });

  const preload = () => {
    if (!modulePromise) {
      modulePromise = load();
    }
    return modulePromise;
  };

  return { Component, preload };
}

/**
 * Default loading fallback component
 */
export const DefaultLoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

/**
 * Wraps a lazy component with Suspense and custom fallback
 */
export function withSuspense<P extends Record<string, unknown> = Record<string, unknown>>(
  Component: LazyExoticComponent<ComponentType<P>>,
  fallback: React.ReactNode = <DefaultLoadingFallback />
): React.FC<P> {
  const LazyComponent = Component as unknown as React.ComponentType<P>;
  const WrappedComponent: React.FC<P> = (props) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
  return WrappedComponent;
}

/**
 * Preloads multiple components in parallel
 */
export async function preloadComponents(
  components: Array<{ preload: () => Promise<{ default: ComponentType<Record<string, unknown>> }> }>
): Promise<void> {
  try {
    await Promise.all(components.map(c => c.preload()));
  } catch (error) {
    console.error('Failed to preload components:', error);
  }
}

/**
 * Creates a route-based preloader hook
 */
export function useRoutePreloader(routes: Record<string, { preload: () => Promise<{ default: ComponentType<Record<string, unknown>> }> }>) {
  const preloadRoute = React.useCallback(
    (routeName: string) => {
      const route = routes[routeName];
      if (route?.preload) {
        route.preload().catch(err => {
          console.error(`Failed to preload route ${routeName}:`, err);
        });
      }
    },
    [routes]
  );

  return { preloadRoute };
}

/**
 * Higher-order component for lazy loading with error boundary
 */
export function withLazyLoad<P extends Record<string, unknown> = Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyLoadOptions = {}
) {
  const { Component, preload } = lazyLoadWithRetry(importFn, options);
  const fallback = options.fallback || <DefaultLoadingFallback />;
  const LazyComponent = Component as unknown as React.ComponentType<P>;

  const WrappedComponent: React.FC<P> & { preload: typeof preload } = (props) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );

  WrappedComponent.preload = preload;

  return WrappedComponent;
}

/**
 * Preload on hover/focus for improved perceived performance
 */
export function usePreloadOnInteraction(
  preloadFn: () => Promise<unknown>
): {
  onMouseEnter: () => void;
  onFocus: () => void;
} {
  const [hasPreloaded, setHasPreloaded] = React.useState(false);

  const handlePreload = React.useCallback(() => {
    if (!hasPreloaded) {
      preloadFn().catch(err => {
        console.error('Failed to preload on interaction:', err);
      });
      setHasPreloaded(true);
    }
  }, [hasPreloaded, preloadFn]);

  return {
    onMouseEnter: handlePreload,
    onFocus: handlePreload,
  };
}

export default {
  lazyLoadWithRetry,
  withSuspense,
  withLazyLoad,
  preloadComponents,
  useRoutePreloader,
  usePreloadOnInteraction,
  DefaultLoadingFallback,
};
