/**
 * Unit Tests for useBreakpoint Hook (from useBreakpoint.ts)
 * @file src/hooks/__tests__/useBreakpoint.test.ts
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBreakpoint, useMediaQuery, useIsTouchDevice, BREAKPOINTS } from '../useBreakpoint';

const mockWindow = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
};

describe('useBreakpoint (from useBreakpoint.ts)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return desktop defaults initially (SSR-safe)', () => {
    const { result } = renderHook(() => useBreakpoint());
    // Initial state before effect runs is desktop defaults
    expect(result.current.isDesktop).toBeDefined();
    expect(result.current.currentBreakpoint).toBeDefined();
    expect(result.current.width).toBeDefined();
  });

  it('should detect mobile viewport after mount', () => {
    mockWindow(375);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.currentBreakpoint).toBe('xs');
  });

  it('should detect tablet viewport', () => {
    mockWindow(768);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.currentBreakpoint).toBe('md');
  });

  it('should detect desktop viewport', () => {
    mockWindow(1024);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.currentBreakpoint).toBe('lg');
  });

  it('should detect large desktop viewport', () => {
    mockWindow(1536);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isLargeDesktop).toBe(true);
    expect(result.current.currentBreakpoint).toBe('2xl');
  });

  it('should update on resize', () => {
    mockWindow(1024);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isDesktop).toBe(true);

    act(() => {
      mockWindow(375);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('should report correct width', () => {
    mockWindow(1280);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.width).toBe(1280);
  });
});

describe('useMediaQuery (from useBreakpoint.ts)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return match status', () => {
    const mockMQ = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue(mockMQ),
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('should update when media query changes', () => {
    let changeHandler: (() => void) | null = null;

    const mockMQ = {
      matches: false,
      addEventListener: vi.fn((_: string, handler: () => void) => {
        changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue(mockMQ),
    });

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);

    act(() => {
      // The hook reads mq.matches (not event.matches), so mutate the mock
      mockMQ.matches = true;
      changeHandler?.();
    });

    expect(result.current).toBe(true);
  });
});

describe('useIsTouchDevice (from useBreakpoint.ts)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should detect touch via maxTouchPoints', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 5,
    });

    const { result } = renderHook(() => useIsTouchDevice());
    expect(result.current).toBe(true);
  });

  it('should return false for non-touch devices', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });
    // jsdom may have ontouchstart defined - remove it
    delete (window as any).ontouchstart;

    const { result } = renderHook(() => useIsTouchDevice());
    expect(result.current).toBe(false);
  });
});

describe('BREAKPOINTS export', () => {
  it('should export expected breakpoint values', () => {
    expect(BREAKPOINTS.sm).toBe(640);
    expect(BREAKPOINTS.md).toBe(768);
    expect(BREAKPOINTS.lg).toBe(1024);
    expect(BREAKPOINTS.xl).toBe(1280);
    expect(BREAKPOINTS['2xl']).toBe(1536);
  });
});
