import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

vi.mock('../store', () => ({ useStore: vi.fn() }));

import { createUISlice, type UISlice } from '../slices/uiSlice';

function createTestStore() {
  return create<UISlice>()(
    immer((...args) => ({
      ...createUISlice(...(args as Parameters<typeof createUISlice>)),
    }))
  );
}

describe('uiSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('initial state', () => {
    it('should have correct defaults', () => {
      const { ui } = store.getState();
      expect(ui.theme).toBe('system');
      expect(ui.sidebarCollapsed).toBe(false);
      expect(ui.sidebarWidth).toBe(280);
      expect(ui.commandPaletteOpen).toBe(false);
      expect(ui.activeModal).toEqual({ isOpen: false, type: null });
      expect(ui.toasts).toEqual([]);
      expect(ui.isFullscreen).toBe(false);
      expect(ui.focusMode).toBe(false);
    });
  });

  describe('theme', () => {
    it('setTheme should update theme', () => {
      store.getState().ui.setTheme('dark');
      expect(store.getState().ui.theme).toBe('dark');
    });

    it('toggleTheme should switch between light and dark', () => {
      store.getState().ui.setTheme('light');
      store.getState().ui.toggleTheme();
      expect(store.getState().ui.theme).toBe('dark');

      store.getState().ui.toggleTheme();
      expect(store.getState().ui.theme).toBe('light');
    });
  });

  describe('sidebar', () => {
    it('setSidebarCollapsed should update state', () => {
      store.getState().ui.setSidebarCollapsed(true);
      expect(store.getState().ui.sidebarCollapsed).toBe(true);
    });

    it('toggleSidebar should flip collapsed state', () => {
      store.getState().ui.toggleSidebar();
      expect(store.getState().ui.sidebarCollapsed).toBe(true);
      store.getState().ui.toggleSidebar();
      expect(store.getState().ui.sidebarCollapsed).toBe(false);
    });

    it('setSidebarWidth should clamp between 200 and 500', () => {
      store.getState().ui.setSidebarWidth(100);
      expect(store.getState().ui.sidebarWidth).toBe(200);

      store.getState().ui.setSidebarWidth(600);
      expect(store.getState().ui.sidebarWidth).toBe(500);

      store.getState().ui.setSidebarWidth(350);
      expect(store.getState().ui.sidebarWidth).toBe(350);
    });
  });

  describe('command palette', () => {
    it('should open and close', () => {
      store.getState().ui.openCommandPalette();
      expect(store.getState().ui.commandPaletteOpen).toBe(true);

      store.getState().ui.closeCommandPalette();
      expect(store.getState().ui.commandPaletteOpen).toBe(false);
    });

    it('toggle should flip state', () => {
      store.getState().ui.toggleCommandPalette();
      expect(store.getState().ui.commandPaletteOpen).toBe(true);
    });
  });

  describe('modal', () => {
    it('openModal should set type and data', () => {
      store.getState().ui.openModal('confirm', { message: 'Sure?' });
      const modal = store.getState().ui.activeModal;
      expect(modal.isOpen).toBe(true);
      expect(modal.type).toBe('confirm');
      expect(modal.data).toEqual({ message: 'Sure?' });
    });

    it('closeModal should reset modal state', () => {
      store.getState().ui.openModal('confirm');
      store.getState().ui.closeModal();
      expect(store.getState().ui.activeModal).toEqual({ isOpen: false, type: null });
    });
  });

  describe('toasts', () => {
    it('addToast should add a toast with generated id', () => {
      store.getState().ui.addToast({ type: 'success', title: 'Done' });
      const toasts = store.getState().ui.toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].title).toBe('Done');
      expect(toasts[0].id).toBeTruthy();
    });

    it('removeToast should remove by id', () => {
      store.getState().ui.addToast({ type: 'info', title: 'Hi', duration: 0 });
      const id = store.getState().ui.toasts[0].id;
      store.getState().ui.removeToast(id);
      expect(store.getState().ui.toasts).toHaveLength(0);
    });
  });

  describe('fullscreen and focus mode', () => {
    it('setFullscreen should update state', () => {
      store.getState().ui.setFullscreen(true);
      expect(store.getState().ui.isFullscreen).toBe(true);
    });

    it('setFocusMode should update state', () => {
      store.getState().ui.setFocusMode(true);
      expect(store.getState().ui.focusMode).toBe(true);
    });
  });
});
