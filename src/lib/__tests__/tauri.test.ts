/**
 * Unit Tests for Tauri desktop bridge
 * @file src/lib/__tests__/tauri.test.ts
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isTauri,
  saveWindowState,
  loadWindowState,
  openDetachedWindow,
  updateTrayBadge,
  onDeepLink,
  onFileDrop,
  onFileDropHover,
  onFileDropCancelled,
} from '../tauri';

describe('tauri bridge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Remove __TAURI__ if set
    if ('__TAURI__' in window) {
      delete (window as unknown as Record<string, unknown>).__TAURI__;
    }
  });

  describe('isTauri', () => {
    it('should return false in a normal browser environment', () => {
      expect(isTauri()).toBe(false);
    });

    it('should return true when __TAURI__ is present on window', () => {
      (window as unknown as Record<string, unknown>).__TAURI__ = {};
      expect(isTauri()).toBe(true);
    });
  });

  describe('saveWindowState', () => {
    it('should no-op in browser (non-Tauri)', async () => {
      await expect(
        saveWindowState({ x: 0, y: 0, width: 800, height: 600, maximized: false }),
      ).resolves.toBeUndefined();
    });
  });

  describe('loadWindowState', () => {
    it('should return null in browser (non-Tauri)', async () => {
      const state = await loadWindowState();
      expect(state).toBeNull();
    });
  });

  describe('openDetachedWindow', () => {
    it('should fall back to window.open in browser', async () => {
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
      await openDetachedWindow('/editor/123');
      expect(openSpy).toHaveBeenCalledWith('/editor/123', '_blank');
    });
  });

  describe('updateTrayBadge', () => {
    it('should no-op in browser (non-Tauri)', async () => {
      await expect(updateTrayBadge(5)).resolves.toBeUndefined();
    });
  });

  describe('onDeepLink', () => {
    it('should return a no-op unsubscribe in browser', () => {
      const callback = vi.fn();
      const unsub = onDeepLink(callback);
      expect(typeof unsub).toBe('function');
      unsub(); // should not throw
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('onFileDrop', () => {
    it('should return a no-op unsubscribe in browser', () => {
      const callback = vi.fn();
      const unsub = onFileDrop(callback);
      expect(typeof unsub).toBe('function');
      unsub();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('onFileDropHover', () => {
    it('should return a no-op unsubscribe in browser', () => {
      const callback = vi.fn();
      const unsub = onFileDropHover(callback);
      expect(typeof unsub).toBe('function');
      unsub();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('onFileDropCancelled', () => {
    it('should return a no-op unsubscribe in browser', () => {
      const callback = vi.fn();
      const unsub = onFileDropCancelled(callback);
      expect(typeof unsub).toBe('function');
      unsub();
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
