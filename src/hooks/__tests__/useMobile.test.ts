/**
 * Mobile Hooks Tests
 * @file src/hooks/__tests__/useMobile.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useIsMobile,
  useIsTouchDevice,
  useBreakpoint,
  useMediaQuery,
  useViewportHeight,
  useOrientation,
  useIsPWA,
  BREAKPOINTS,
} from '../useMobile';

// Mock window properties
const mockWindow = (width: number, height: number = 800) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

describe('Mobile Hooks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('useIsMobile', () => {
    it('should return true for mobile viewport', () => {
      mockWindow(375);
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });

    it('should return false for desktop viewport', () => {
      mockWindow(1024);
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(false);
    });

    it('should update on resize', () => {
      mockWindow(1024);
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(false);

      act(() => {
        mockWindow(375);
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe(true);
    });

    it('should use md breakpoint as threshold', () => {
      mockWindow(BREAKPOINTS.md - 1);
      const { result: belowMd } = renderHook(() => useIsMobile());
      expect(belowMd.current).toBe(true);

      mockWindow(BREAKPOINTS.md);
      const { result: atMd } = renderHook(() => useIsMobile());
      expect(atMd.current).toBe(false);
    });
  });

  describe('useIsTouchDevice', () => {
    it('should detect touch capability via ontouchstart', () => {
      // @ts-expect-error - Mock ontouchstart
      window.ontouchstart = {};
      const { result } = renderHook(() => useIsTouchDevice());
      expect(result.current).toBe(true);
      // @ts-expect-error - Clean up
      delete window.ontouchstart;
    });

    it('should detect touch capability via maxTouchPoints', () => {
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
      const { result } = renderHook(() => useIsTouchDevice());
      expect(result.current).toBe(false);
    });
  });

  describe('useBreakpoint', () => {
    it('should return xs for small screens', () => {
      mockWindow(320);
      const { result } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('xs');
    });

    it('should return sm for small screens', () => {
      mockWindow(640);
      const { result } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('sm');
    });

    it('should return md for medium screens', () => {
      mockWindow(768);
      const { result } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('md');
    });

    it('should return lg for large screens', () => {
      mockWindow(1024);
      const { result } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('lg');
    });

    it('should return xl for extra large screens', () => {
      mockWindow(1280);
      const { result } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('xl');
    });

    it('should return 2xl for 2x large screens', () => {
      mockWindow(1536);
      const { result } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('2xl');
    });

    it('should update on resize', () => {
      mockWindow(320);
      const { result } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('xs');

      act(() => {
        mockWindow(1024);
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe('lg');
    });
  });

  describe('useMediaQuery', () => {
    it('should return match status for media query', () => {
      const mockMediaQuery = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('768'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: mockMediaQuery,
      });

      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
      expect(result.current).toBe(true);
    });

    it('should update when media query changes', () => {
      let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

      const mockMediaQueryList = {
        matches: false,
        addEventListener: vi.fn((_, handler) => {
          changeHandler = handler;
        }),
        removeEventListener: vi.fn(),
      };

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockReturnValue(mockMediaQueryList),
      });

      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
      expect(result.current).toBe(false);

      act(() => {
        changeHandler?.({ matches: true } as MediaQueryListEvent);
      });

      expect(result.current).toBe(true);
    });
  });

  describe('useViewportHeight', () => {
    it('should return viewport height values', () => {
      mockWindow(375, 667);

      const { result } = renderHook(() => useViewportHeight());

      expect(result.current.vh).toBe(667);
      expect(result.current.dvh).toBeGreaterThan(0);
    });

    it('should set CSS custom property', () => {
      mockWindow(375, 667);

      renderHook(() => useViewportHeight());

      const vh = document.documentElement.style.getPropertyValue('--vh');
      expect(vh).toBe('6.67px');
    });

    it('should update on resize', () => {
      mockWindow(375, 667);

      const { result } = renderHook(() => useViewportHeight());
      expect(result.current.vh).toBe(667);

      act(() => {
        mockWindow(375, 800);
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.vh).toBe(800);
    });
  });

  describe('useOrientation', () => {
    it('should detect portrait orientation', () => {
      mockWindow(375, 667);

      const { result } = renderHook(() => useOrientation());
      expect(result.current).toBe('portrait');
    });

    it('should detect landscape orientation', () => {
      mockWindow(667, 375);

      const { result } = renderHook(() => useOrientation());
      expect(result.current).toBe('landscape');
    });

    it('should update on resize', () => {
      mockWindow(375, 667);

      const { result } = renderHook(() => useOrientation());
      expect(result.current).toBe('portrait');

      act(() => {
        mockWindow(667, 375);
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe('landscape');
    });
  });

  describe('useIsPWA', () => {
    it('should detect standalone mode', () => {
      const mockMediaQueryList = {
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockReturnValue(mockMediaQueryList),
      });

      const { result } = renderHook(() => useIsPWA());
      expect(result.current).toBe(true);
    });

    it('should return false when not installed', () => {
      const mockMediaQueryList = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockReturnValue(mockMediaQueryList),
      });

      // @ts-expect-error - Mock iOS standalone
      window.navigator.standalone = false;

      const { result } = renderHook(() => useIsPWA());
      expect(result.current).toBe(false);
    });

    it('should detect iOS standalone mode', () => {
      const mockMediaQueryList = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockReturnValue(mockMediaQueryList),
      });

      // @ts-expect-error - Mock iOS standalone
      window.navigator.standalone = true;

      const { result } = renderHook(() => useIsPWA());
      expect(result.current).toBe(true);
    });
  });
});
