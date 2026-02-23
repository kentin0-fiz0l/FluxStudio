/**
 * Unit Tests for useTheme Hook
 * @file src/hooks/__tests__/useTheme.test.ts
 *
 * useTheme is backed by Zustand uiSlice.
 * - localStorage key: 'flux-studio-theme-preference'
 * - toggleTheme cycles: light ↔ dark (2-way)
 * - resolvedTheme resolves 'system' via matchMedia
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../useTheme';

const THEME_KEY = 'flux-studio-theme-preference';

function createMockMediaQuery(matches = false) {
  const listeners: Function[] = [];
  return {
    matches,
    addEventListener: vi.fn((_: string, handler: Function) => {
      listeners.push(handler);
    }),
    removeEventListener: vi.fn((_: string, handler: Function) => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
    dispatchChange(newMatches: boolean) {
      (this as any).matches = newMatches;
      listeners.forEach(h => h({ matches: newMatches }));
    },
    _listeners: listeners,
  };
}

describe('useTheme', () => {
  let mockMQ: ReturnType<typeof createMockMediaQuery>;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    mockMQ = createMockMediaQuery(false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue(mockMQ),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should default to system theme', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');
  });

  it('should persist theme to localStorage and reflect it in hook', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  it('should save theme to localStorage on change', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  it('should apply dark class when theme is dark', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('should remove dark class when theme is light', () => {
    document.documentElement.classList.add('dark');
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('light');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('should toggle theme between light and dark', () => {
    const { result } = renderHook(() => useTheme());

    // Set to light first
    act(() => {
      result.current.setTheme('light');
    });
    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('light');
  });

  it('should use system preference when theme is system', () => {
    mockMQ = createMockMediaQuery(true); // prefers dark
    (window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue(mockMQ);

    const { result } = renderHook(() => useTheme());

    // Ensure store is in 'system' mode (Zustand state persists across tests)
    act(() => {
      result.current.setTheme('system');
    });

    expect(result.current.resolvedTheme).toBe('dark');
  });
});
