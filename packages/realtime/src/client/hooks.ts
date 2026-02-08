/**
 * React hooks for FluxStudio real-time collaboration
 *
 * Provides convenient hooks for working with Yjs documents and awareness.
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import {
  FluxRealtimeProvider,
  FluxRealtimeProviderOptions,
  ConnectionStatus,
} from "./FluxRealtimeProvider.js";

// ============================================================================
// useFluxDocument
// ============================================================================

export interface UseFluxDocumentOptions
  extends Omit<FluxRealtimeProviderOptions, "doc"> {
  /** Initial document to use (optional, will create new if not provided) */
  doc?: Y.Doc;
}

export interface UseFluxDocumentReturn {
  /** Yjs document */
  doc: Y.Doc;
  /** Realtime provider */
  provider: FluxRealtimeProvider | null;
  /** Connection status */
  status: ConnectionStatus;
  /** Whether synced with server */
  isSynced: boolean;
  /** Awareness instance */
  awareness: awarenessProtocol.Awareness | null;
  /** Reconnect to server */
  reconnect: () => void;
  /** Disconnect from server */
  disconnect: () => void;
}

/**
 * Hook for connecting to a FluxStudio real-time document
 *
 * @example
 * ```tsx
 * const { doc, status, awareness } = useFluxDocument({
 *   url: 'ws://localhost:4444',
 *   docName: 'my-document',
 *   token: authToken,
 * });
 * ```
 */
export function useFluxDocument(
  options: UseFluxDocumentOptions
): UseFluxDocumentReturn {
  const [doc] = useState(() => options.doc ?? new Y.Doc());
  const [provider, setProvider] = useState<FluxRealtimeProvider | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [isSynced, setIsSynced] = useState(false);

  // Create provider
  useEffect(() => {
    const newProvider = new FluxRealtimeProvider({
      ...options,
      doc,
      onStatusChange: setStatus,
      onSynced: setIsSynced,
    });

    setProvider(newProvider);

    return () => {
      newProvider.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.url, options.docName, options.token]);

  const reconnect = useCallback(() => {
    provider?.connect();
  }, [provider]);

  const disconnect = useCallback(() => {
    provider?.disconnect();
  }, [provider]);

  return {
    doc,
    provider,
    status,
    isSynced,
    awareness: provider?.getAwareness() ?? null,
    reconnect,
    disconnect,
  };
}

// ============================================================================
// useFluxPresence
// ============================================================================

export interface PresenceState {
  clientId: number;
  user?: {
    id: string;
    name: string;
    color: string;
    avatar?: string;
  };
  cursor?: {
    x: number;
    y: number;
  };
  selection?: unknown;
  [key: string]: unknown;
}

/**
 * Hook for managing presence/awareness in a real-time document
 *
 * @example
 * ```tsx
 * const { localState, remoteStates, setPresence } = useFluxPresence(awareness, {
 *   user: { id: userId, name: userName, color: '#ff0000' }
 * });
 * ```
 */
export function useFluxPresence(
  awareness: awarenessProtocol.Awareness | null,
  initialState?: Partial<PresenceState>
) {
  const [states, setStates] = useState<Map<number, PresenceState>>(new Map());

  // Set initial state
  useEffect(() => {
    if (awareness && initialState) {
      awareness.setLocalState(initialState);
    }
  }, [awareness, initialState]);

  // Subscribe to awareness updates
  useEffect(() => {
    if (!awareness) return;

    const updateStates = () => {
      setStates(new Map(awareness.getStates() as Map<number, PresenceState>));
    };

    updateStates();

    awareness.on("change", updateStates);

    return () => {
      awareness.off("change", updateStates);
    };
  }, [awareness]);

  const localState = useMemo(() => {
    if (!awareness) return null;
    return (awareness.getLocalState() as PresenceState) ?? null;
  }, [awareness, states]);

  const remoteStates = useMemo(() => {
    if (!awareness) return [];
    const localClientId = awareness.clientID;
    return Array.from(states.entries())
      .filter(([id]) => id !== localClientId)
      .map(([id, state]) => ({ ...state, clientId: id }));
  }, [awareness, states]);

  const setPresence = useCallback(
    (state: Partial<PresenceState>) => {
      if (awareness) {
        awareness.setLocalStateField("user", state.user);
        if (state.cursor !== undefined) {
          awareness.setLocalStateField("cursor", state.cursor);
        }
        if (state.selection !== undefined) {
          awareness.setLocalStateField("selection", state.selection);
        }
        // Set any additional fields
        for (const [key, value] of Object.entries(state)) {
          if (!["user", "cursor", "selection", "clientId"].includes(key)) {
            awareness.setLocalStateField(key, value);
          }
        }
      }
    },
    [awareness]
  );

  const updateCursor = useCallback(
    (cursor: { x: number; y: number } | null) => {
      if (awareness) {
        awareness.setLocalStateField("cursor", cursor);
      }
    },
    [awareness]
  );

  const updateSelection = useCallback(
    (selection: unknown) => {
      if (awareness) {
        awareness.setLocalStateField("selection", selection);
      }
    },
    [awareness]
  );

  return {
    localState,
    remoteStates,
    setPresence,
    updateCursor,
    updateSelection,
    clientId: awareness?.clientID ?? null,
  };
}

// ============================================================================
// useYMap
// ============================================================================

/**
 * Hook for working with a Y.Map
 *
 * @example
 * ```tsx
 * const { data, set, delete: del, clear } = useYMap<MyData>(doc.getMap('mymap'));
 * ```
 */
export function useYMap<T extends Record<string, unknown>>(
  ymap: Y.Map<unknown> | null
): {
  data: T;
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  delete: (key: keyof T) => void;
  clear: () => void;
} {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (!ymap) return () => {};

      const handler = () => callback();
      ymap.observe(handler);

      return () => {
        ymap.unobserve(handler);
      };
    },
    [ymap]
  );

  const getSnapshot = useCallback((): T => {
    if (!ymap) return {} as T;
    return Object.fromEntries(ymap.entries()) as T;
  }, [ymap]);

  const data = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const set = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      ymap?.set(key as string, value);
    },
    [ymap]
  );

  const del = useCallback(
    (key: keyof T) => {
      ymap?.delete(key as string);
    },
    [ymap]
  );

  const clear = useCallback(() => {
    ymap?.clear();
  }, [ymap]);

  return { data, set, delete: del, clear };
}

