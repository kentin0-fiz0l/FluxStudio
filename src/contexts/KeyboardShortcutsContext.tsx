/* eslint-disable react-refresh/only-export-components */
/**
 * KeyboardShortcutsContext — Dynamic shortcut registration
 *
 * Features can register/unregister shortcuts at mount/unmount.
 * The KeyboardShortcutsDialog reads from this context to display all
 * currently active shortcuts.
 *
 * Sprint 54: Dynamic keyboard shortcuts provider
 */

import React, { createContext, useContext, useCallback, useRef, useSyncExternalStore } from 'react';

export interface ShortcutDefinition {
  id: string;
  keys: string[];
  action: string;
  section: string;
  /** Priority within section — lower numbers sort first */
  priority?: number;
}

interface ShortcutsStore {
  shortcuts: Map<string, ShortcutDefinition>;
  listeners: Set<() => void>;
}

interface KeyboardShortcutsContextValue {
  register: (shortcut: ShortcutDefinition) => void;
  unregister: (id: string) => void;
  getShortcuts: () => ShortcutDefinition[];
  subscribe: (listener: () => void) => () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<ShortcutsStore>({
    shortcuts: new Map(),
    listeners: new Set(),
  });

  const notify = useCallback(() => {
    storeRef.current.listeners.forEach((l) => l());
  }, []);

  const register = useCallback((shortcut: ShortcutDefinition) => {
    storeRef.current.shortcuts.set(shortcut.id, shortcut);
    notify();
  }, [notify]);

  const unregister = useCallback((id: string) => {
    storeRef.current.shortcuts.delete(id);
    notify();
  }, [notify]);

  const getShortcuts = useCallback(() => {
    return Array.from(storeRef.current.shortcuts.values()).sort(
      (a, b) => (a.priority ?? 50) - (b.priority ?? 50)
    );
  }, []);

  const subscribe = useCallback((listener: () => void) => {
    storeRef.current.listeners.add(listener);
    return () => {
      storeRef.current.listeners.delete(listener);
    };
  }, []);

  const value = React.useMemo(
    () => ({ register, unregister, getShortcuts, subscribe }),
    [register, unregister, getShortcuts, subscribe]
  );

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

/**
 * Hook for components to access the shortcut registry.
 * Returns all currently registered shortcuts, grouped by section.
 */
export function useShortcutRegistry() {
  const ctx = useContext(KeyboardShortcutsContext);
  if (!ctx) {
    throw new Error('useShortcutRegistry must be used within KeyboardShortcutsProvider');
  }

  const shortcuts = useSyncExternalStore(ctx.subscribe, ctx.getShortcuts, ctx.getShortcuts);

  const grouped = React.useMemo(() => {
    const map = new Map<string, Array<{ keys: string[]; action: string }>>();
    for (const s of shortcuts) {
      if (!map.has(s.section)) map.set(s.section, []);
      map.get(s.section)!.push({ keys: s.keys, action: s.action });
    }
    return map;
  }, [shortcuts]);

  return { shortcuts, grouped };
}

/**
 * Register a shortcut when a component mounts, unregister on unmount.
 */
export function useRegisterShortcut(shortcut: ShortcutDefinition) {
  const ctx = useContext(KeyboardShortcutsContext);

  React.useEffect(() => {
    if (!ctx) return;
    ctx.register(shortcut);
    return () => ctx.unregister(shortcut.id);
    // Only re-register if the id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, shortcut.id]);
}

/**
 * Register multiple shortcuts at once.
 */
export function useRegisterShortcuts(shortcuts: ShortcutDefinition[]) {
  const ctx = useContext(KeyboardShortcutsContext);

  React.useEffect(() => {
    if (!ctx) return;
    for (const s of shortcuts) {
      ctx.register(s);
    }
    return () => {
      for (const s of shortcuts) {
        ctx.unregister(s.id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);
}
