/**
 * Unit Tests for useKeyboardShortcuts Hook
 * @file src/hooks/__tests__/useKeyboardShortcuts.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let addEventSpy: ReturnType<typeof vi.spyOn>;
  let removeEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventSpy = vi.spyOn(document, 'addEventListener');
    removeEventSpy = vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register keydown listener on mount', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 'a', action, description: 'Test' }],
      })
    );

    expect(addEventSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should remove keydown listener on unmount', () => {
    const action = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 'a', action, description: 'Test' }],
      })
    );

    unmount();
    expect(removeEventSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should call action when matching key is pressed', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 's', ctrlKey: true, action, description: 'Save' }],
      })
    );

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: document.body });
    document.dispatchEvent(event);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should not call action when key does not match', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 's', ctrlKey: true, action, description: 'Save' }],
      })
    );

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: document.body });
    document.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();
  });

  it('should not trigger shortcuts when typing in input', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 's', action, description: 'Save' }],
      })
    );

    const input = document.createElement('input');
    const event = new KeyboardEvent('keydown', { key: 's', bubbles: true });
    Object.defineProperty(event, 'target', { value: input });
    document.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();
  });

  it('should not trigger shortcuts when typing in textarea', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 's', action, description: 'Save' }],
      })
    );

    const textarea = document.createElement('textarea');
    const event = new KeyboardEvent('keydown', { key: 's', bubbles: true });
    Object.defineProperty(event, 'target', { value: textarea });
    document.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();
  });

  it('should not trigger shortcuts in contentEditable elements', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 's', action, description: 'Save' }],
      })
    );

    const div = document.createElement('div');
    div.contentEditable = 'true';
    const event = new KeyboardEvent('keydown', { key: 's', bubbles: true });
    Object.defineProperty(event, 'target', { value: div });
    document.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();
  });

  it('should not register listener when disabled', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 's', action, description: 'Save' }],
        enabled: false,
      })
    );

    expect(addEventSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should match modifier keys correctly', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'k', metaKey: true, shiftKey: true, action, description: 'Meta+Shift+K' },
        ],
      })
    );

    // Without shift - should not match
    const event1 = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      shiftKey: false,
      bubbles: true,
    });
    Object.defineProperty(event1, 'target', { value: document.body });
    document.dispatchEvent(event1);
    expect(action).not.toHaveBeenCalled();

    // With correct modifiers
    const event2 = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      shiftKey: true,
      bubbles: true,
    });
    Object.defineProperty(event2, 'target', { value: document.body });
    document.dispatchEvent(event2);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should preventDefault and stopPropagation on match', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 'a', action, description: 'Test' }],
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
    Object.defineProperty(event, 'target', { value: document.body });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    const stopSpy = vi.spyOn(event, 'stopPropagation');
    document.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('should return the shortcuts array', () => {
    const shortcuts = [
      { key: 'a', action: vi.fn(), description: 'A' },
      { key: 'b', action: vi.fn(), description: 'B' },
    ];

    const { result } = renderHook(() =>
      useKeyboardShortcuts({ shortcuts })
    );

    expect(result.current).toBe(shortcuts);
  });

  it('should match case-insensitively', () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: 'S', action, description: 'Save' }],
      })
    );

    const event = new KeyboardEvent('keydown', { key: 's', bubbles: true });
    Object.defineProperty(event, 'target', { value: document.body });
    document.dispatchEvent(event);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('should only trigger first matching shortcut', () => {
    const action1 = vi.fn();
    const action2 = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          { key: 'a', action: action1, description: 'First' },
          { key: 'a', action: action2, description: 'Second' },
        ],
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
    Object.defineProperty(event, 'target', { value: document.body });
    document.dispatchEvent(event);

    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).not.toHaveBeenCalled();
  });
});
