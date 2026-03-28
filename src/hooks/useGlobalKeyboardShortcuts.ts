/**
 * useGlobalKeyboardShortcuts - App-wide keyboard navigation
 *
 * Handles:
 * - 2-key "g" prefix sequences (g+p → Projects, g+m → Messages, g+s → Settings)
 * - "/" to focus search
 * - "?" to toggle shortcuts dialog
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useGlobalKeyboardShortcuts() {
  const navigate = useNavigate();
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const gPrefixRef = useRef(false);
  const gTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const toggleShortcutsDialog = useCallback(() => {
    setShortcutsDialogOpen(prev => !prev);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when focus is in input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      // Handle '?' for shortcuts dialog
      if (e.key === '?' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleShortcutsDialog();
        return;
      }

      // Handle '/' for focus search
      if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          '[data-search-input], input[type="search"], input[placeholder*="Search"]'
        );
        searchInput?.focus();
        return;
      }

      // Handle 'g' prefix for navigation sequences
      if (e.key === 'g' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (gPrefixRef.current) return;
        gPrefixRef.current = true;
        clearTimeout(gTimeoutRef.current);
        gTimeoutRef.current = setTimeout(() => { gPrefixRef.current = false; }, 500);
        return;
      }

      // Handle second key after 'g'
      if (gPrefixRef.current) {
        gPrefixRef.current = false;
        clearTimeout(gTimeoutRef.current);

        if (e.key === 'p') { e.preventDefault(); navigate('/projects'); return; }
        if (e.key === 'm') { e.preventDefault(); navigate('/messages'); return; }
        if (e.key === 's') { e.preventDefault(); navigate('/settings'); return; }
      }
    };

    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      clearTimeout(gTimeoutRef.current);
    };
  }, [navigate, toggleShortcutsDialog]);

  return { shortcutsDialogOpen, setShortcutsDialogOpen };
}
