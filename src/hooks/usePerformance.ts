/**
 * Performance Optimization Hooks
 *
 * Collection of React hooks for performance optimization including:
 * - Memoization helpers
 * - Debounced/throttled callbacks
 * - Virtualization helpers
 * - Intersection observer for lazy loading
 * - Component profiling
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

/**
 * Creates a stable callback that doesn't change between renders
 * but always calls the latest version of the callback.
 * Useful for event handlers that are passed to memoized children.
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  // Update ref on every render
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Return stable function
  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Memoizes an array while preserving referential equality
 * when the items haven't actually changed (deep comparison).
 */
export function useMemoizedArray<T>(
  items: T[],
  keyFn: (item: T) => string | number
): T[] {
  const prevRef = useRef<T[]>([]);
  const prevKeysRef = useRef<Map<string | number, T>>(new Map());

  return useMemo(() => {
    const currentKeys = new Map<string | number, T>();
    let hasChanged = items.length !== prevRef.current.length;

    items.forEach((item, index) => {
      const key = keyFn(item);
      currentKeys.set(key, item);

      if (!hasChanged) {
        const prevItem = prevKeysRef.current.get(key);
        if (prevItem !== item) {
          hasChanged = true;
        }
      }
    });

    if (!hasChanged) {
      return prevRef.current;
    }

    prevRef.current = items;
    prevKeysRef.current = currentKeys;
    return items;
  }, [items, keyFn]);
}

/**
 * Throttled callback that limits how often a function can be called.
 * Uses leading edge execution (calls immediately, then throttles).
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const throttled = useCallback(
    ((...args) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall.current;

      if (timeSinceLastCall >= delay) {
        lastCall.current = now;
        callback(...args);
      } else {
        // Schedule for later
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    }) as T,
    [callback, delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttled;
}

/**
 * Hook for lazy loading content when it enters the viewport.
 * Returns a ref to attach to the element and a boolean indicating visibility.
 */
export function useLazyLoad(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only load once
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [options]);

  return [ref, isVisible];
}

/**
 * Hook for virtual scrolling - calculates which items are visible.
 * Returns indices of visible items based on scroll position and container size.
 */
export function useVirtualScroll(
  totalItems: number,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number,
  overscan: number = 3
): { startIndex: number; endIndex: number; offsetY: number } {
  return useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
    const endIndex = Math.min(totalItems - 1, startIndex + visibleCount);
    const offsetY = startIndex * itemHeight;

    return { startIndex, endIndex, offsetY };
  }, [totalItems, itemHeight, containerHeight, scrollTop, overscan]);
}

/**
 * Debounced search input hook.
 * Returns the debounced value and the immediate value for display.
 */
export function useDebouncedSearch(
  initialValue: string = '',
  delay: number = 300
): {
  value: string;
  debouncedValue: string;
  setValue: (value: string) => void;
  clear: () => void;
} {
  const [value, setValueState] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  const debouncedSetValue = useDebouncedCallback(
    (newValue: string) => setDebouncedValue(newValue),
    delay
  );

  const setValue = useCallback(
    (newValue: string) => {
      setValueState(newValue);
      debouncedSetValue(newValue);
    },
    [debouncedSetValue]
  );

  const clear = useCallback(() => {
    setValueState('');
    setDebouncedValue('');
  }, []);

  return { value, debouncedValue, setValue, clear };
}

/**
 * Previous value hook - stores the previous value of a variable.
 * Useful for comparing props/state between renders.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Render count hook - useful for debugging unnecessary re-renders.
 * Only logs in development mode.
 */
export function useRenderCount(componentName: string): number {
  const renderCount = useRef(0);
  renderCount.current += 1;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[RenderCount] ${componentName}: ${renderCount.current}`);
  }

  return renderCount.current;
}

/**
 * Memory pressure detection hook.
 * Returns true when browser signals memory pressure.
 */
export function useMemoryPressure(): boolean {
  const [isUnderPressure, setIsUnderPressure] = useState(false);

  useEffect(() => {
    // Check if performance.memory is available (Chrome only)
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        if (memory) {
          const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
          setIsUnderPressure(usageRatio > 0.9);
        }
      };

      const interval = setInterval(checkMemory, 10000);
      checkMemory();

      return () => clearInterval(interval);
    }
  }, []);

  return isUnderPressure;
}

/**
 * Preload images hook - preloads images in the background.
 */
export function usePreloadImages(urls: string[]): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (urls.length === 0) {
      setLoaded(true);
      return;
    }

    let mounted = true;
    let loadedCount = 0;

    urls.forEach((url) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loadedCount++;
        if (mounted && loadedCount === urls.length) {
          setLoaded(true);
        }
      };
      img.src = url;
    });

    return () => {
      mounted = false;
    };
  }, [urls]);

  return loaded;
}

export default {
  useStableCallback,
  useMemoizedArray,
  useThrottledCallback,
  useLazyLoad,
  useVirtualScroll,
  useDebouncedSearch,
  usePrevious,
  useRenderCount,
  useMemoryPressure,
  usePreloadImages,
};
