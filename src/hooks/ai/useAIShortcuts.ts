/**
 * useAIShortcuts - Global keyboard shortcuts for AI features
 *
 * Provides keyboard shortcuts:
 * - Cmd+J / Ctrl+J: Open AI Command Palette
 * - Cmd+Shift+A / Ctrl+Shift+A: Open AI Chat
 * - Cmd+Shift+S / Ctrl+Shift+S: Get AI Suggestion for selection
 */

import * as React from 'react';

export interface AIShortcutHandlers {
  onOpenCommandPalette: () => void;
  onOpenChat: () => void;
  onGetSuggestion?: () => void;
}

export interface UseAIShortcutsOptions {
  enabled?: boolean;
  handlers: AIShortcutHandlers;
}

export function useAIShortcuts({ enabled = true, handlers }: UseAIShortcutsOptions) {
  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+J / Ctrl+J: Open Command Palette
      if (isMod && e.key === 'j' && !e.shiftKey) {
        e.preventDefault();
        handlers.onOpenCommandPalette();
        return;
      }

      // Cmd+Shift+A / Ctrl+Shift+A: Open Chat
      if (isMod && e.shiftKey && e.key === 'a') {
        e.preventDefault();
        handlers.onOpenChat();
        return;
      }

      // Cmd+Shift+S / Ctrl+Shift+S: Get Suggestion
      if (isMod && e.shiftKey && e.key === 's' && handlers.onGetSuggestion) {
        e.preventDefault();
        handlers.onGetSuggestion();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handlers]);
}

export default useAIShortcuts;