// ============================================================================
// useYArray
// ============================================================================

/**
 * Hook for working with a Y.Array
 *
 * @example
 * ```tsx
 * const { items, push, insert, delete: del, move } = useYArray<Item>(doc.getArray('items'));
 * ```
 */
export function useYArray<T>(yarray: Y.Array<T> | null): {
  items: T[];
  push: (...items: T[]) => void;
  unshift: (...items: T[]) => void;
  insert: (index: number, ...items: T[]) => void;
  delete: (index: number, length?: number) => void;
  move: (from: number, to: number) => void;
  clear: () => void;
  length: number;
} {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (!yarray) return () => {};

      const handler = () => callback();
      yarray.observe(handler);

      return () => {
        yarray.unobserve(handler);
      };
    },
    [yarray]
  );

  const getSnapshot = useCallback((): T[] => {
    if (!yarray) return [];
    return yarray.toArray();
  }, [yarray]);

  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const push = useCallback(
    (...newItems: T[]) => {
      yarray?.push(newItems);
    },
    [yarray]
  );

  const unshift = useCallback(
    (...newItems: T[]) => {
      yarray?.unshift(newItems);
    },
    [yarray]
  );

  const insert = useCallback(
    (index: number, ...newItems: T[]) => {
      yarray?.insert(index, newItems);
    },
    [yarray]
  );

  const del = useCallback(
    (index: number, length = 1) => {
      yarray?.delete(index, length);
    },
    [yarray]
  );

  const move = useCallback(
    (from: number, to: number) => {
      if (!yarray) return;

      const item = yarray.get(from);
      yarray.delete(from, 1);
      yarray.insert(to > from ? to - 1 : to, [item]);
    },
    [yarray]
  );

  const clear = useCallback(() => {
    if (yarray && yarray.length > 0) {
      yarray.delete(0, yarray.length);
    }
  }, [yarray]);

  return {
    items,
    push,
    unshift,
    insert,
    delete: del,
    move,
    clear,
    length: items.length,
  };
}

// ============================================================================
// useYText
// ============================================================================

/**
 * Hook for working with a Y.Text
 *
 * @example
 * ```tsx
 * const { text, insert, delete: del, format } = useYText(doc.getText('content'));
 * ```
 */
export function useYText(ytext: Y.Text | null): {
  text: string;
  insert: (index: number, content: string, attributes?: Record<string, unknown>) => void;
  delete: (index: number, length: number) => void;
  format: (index: number, length: number, attributes: Record<string, unknown>) => void;
  applyDelta: (delta: unknown[]) => void;
  length: number;
} {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (!ytext) return () => {};

      const handler = () => callback();
      ytext.observe(handler);

      return () => {
        ytext.unobserve(handler);
      };
    },
    [ytext]
  );

  const getSnapshot = useCallback((): string => {
    if (!ytext) return "";
    return ytext.toString();
  }, [ytext]);

  const text = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const insert = useCallback(
    (index: number, content: string, attributes?: Record<string, unknown>) => {
      ytext?.insert(index, content, attributes);
    },
    [ytext]
  );

  const del = useCallback(
    (index: number, length: number) => {
      ytext?.delete(index, length);
    },
    [ytext]
  );

  const format = useCallback(
    (index: number, length: number, attributes: Record<string, unknown>) => {
      ytext?.format(index, length, attributes);
    },
    [ytext]
  );

  const applyDelta = useCallback(
    (delta: unknown[]) => {
      ytext?.applyDelta(delta);
    },
    [ytext]
  );

  return {
    text,
    insert,
    delete: del,
    format,
    applyDelta,
    length: text.length,
  };
}
