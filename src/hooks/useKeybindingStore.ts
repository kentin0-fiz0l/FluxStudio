/**
 * useKeybindingStore - Customizable keyboard shortcut bindings
 *
 * Stores user-customized keybindings in localStorage.
 * Falls back to defaults for any unset bindings.
 */

import { useState, useCallback, useMemo, useSyncExternalStore } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface KeyBinding {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export interface KeyBindingEntry {
  id: string;
  label: string;
  group: 'general' | 'editing' | 'navigation' | 'drill';
  default: KeyBinding;
  current: KeyBinding;
}

// ============================================================================
// Default Bindings
// ============================================================================

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const mod = isMac ? 'metaKey' : 'ctrlKey';

const DEFAULT_BINDINGS: Record<string, { label: string; group: KeyBindingEntry['group']; binding: KeyBinding }> = {
  // General
  save: { label: 'Save formation', group: 'general', binding: { key: 's', [mod]: true } },
  playPause: { label: 'Play / Pause', group: 'general', binding: { key: ' ' } },
  shortcuts: { label: 'Toggle shortcuts dialog', group: 'general', binding: { key: '?', shiftKey: true } },

  // Editing
  undo: { label: 'Undo', group: 'editing', binding: { key: 'z', [mod]: true } },
  redo: { label: 'Redo', group: 'editing', binding: { key: 'z', [mod]: true, shiftKey: true } },
  selectAll: { label: 'Select all', group: 'editing', binding: { key: 'a', [mod]: true } },
  copy: { label: 'Copy selected', group: 'editing', binding: { key: 'c', [mod]: true } },
  paste: { label: 'Paste', group: 'editing', binding: { key: 'v', [mod]: true } },
  duplicate: { label: 'Duplicate selected', group: 'editing', binding: { key: 'd', [mod]: true } },
  delete: { label: 'Delete selected', group: 'editing', binding: { key: 'Delete' } },
  deselect: { label: 'Deselect all', group: 'editing', binding: { key: 'Escape' } },

  // Navigation
  zoomIn: { label: 'Zoom in', group: 'navigation', binding: { key: '=' } },
  zoomOut: { label: 'Zoom out', group: 'navigation', binding: { key: '-' } },
  cyclePerformer: { label: 'Cycle through performers', group: 'navigation', binding: { key: 'Tab' } },

  // Drill
  nextSet: { label: 'Next set', group: 'drill', binding: { key: 'j' } },
  prevSet: { label: 'Previous set', group: 'drill', binding: { key: 'k' } },
  movementTools: { label: 'Movement tools', group: 'drill', binding: { key: 'm' } },
  drillAnalysis: { label: 'Drill analysis', group: 'drill', binding: { key: 'A', shiftKey: true } },
  coordinateInfo: { label: 'Coordinate info panel', group: 'drill', binding: { key: 'i' } },
};

// ============================================================================
// Storage
// ============================================================================

const STORAGE_KEY = 'fluxstudio:keybindings';

function loadCustomBindings(): Record<string, KeyBinding> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore corrupt data
  }
  return {};
}

function saveCustomBindings(bindings: Record<string, KeyBinding>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // Storage full or unavailable
  }
}

// ============================================================================
// External store for cross-component sync
// ============================================================================

let customBindings = loadCustomBindings();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return customBindings;
}

function updateBindings(newBindings: Record<string, KeyBinding>) {
  customBindings = newBindings;
  saveCustomBindings(newBindings);
  for (const listener of listeners) listener();
}

// ============================================================================
// Utilities
// ============================================================================

export function formatKeyBinding(binding: KeyBinding): string {
  const parts: string[] = [];
  const macSymbols = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (binding.ctrlKey) parts.push(macSymbols ? '\u2303' : 'Ctrl');
  if (binding.altKey) parts.push(macSymbols ? '\u2325' : 'Alt');
  if (binding.shiftKey) parts.push(macSymbols ? '\u21E7' : 'Shift');
  if (binding.metaKey) parts.push(macSymbols ? '\u2318' : 'Win');

  // Human-readable key names
  let keyLabel = binding.key;
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    'ArrowUp': '\u2191',
    'ArrowDown': '\u2193',
    'ArrowLeft': '\u2190',
    'ArrowRight': '\u2192',
    'Escape': 'Esc',
    'Delete': 'Del',
    'Backspace': '\u232B',
    'Tab': 'Tab',
    'Enter': '\u21B5',
    '=': '+',
    '-': '-',
    '?': '?',
  };
  keyLabel = keyMap[binding.key] ?? binding.key.toUpperCase();
  parts.push(keyLabel);

  return macSymbols ? parts.join('') : parts.join('+');
}

export function bindingMatchesEvent(binding: KeyBinding, e: KeyboardEvent): boolean {
  const keyMatch = e.key.toLowerCase() === binding.key.toLowerCase() ||
    (binding.key === '?' && e.key === '/' && e.shiftKey);
  return (
    keyMatch &&
    !!binding.ctrlKey === e.ctrlKey &&
    !!binding.metaKey === e.metaKey &&
    !!binding.shiftKey === e.shiftKey &&
    !!binding.altKey === e.altKey
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useKeybindingStore() {
  const custom = useSyncExternalStore(subscribe, getSnapshot);

  const getBinding = useCallback(
    (id: string): KeyBinding => {
      if (custom[id]) return custom[id];
      const def = DEFAULT_BINDINGS[id];
      return def ? def.binding : { key: '' };
    },
    [custom],
  );

  const setBinding = useCallback((id: string, binding: KeyBinding) => {
    updateBindings({ ...customBindings, [id]: binding });
  }, []);

  const resetBinding = useCallback((id: string) => {
    const next = { ...customBindings };
    delete next[id];
    updateBindings(next);
  }, []);

  const resetAll = useCallback(() => {
    updateBindings({});
  }, []);

  const entries = useMemo((): KeyBindingEntry[] => {
    return Object.entries(DEFAULT_BINDINGS).map(([id, def]) => ({
      id,
      label: def.label,
      group: def.group,
      default: def.binding,
      current: custom[id] ?? def.binding,
    }));
  }, [custom]);

  const isCustomized = useCallback(
    (id: string): boolean => !!custom[id],
    [custom],
  );

  return { getBinding, setBinding, resetBinding, resetAll, entries, isCustomized, formatKeyBinding };
}

/**
 * Hook for capturing a new keybinding via keyboard input.
 * Returns state and a start/stop/cancel API.
 */
export function useKeybindingCapture() {
  const [capturing, setCapturing] = useState<string | null>(null);
  const [captured, setCaptured] = useState<KeyBinding | null>(null);

  const startCapture = useCallback((bindingId: string) => {
    setCapturing(bindingId);
    setCaptured(null);
  }, []);

  const cancelCapture = useCallback(() => {
    setCapturing(null);
    setCaptured(null);
  }, []);

  const handleCaptureKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!capturing) return;
      e.preventDefault();
      e.stopPropagation();

      // Ignore lone modifier presses
      if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return;

      const binding: KeyBinding = {
        key: e.key,
        ...(e.ctrlKey && { ctrlKey: true }),
        ...(e.metaKey && { metaKey: true }),
        ...(e.shiftKey && { shiftKey: true }),
        ...(e.altKey && { altKey: true }),
      };

      setCaptured(binding);
    },
    [capturing],
  );

  return { capturing, captured, startCapture, cancelCapture, handleCaptureKeyDown };
}
