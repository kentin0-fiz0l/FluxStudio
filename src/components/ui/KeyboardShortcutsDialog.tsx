/**
 * KeyboardShortcutsDialog - Discoverable keyboard shortcuts overlay
 *
 * Shows all available keyboard shortcuts in a modal.
 * Reads dynamically registered shortcuts from KeyboardShortcutsContext
 * and merges them with built-in defaults.
 * Triggered by pressing "?" anywhere in the app.
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShortcutRowProps {
  keys: string[];
  action: string;
}

function ShortcutRow({ keys, action }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-neutral-700 dark:text-neutral-300">{action}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <React.Fragment key={i}>
            <kbd className="px-2 py-1 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-sm">
              {key}
            </kbd>
            {i < keys.length - 1 && (
              <span className="text-neutral-400 text-xs">+</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

interface ShortcutSectionProps {
  title: string;
  shortcuts: Array<{ keys: string[]; action: string }>;
}

function ShortcutSection({ title, shortcuts }: ShortcutSectionProps) {
  if (shortcuts.length === 0) return null;
  return (
    <div>
      <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
        {title}
      </h3>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {shortcuts.map((shortcut, i) => (
          <ShortcutRow key={i} keys={shortcut.keys} action={shortcut.action} />
        ))}
      </div>
    </div>
  );
}

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Additional dynamic sections from context (section name → shortcuts) */
  dynamicSections?: Map<string, Array<{ keys: string[]; action: string }>>;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  dynamicSections,
}: KeyboardShortcutsDialogProps) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  // Built-in default sections
  const builtInSections: Array<{ title: string; shortcuts: Array<{ keys: string[]; action: string }> }> = [
    {
      title: 'Navigation',
      shortcuts: [
        { keys: [cmdKey, 'K'], action: 'Open command palette' },
        { keys: ['G', 'P'], action: 'Go to Projects' },
        { keys: ['G', 'M'], action: 'Go to Messages' },
        { keys: ['G', 'O'], action: 'Go to Organization' },
        { keys: ['G', 'S'], action: 'Go to Settings' },
      ],
    },
    {
      title: 'Actions',
      shortcuts: [
        { keys: [cmdKey, 'N'], action: 'Create new project' },
        { keys: [cmdKey, 'U'], action: 'Upload file' },
        { keys: [cmdKey, 'M'], action: 'New message' },
        { keys: [cmdKey, 'F'], action: 'Search everything' },
        { keys: ['?'], action: 'Show keyboard shortcuts' },
      ],
    },
    {
      title: 'Editor',
      shortcuts: [
        { keys: [cmdKey, 'S'], action: 'Save changes' },
        { keys: [cmdKey, 'Z'], action: 'Undo' },
        { keys: [cmdKey, 'Shift', 'Z'], action: 'Redo' },
        { keys: ['Escape'], action: 'Close modal / Cancel' },
      ],
    },
  ];

  // Merge dynamic sections — append to built-in or create new sections
  const allSections = React.useMemo(() => {
    if (!dynamicSections || dynamicSections.size === 0) return builtInSections;

    const merged = [...builtInSections];
    for (const [section, shortcuts] of dynamicSections) {
      const existing = merged.find((s) => s.title === section);
      if (existing) {
        existing.shortcuts = [...existing.shortcuts, ...shortcuts];
      } else {
        merged.push({ title: section, shortcuts });
      }
    }
    return merged;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicSections, cmdKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 mt-4">
          {allSections.map((section) => (
            <ShortcutSection
              key={section.title}
              title={section.title}
              shortcuts={section.shortcuts}
            />
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-xs">?</kbd> anywhere to show this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manage keyboard shortcuts dialog
 */
export function useKeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // "?" key opens shortcuts dialog (shift + /)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Don't trigger if typing in an input
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }

        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { open, setOpen };
}

export default KeyboardShortcutsDialog;
