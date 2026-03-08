/**
 * Unit Tests for useReducedMotion Hook
 * @file src/hooks/__tests__/useReducedMotion.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from '../useReducedMotion';

describe('useReducedMotion', () => {
  let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;
  let mockMediaQueryList: {
    matches: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  function createMockMQL(matches: boolean) {
    mockMediaQueryList = {
      matches,
      addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
    };
    return mockMediaQueryList;
  }

  beforeEach(() => {
    changeHandler = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false when prefers-reduced-motion is not set', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue(createMockMQL(false) as unknown as MediaQueryList);

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current.prefersReducedMotion).toBe(false);
  });

  it('should return true when prefers-reduced-motion is enabled', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue(createMockMQL(true) as unknown as MediaQueryList);

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current.prefersReducedMotion).toBe(true);
  });

  it('should react to media query changes', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue(createMockMQL(false) as unknown as MediaQueryList);

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current.prefersReducedMotion).toBe(false);

    act(() => {
      changeHandler?.({ matches: true } as MediaQueryListEvent);
    });

    expect(result.current.prefersReducedMotion).toBe(true);
  });

  it('should clean up listener on unmount', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue(createMockMQL(false) as unknown as MediaQueryList);

    const { unmount } = renderHook(() => useReducedMotion());
    unmount();

    expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
