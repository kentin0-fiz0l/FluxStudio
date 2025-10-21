import { useState, useEffect, useCallback } from 'react';

interface UseCommandPaletteReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useCommandPalette(): UseCommandPaletteReturn {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Command/Ctrl + K to open command palette
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        toggle();
        return;
      }

      // Command/Ctrl + P to open project search
      if ((event.metaKey || event.ctrlKey) && event.key === 'p') {
        event.preventDefault();
        open();
        return;
      }

      // Command/Ctrl + Shift + P to open command palette
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        open();
        return;
      }

      // Escape to close if open
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        close();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, open, close, toggle]);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}