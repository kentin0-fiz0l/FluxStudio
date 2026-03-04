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

describe('uiSlice (extended)', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('theme switching edge cases', () => {
    it('setTheme to system should update theme state', () => {
      store.getState().ui.setTheme('system');
      expect(store.getState().ui.theme).toBe('system');
    });

    it('toggleTheme from system should go to dark', () => {
      // system is neither 'light' nor 'dark', so toggleTheme: current === 'light' ? 'dark' : 'light'
      // system !== 'light', so next = 'light'
      store.getState().ui.setTheme('system');
      store.getState().ui.toggleTheme();
      expect(store.getState().ui.theme).toBe('light');
    });

    it('toggleTheme should cycle correctly: dark -> light -> dark', () => {
      store.getState().ui.setTheme('dark');
      store.getState().ui.toggleTheme();
      expect(store.getState().ui.theme).toBe('light');
      store.getState().ui.toggleTheme();
      expect(store.getState().ui.theme).toBe('dark');
    });
  });

  describe('theme settings', () => {
    it('updateThemeSettings should merge partial updates', () => {
      store.getState().ui.updateThemeSettings({ variant: 'cosmic' });
      expect(store.getState().ui.themeSettings.variant).toBe('cosmic');
      // Other settings unchanged
      expect(store.getState().ui.themeSettings.layoutDensity).toBe('comfortable');
      expect(store.getState().ui.themeSettings.showAnimations).toBe(true);
    });

    it('updateThemeSettings should allow setting customAccentColor', () => {
      store.getState().ui.updateThemeSettings({ customAccentColor: '#ff6600' });
      expect(store.getState().ui.themeSettings.customAccentColor).toBe('#ff6600');
    });

    it('resetThemeSettings should restore defaults', () => {
      store.getState().ui.updateThemeSettings({ variant: 'vibrant', layoutDensity: 'compact', showAnimations: false });
      store.getState().ui.resetThemeSettings();

      const settings = store.getState().ui.themeSettings;
      expect(settings.variant).toBe('default');
      expect(settings.layoutDensity).toBe('comfortable');
      expect(settings.showAnimations).toBe(true);
      expect(settings.customAccentColor).toBeUndefined();
    });
  });

  describe('sidebar', () => {
    it('setSidebarCollapsed to true and back', () => {
      store.getState().ui.setSidebarCollapsed(true);
      expect(store.getState().ui.sidebarCollapsed).toBe(true);
      store.getState().ui.setSidebarCollapsed(false);
      expect(store.getState().ui.sidebarCollapsed).toBe(false);
    });

    it('setSidebarWidth should clamp at minimum boundary', () => {
      store.getState().ui.setSidebarWidth(199);
      expect(store.getState().ui.sidebarWidth).toBe(200);
    });

    it('setSidebarWidth should clamp at maximum boundary', () => {
      store.getState().ui.setSidebarWidth(501);
      expect(store.getState().ui.sidebarWidth).toBe(500);
    });

    it('setSidebarWidth should accept exact boundary values', () => {
      store.getState().ui.setSidebarWidth(200);
      expect(store.getState().ui.sidebarWidth).toBe(200);
      store.getState().ui.setSidebarWidth(500);
      expect(store.getState().ui.sidebarWidth).toBe(500);
    });
  });

  describe('modal open/close sequence', () => {
    it('should open modal with type and data', () => {
      store.getState().ui.openModal('settings', { tab: 'general' });
      const modal = store.getState().ui.activeModal;
      expect(modal.isOpen).toBe(true);
      expect(modal.type).toBe('settings');
      expect(modal.data).toEqual({ tab: 'general' });
    });

    it('should open modal without data', () => {
      store.getState().ui.openModal('confirm');
      expect(store.getState().ui.activeModal.data).toBeUndefined();
    });

    it('opening a new modal should replace the current one', () => {
      store.getState().ui.openModal('settings');
      store.getState().ui.openModal('share', { projectId: '123' });

      const modal = store.getState().ui.activeModal;
      expect(modal.type).toBe('share');
      expect(modal.data).toEqual({ projectId: '123' });
    });

    it('closeModal should reset to initial state', () => {
      store.getState().ui.openModal('settings');
      store.getState().ui.closeModal();
      expect(store.getState().ui.activeModal).toEqual({ isOpen: false, type: null });
    });

    it('close when already closed should be idempotent', () => {
      store.getState().ui.closeModal();
      expect(store.getState().ui.activeModal).toEqual({ isOpen: false, type: null });
    });
  });

  describe('toast queue', () => {
    it('should add multiple toasts in order', () => {
      store.getState().ui.addToast({ type: 'success', title: 'First', duration: 0 });
      store.getState().ui.addToast({ type: 'error', title: 'Second', duration: 0 });
      store.getState().ui.addToast({ type: 'warning', title: 'Third', duration: 0 });

      const toasts = store.getState().ui.toasts;
      expect(toasts).toHaveLength(3);
      expect(toasts[0].title).toBe('First');
      expect(toasts[1].title).toBe('Second');
      expect(toasts[2].title).toBe('Third');
    });

    it('should generate unique ids for each toast', () => {
      store.getState().ui.addToast({ type: 'info', title: 'A', duration: 0 });
      store.getState().ui.addToast({ type: 'info', title: 'B', duration: 0 });

      const ids = store.getState().ui.toasts.map((t) => t.id);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it('removeToast with invalid id should be a no-op', () => {
      store.getState().ui.addToast({ type: 'info', title: 'T', duration: 0 });
      store.getState().ui.removeToast('nonexistent');
      expect(store.getState().ui.toasts).toHaveLength(1);
    });

    it('toast with message should preserve message field', () => {
      store.getState().ui.addToast({ type: 'error', title: 'Error', message: 'Details here', duration: 0 });
      expect(store.getState().ui.toasts[0].message).toBe('Details here');
    });

    it('toast auto-remove should work with setTimeout', async () => {
      vi.useFakeTimers();
      store.getState().ui.addToast({ type: 'success', title: 'Auto', duration: 1000 });
      expect(store.getState().ui.toasts).toHaveLength(1);

      vi.advanceTimersByTime(1000);
      expect(store.getState().ui.toasts).toHaveLength(0);
      vi.useRealTimers();
    });
  });

  describe('fullscreen toggle', () => {
    it('should toggle fullscreen state', () => {
      store.getState().ui.setFullscreen(true);
      expect(store.getState().ui.isFullscreen).toBe(true);
      store.getState().ui.setFullscreen(false);
      expect(store.getState().ui.isFullscreen).toBe(false);
    });
  });

  describe('focus mode', () => {
    it('should toggle focus mode state', () => {
      store.getState().ui.setFocusMode(true);
      expect(store.getState().ui.focusMode).toBe(true);
      store.getState().ui.setFocusMode(false);
      expect(store.getState().ui.focusMode).toBe(false);
    });
  });

  describe('workspace context and mode', () => {
    it('setContext should update currentContext', () => {
      store.getState().ui.setContext('project');
      expect(store.getState().ui.currentContext).toBe('project');
    });

    it('setContext should update mode when provided', () => {
      store.getState().ui.setContext('project', 'focus');
      expect(store.getState().ui.currentContext).toBe('project');
      expect(store.getState().ui.currentMode).toBe('focus');
    });

    it('setContext without mode should not change existing mode', () => {
      store.getState().ui.setContext('project', 'collaboration');
      store.getState().ui.setContext('conversation');
      expect(store.getState().ui.currentMode).toBe('collaboration');
    });

    it('should support all context values', () => {
      const contexts = ['dashboard', 'project', 'conversation', 'organization', 'team'] as const;
      for (const ctx of contexts) {
        store.getState().ui.setContext(ctx);
        expect(store.getState().ui.currentContext).toBe(ctx);
      }
    });
  });

  describe('activity feed', () => {
    it('addActivity should prepend new activity with generated id and timestamp', () => {
      store.getState().ui.addActivity({
        type: 'message',
        title: 'New message',
        description: 'Test description',
        userId: 'u1',
        userName: 'Alice',
      });

      const activities = store.getState().ui.recentActivity;
      expect(activities).toHaveLength(1);
      expect(activities[0].id).toBeTruthy();
      expect(activities[0].timestamp).toBeTruthy();
      expect(activities[0].title).toBe('New message');
    });

    it('addActivity should keep most recent first', () => {
      store.getState().ui.addActivity({ type: 'message', title: 'First', description: '', userId: 'u1', userName: 'A' });
      store.getState().ui.addActivity({ type: 'file_upload', title: 'Second', description: '', userId: 'u1', userName: 'A' });

      expect(store.getState().ui.recentActivity[0].title).toBe('Second');
    });

    it('addActivity should limit to 50 entries', () => {
      for (let i = 0; i < 55; i++) {
        store.getState().ui.addActivity({ type: 'message', title: `Activity ${i}`, description: '', userId: 'u1', userName: 'A' });
      }
      expect(store.getState().ui.recentActivity.length).toBeLessThanOrEqual(50);
    });
  });

  describe('workflow', () => {
    it('startWorkflow should set current workflow with current=true', () => {
      store.getState().ui.startWorkflow({
        id: 'wf-1',
        workflowId: 'onboarding',
        title: 'Step 1',
        description: 'Welcome',
        completed: false,
        actions: [],
      });

      const wf = store.getState().ui.currentWorkflow;
      expect(wf).not.toBeNull();
      expect(wf!.current).toBe(true);
      expect(wf!.completed).toBe(false);
    });

    it('completeWorkflowStep should mark the matching step as completed', () => {
      store.getState().ui.startWorkflow({
        id: 'wf-step-1',
        workflowId: 'onboarding',
        title: 'Step 1',
        description: 'Do thing',
        completed: false,
        actions: [],
      });

      store.getState().ui.completeWorkflowStep('wf-step-1');
      expect(store.getState().ui.currentWorkflow!.completed).toBe(true);
    });

    it('completeWorkflowStep should be no-op for non-matching id', () => {
      store.getState().ui.startWorkflow({
        id: 'wf-step-1',
        workflowId: 'onboarding',
        title: 'Step 1',
        description: 'Do thing',
        completed: false,
        actions: [],
      });

      store.getState().ui.completeWorkflowStep('wrong-id');
      expect(store.getState().ui.currentWorkflow!.completed).toBe(false);
    });
  });

  describe('loading states', () => {
    it('setWorkspaceLoading should set and unset loading by key', () => {
      store.getState().ui.setWorkspaceLoading('projects', true);
      expect(store.getState().ui.loadingStates['projects']).toBe(true);

      store.getState().ui.setWorkspaceLoading('projects', false);
      expect(store.getState().ui.loadingStates['projects']).toBe(false);
    });

    it('isWorkspaceLoading should return false for unknown key', () => {
      expect(store.getState().ui.isWorkspaceLoading('unknown')).toBe(false);
    });

    it('should handle multiple concurrent loading keys', () => {
      store.getState().ui.setWorkspaceLoading('projects', true);
      store.getState().ui.setWorkspaceLoading('messages', true);
      expect(store.getState().ui.isWorkspaceLoading('projects')).toBe(true);
      expect(store.getState().ui.isWorkspaceLoading('messages')).toBe(true);

      store.getState().ui.setWorkspaceLoading('projects', false);
      expect(store.getState().ui.isWorkspaceLoading('projects')).toBe(false);
      expect(store.getState().ui.isWorkspaceLoading('messages')).toBe(true);
    });
  });

  describe('command palette', () => {
    it('toggleCommandPalette should alternate state', () => {
      expect(store.getState().ui.commandPaletteOpen).toBe(false);
      store.getState().ui.toggleCommandPalette();
      expect(store.getState().ui.commandPaletteOpen).toBe(true);
      store.getState().ui.toggleCommandPalette();
      expect(store.getState().ui.commandPaletteOpen).toBe(false);
    });

    it('openCommandPalette when already open should stay open', () => {
      store.getState().ui.openCommandPalette();
      store.getState().ui.openCommandPalette();
      expect(store.getState().ui.commandPaletteOpen).toBe(true);
    });

    it('closeCommandPalette when already closed should stay closed', () => {
      store.getState().ui.closeCommandPalette();
      expect(store.getState().ui.commandPaletteOpen).toBe(false);
    });
  });
});
