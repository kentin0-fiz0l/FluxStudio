/**
 * Tests for useAIShortcuts hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIShortcuts } from '../useAIShortcuts';

describe('useAIShortcuts', () => {
  const mockHandlers = {
    onOpenCommandPalette: vi.fn(),
    onOpenChat: vi.fn(),
    onGetSuggestion: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any lingering event listeners by unmounting
  });

  function dispatchKeyDown(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      ...modifiers,
    });
    window.dispatchEvent(event);
  }

  describe('Command Palette shortcut (Cmd+J)', () => {
    it('should open command palette with Cmd+J', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('j', { metaKey: true });
      });

      expect(mockHandlers.onOpenCommandPalette).toHaveBeenCalledTimes(1);
    });

    it('should open command palette with Ctrl+J', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('j', { ctrlKey: true });
      });

      expect(mockHandlers.onOpenCommandPalette).toHaveBeenCalledTimes(1);
    });

    it('should not trigger with Shift+J', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('j', { shiftKey: true });
      });

      expect(mockHandlers.onOpenCommandPalette).not.toHaveBeenCalled();
    });

    it('should not trigger with just J', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('j');
      });

      expect(mockHandlers.onOpenCommandPalette).not.toHaveBeenCalled();
    });

    it('should not trigger Cmd+Shift+J (that would be chat)', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('j', { metaKey: true, shiftKey: true });
      });

      // Cmd+Shift+J should not trigger command palette (Cmd+J without shift)
      expect(mockHandlers.onOpenCommandPalette).not.toHaveBeenCalled();
    });
  });

  describe('Chat shortcut (Cmd+Shift+A)', () => {
    it('should open chat with Cmd+Shift+A', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('a', { metaKey: true, shiftKey: true });
      });

      expect(mockHandlers.onOpenChat).toHaveBeenCalledTimes(1);
    });

    it('should open chat with Ctrl+Shift+A', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('a', { ctrlKey: true, shiftKey: true });
      });

      expect(mockHandlers.onOpenChat).toHaveBeenCalledTimes(1);
    });

    it('should not trigger with just Cmd+A', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('a', { metaKey: true });
      });

      expect(mockHandlers.onOpenChat).not.toHaveBeenCalled();
    });

    it('should not trigger with just A', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('a');
      });

      expect(mockHandlers.onOpenChat).not.toHaveBeenCalled();
    });
  });

  describe('Suggestion shortcut (Cmd+Shift+S)', () => {
    it('should get suggestion with Cmd+Shift+S', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('s', { metaKey: true, shiftKey: true });
      });

      expect(mockHandlers.onGetSuggestion).toHaveBeenCalledTimes(1);
    });

    it('should get suggestion with Ctrl+Shift+S', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('s', { ctrlKey: true, shiftKey: true });
      });

      expect(mockHandlers.onGetSuggestion).toHaveBeenCalledTimes(1);
    });

    it('should not trigger without onGetSuggestion handler', () => {
      const handlersWithoutSuggestion = {
        onOpenCommandPalette: vi.fn(),
        onOpenChat: vi.fn(),
      };

      renderHook(() => useAIShortcuts({ handlers: handlersWithoutSuggestion }));

      // Should not throw
      act(() => {
        dispatchKeyDown('s', { metaKey: true, shiftKey: true });
      });

      expect(handlersWithoutSuggestion.onOpenCommandPalette).not.toHaveBeenCalled();
      expect(handlersWithoutSuggestion.onOpenChat).not.toHaveBeenCalled();
    });

    it('should not trigger with just Cmd+S', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('s', { metaKey: true });
      });

      expect(mockHandlers.onGetSuggestion).not.toHaveBeenCalled();
    });
  });

  describe('Enabled/disabled', () => {
    it('should not respond to shortcuts when disabled', () => {
      renderHook(() => useAIShortcuts({ enabled: false, handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('j', { metaKey: true });
        dispatchKeyDown('a', { metaKey: true, shiftKey: true });
        dispatchKeyDown('s', { metaKey: true, shiftKey: true });
      });

      expect(mockHandlers.onOpenCommandPalette).not.toHaveBeenCalled();
      expect(mockHandlers.onOpenChat).not.toHaveBeenCalled();
      expect(mockHandlers.onGetSuggestion).not.toHaveBeenCalled();
    });

    it('should respond when enabled is true (default)', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('j', { metaKey: true });
      });

      expect(mockHandlers.onOpenCommandPalette).toHaveBeenCalled();
    });

    it('should stop responding after becoming disabled', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useAIShortcuts({ enabled, handlers: mockHandlers }),
        { initialProps: { enabled: true } }
      );

      act(() => {
        dispatchKeyDown('j', { metaKey: true });
      });
      expect(mockHandlers.onOpenCommandPalette).toHaveBeenCalledTimes(1);

      rerender({ enabled: false });

      act(() => {
        dispatchKeyDown('j', { metaKey: true });
      });
      expect(mockHandlers.onOpenCommandPalette).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should start responding after becoming enabled', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useAIShortcuts({ enabled, handlers: mockHandlers }),
        { initialProps: { enabled: false } }
      );

      act(() => {
        dispatchKeyDown('j', { metaKey: true });
      });
      expect(mockHandlers.onOpenCommandPalette).not.toHaveBeenCalled();

      rerender({ enabled: true });

      act(() => {
        dispatchKeyDown('j', { metaKey: true });
      });
      expect(mockHandlers.onOpenCommandPalette).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const { unmount } = renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      unmount();

      act(() => {
        dispatchKeyDown('j', { metaKey: true });
      });

      expect(mockHandlers.onOpenCommandPalette).not.toHaveBeenCalled();
    });
  });

  describe('Multiple shortcuts in sequence', () => {
    it('should handle rapid sequential shortcuts', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('j', { metaKey: true });
        dispatchKeyDown('a', { metaKey: true, shiftKey: true });
        dispatchKeyDown('s', { metaKey: true, shiftKey: true });
      });

      expect(mockHandlers.onOpenCommandPalette).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onOpenChat).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onGetSuggestion).toHaveBeenCalledTimes(1);
    });

    it('should handle repeated same shortcut', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('j', { metaKey: true });
        dispatchKeyDown('j', { metaKey: true });
        dispatchKeyDown('j', { metaKey: true });
      });

      expect(mockHandlers.onOpenCommandPalette).toHaveBeenCalledTimes(3);
    });
  });

  describe('Unrelated keys', () => {
    it('should ignore unrelated key combinations', () => {
      renderHook(() => useAIShortcuts({ handlers: mockHandlers }));

      act(() => {
        dispatchKeyDown('k', { metaKey: true });
        dispatchKeyDown('Enter');
        dispatchKeyDown('Escape');
        dispatchKeyDown('Tab');
        dispatchKeyDown('z', { metaKey: true });
      });

      expect(mockHandlers.onOpenCommandPalette).not.toHaveBeenCalled();
      expect(mockHandlers.onOpenChat).not.toHaveBeenCalled();
      expect(mockHandlers.onGetSuggestion).not.toHaveBeenCalled();
    });
  });
});
