/**
 * useMetMapKeyboardShortcuts Hook
 *
 * Keyboard shortcuts for MetMap playback and navigation.
 */

import { useEffect, useCallback } from 'react';

interface MetMapShortcutHandlers {
  onPlayPause: () => void;
  onStop: () => void;
  onNextSection?: () => void;
  onPrevSection?: () => void;
  onTempoUp?: () => void;
  onTempoDown?: () => void;
  onToggleClick?: () => void;
  onSave?: () => void;
  onNewSection?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  description: string;
  action: keyof MetMapShortcutHandlers;
}

// Define available shortcuts
export const METMAP_SHORTCUTS: KeyboardShortcut[] = [
  { key: ' ', description: 'Play/Pause', action: 'onPlayPause' },
  { key: 'Escape', description: 'Stop', action: 'onStop' },
  { key: 'ArrowRight', description: 'Next section', action: 'onNextSection' },
  { key: 'ArrowLeft', description: 'Previous section', action: 'onPrevSection' },
  { key: 'ArrowUp', description: 'Increase tempo (+5 BPM)', action: 'onTempoUp' },
  { key: 'ArrowDown', description: 'Decrease tempo (-5 BPM)', action: 'onTempoDown' },
  { key: 'm', description: 'Toggle metronome click', action: 'onToggleClick' },
  { key: 's', ctrl: true, description: 'Save', action: 'onSave' },
  { key: 'n', ctrl: true, description: 'New section', action: 'onNewSection' },
  { key: 'z', ctrl: true, description: 'Undo', action: 'onUndo' },
  { key: 'z', ctrl: true, shift: true, description: 'Redo', action: 'onRedo' },
];

// Keyframe editor shortcuts (handled locally in KeyframeEditor, shown here for help panel)
export const KEYFRAME_SHORTCUTS = [
  { key: 'Tab', description: 'Select next keyframe' },
  { key: 'Tab', shift: true, description: 'Select previous keyframe' },
  { key: 'ArrowLeft/Right', description: 'Nudge keyframe time (Shift: 10x)' },
  { key: 'ArrowUp/Down', description: 'Nudge keyframe value (Shift: 10x)' },
  { key: 'Delete', description: 'Delete selected keyframe' },
  { key: 'A', description: 'Add keyframe at midpoint' },
  { key: 'E', description: 'Cycle easing type' },
];

export function useMetMapKeyboardShortcuts(
  handlers: MetMapShortcutHandlers,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Allow Escape to still work
        if (event.key !== 'Escape') return;
      }

      // Find matching shortcut
      const shortcut = METMAP_SHORTCUTS.find((s) => {
        if (s.key !== event.key) return false;
        if (s.ctrl && !event.ctrlKey && !event.metaKey) return false;
        if (!s.ctrl && (event.ctrlKey || event.metaKey)) return false;
        if (s.shift && !event.shiftKey) return false;
        if (!s.shift && event.shiftKey) return false;
        return true;
      });

      if (shortcut) {
        const handler = handlers[shortcut.action];
        if (handler) {
          event.preventDefault();
          handler();
        }
      }
    },
    [handlers, enabled]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
}

// Component to display keyboard shortcuts
interface ShortcutsHelpProps {
  className?: string;
}

export function ShortcutsHelp({ className = '' }: ShortcutsHelpProps) {
  return (
    <div className={`text-xs text-gray-500 ${className}`}>
      <div className="font-medium text-gray-600 mb-1">Keyboard Shortcuts</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {METMAP_SHORTCUTS.map((shortcut) => (
          <div key={shortcut.key + shortcut.action} className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono text-[10px]">
              {shortcut.ctrl && 'Ctrl+'}
              {shortcut.shift && 'Shift+'}
              {shortcut.key === ' ' ? 'Space' : shortcut.key}
            </kbd>
            <span>{shortcut.description}</span>
          </div>
        ))}
      </div>
      <div className="font-medium text-gray-600 mb-1 mt-3">Keyframe Editor</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {KEYFRAME_SHORTCUTS.map((shortcut) => (
          <div key={shortcut.key + shortcut.description} className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono text-[10px]">
              {shortcut.shift && 'Shift+'}
              {shortcut.key}
            </kbd>
            <span>{shortcut.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default useMetMapKeyboardShortcuts;
