/**
 * Unit Tests for useCommandPalette Hook
 * @file src/hooks/__tests__/useCommandPalette.test.ts
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandPalette } from '../useCommandPalette';

describe('useCommandPalette', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start closed', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);
  });

  it('should open via open()', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('should close via close()', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('should toggle via toggle()', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('should toggle on Ctrl+K', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
      );
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('should toggle on Meta+K', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
      );
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('should open on Ctrl+P', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true })
      );
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('should close on Escape when open', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('should not change state on Escape when closed', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('should remove event listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useCommandPalette());

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
