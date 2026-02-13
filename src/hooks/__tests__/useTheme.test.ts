/**
 * Unit Tests for useTheme Hook
 * @file src/hooks/__tests__/useTheme.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../useTheme';

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

  it('should default to auto theme', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('auto');
  });

  it('should load theme from localStorage', () => {
    localStorage.setItem('flux-theme', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('should save theme to localStorage on change', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(localStorage.getItem('flux-theme')).toBe('dark');
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

  it('should toggle theme: light -> dark -> auto -> light', () => {
    localStorage.setItem('flux-theme', 'light');
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('auto');

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('light');
  });

  it('should use system preference in auto mode', () => {
    mockMQ = createMockMediaQuery(true); // prefers dark
    (window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue(mockMQ);

    const { result } = renderHook(() => useTheme());
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('should respond to system preference changes in auto mode', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolvedTheme).toBe('light');

    act(() => {
      mockMQ.dispatchChange(true);
    });

    expect(result.current.resolvedTheme).toBe('dark');
  });
});
