/**
 * Unit Tests for usePerformance Hooks
 * @file src/hooks/__tests__/usePerformance.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
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
} from '../usePerformance';

describe('useStableCallback', () => {
  it('should return a stable function reference', () => {
    let cb = () => 1;
    const { result, rerender } = renderHook(() => useStableCallback(cb));
    const first = result.current;

    cb = () => 2;
    rerender();

    expect(result.current).toBe(first);
  });

  it('should call the latest callback', () => {
    const cb1 = vi.fn(() => 'first');
    const cb2 = vi.fn(() => 'second');

    const { result, rerender } = renderHook(
      ({ cb }) => useStableCallback(cb),
      { initialProps: { cb: cb1 } }
    );

    rerender({ cb: cb2 });
    result.current();

    expect(cb2).toHaveBeenCalled();
    expect(cb1).not.toHaveBeenCalled();
  });
});

describe('useMemoizedArray', () => {
  it('should return same reference when items have not changed', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const keyFn = (item: { id: number }) => item.id;

    const { result, rerender } = renderHook(
      ({ items }) => useMemoizedArray(items, keyFn),
      { initialProps: { items } }
    );

    const first = result.current;
    rerender({ items }); // Same reference
    expect(result.current).toBe(first);
  });

  it('should return new reference when items change', () => {
    const keyFn = (item: { id: number }) => item.id;

    const { result, rerender } = renderHook(
      ({ items }) => useMemoizedArray(items, keyFn),
      { initialProps: { items: [{ id: 1 }] } }
    );

    const first = result.current;
    rerender({ items: [{ id: 1 }, { id: 2 }] });
    expect(result.current).not.toBe(first);
  });
});

describe('useThrottledCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call immediately on first invocation', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(cb, 1000));

    act(() => {
      result.current();
    });

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('should throttle subsequent calls', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(cb, 1000));

    act(() => {
      result.current();
      result.current();
      result.current();
    });

    expect(cb).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(cb).toHaveBeenCalledTimes(2);
  });
});

describe('useLazyLoad', () => {
  it('should return ref and initial visibility false', () => {
    const { result } = renderHook(() => useLazyLoad());
    const [ref, isVisible] = result.current;

    expect(ref.current).toBeNull();
    expect(isVisible).toBe(false);
  });
});

describe('useVirtualScroll', () => {
  it('should calculate visible range', () => {
    const { result } = renderHook(() =>
      useVirtualScroll(100, 40, 400, 0, 3)
    );

    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBeGreaterThan(0);
    expect(result.current.offsetY).toBe(0);
  });

  it('should offset when scrolled', () => {
    const { result } = renderHook(() =>
      useVirtualScroll(100, 40, 400, 200, 3)
    );

    expect(result.current.startIndex).toBeGreaterThan(0);
    expect(result.current.offsetY).toBeGreaterThan(0);
  });

  it('should clamp endIndex to totalItems - 1', () => {
    const { result } = renderHook(() =>
      useVirtualScroll(5, 40, 400, 0, 0)
    );

    expect(result.current.endIndex).toBeLessThanOrEqual(4);
  });
});

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial values', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 300));

    expect(result.current.value).toBe('');
    expect(result.current.debouncedValue).toBe('');
  });

  it('should update value immediately', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 300));

    act(() => {
      result.current.setValue('hello');
    });

    expect(result.current.value).toBe('hello');
  });

  it('should debounce the debounced value', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 300));

    act(() => {
      result.current.setValue('hello');
    });

    expect(result.current.debouncedValue).toBe('');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedValue).toBe('hello');
  });

  it('should clear both values', () => {
    const { result } = renderHook(() => useDebouncedSearch('initial', 300));

    act(() => {
      result.current.clear();
    });

    expect(result.current.value).toBe('');
    expect(result.current.debouncedValue).toBe('');
  });
});

describe('usePrevious', () => {
  it('should return undefined on first render', () => {
    const { result } = renderHook(() => usePrevious(1));
    expect(result.current).toBeUndefined();
  });

  it('should return previous value after update', () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: 1 } }
    );

    rerender({ value: 2 });
    expect(result.current).toBe(1);

    rerender({ value: 3 });
    expect(result.current).toBe(2);
  });
});

describe('useRenderCount', () => {
  it('should increment on each render', () => {
    const { result, rerender } = renderHook(() => useRenderCount('Test'));

    expect(result.current).toBe(1);
    rerender();
    expect(result.current).toBe(2);
    rerender();
    expect(result.current).toBe(3);
  });
});

describe('useMemoryPressure', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return false by default', () => {
    const { result } = renderHook(() => useMemoryPressure());
    expect(result.current).toBe(false);
  });

  it('should detect high memory usage', () => {
    vi.useFakeTimers();

    Object.defineProperty(performance, 'memory', {
      configurable: true,
      value: {
        usedJSHeapSize: 950,
        jsHeapSizeLimit: 1000,
      },
    });

    const { result } = renderHook(() => useMemoryPressure());
    expect(result.current).toBe(true);

    // Cleanup
    Object.defineProperty(performance, 'memory', {
      configurable: true,
      value: undefined,
    });
  });
});

describe('usePreloadImages', () => {
  it('should return true immediately for empty array', () => {
    const { result } = renderHook(() => usePreloadImages([]));
    expect(result.current).toBe(true);
  });

  it('should start as false with URLs', () => {
    const { result } = renderHook(() =>
      usePreloadImages(['http://example.com/img.png'])
    );
    expect(result.current).toBe(false);
  });
});
