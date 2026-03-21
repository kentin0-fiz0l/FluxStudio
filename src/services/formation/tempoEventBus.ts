/**
 * TempoEventBus - Cross-tool event bus for MetMap <-> Drill Writer sync.
 *
 * Singleton EventEmitter that allows MetMap collaboration to publish tempo
 * and section boundary changes, which the formation TempoMap and TempoCurve
 * components subscribe to for live re-rendering.
 */

// ============================================================================
// Event Types
// ============================================================================

/** Published when a section's tempo (BPM) changes in MetMap */
export interface TempoChangeEvent {
  /** Index of the section that changed */
  sectionIndex: number;
  /** New BPM value */
  bpm: number;
  /** Section name (for display) */
  sectionName?: string;
  /** Timestamp of the change */
  timestamp: number;
}

/** Published when section boundaries (start/end times) change */
export interface SectionBoundaryChangeEvent {
  /** The updated section boundaries as [startMs, endMs] pairs */
  boundaries: Array<{ startMs: number; endMs: number; sectionName?: string }>;
  /** Timestamp of the change */
  timestamp: number;
}

/** Published for playhead synchronization across tools */
export interface PlayheadSyncEvent {
  /** Current playhead position in milliseconds */
  positionMs: number;
  /** Whether playback is active */
  isPlaying: boolean;
  /** Source of the sync event */
  source: 'metmap' | 'drill-writer' | 'timeline';
  /** Timestamp of the event */
  timestamp: number;
}

/** Map of event names to their payload types */
export interface TempoEventMap {
  'tempo-change': TempoChangeEvent;
  'section-boundary-change': SectionBoundaryChangeEvent;
  'playhead-sync': PlayheadSyncEvent;
}

type EventName = keyof TempoEventMap;

// ============================================================================
// EventBus Implementation
// ============================================================================

type Listener<T> = (data: T) => void;

class TempoEventBusImpl {
  private listeners = new Map<string, Set<Listener<unknown>>>();

  /**
   * Subscribe to a typed event. Returns an unsubscribe function.
   */
  subscribe<K extends EventName>(
    event: K,
    callback: Listener<TempoEventMap[K]>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(callback as Listener<unknown>);

    return () => {
      set.delete(callback as Listener<unknown>);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Publish a typed event to all subscribers.
   */
  publish<K extends EventName>(event: K, data: TempoEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[TempoEventBus] Error in ${event} listener:`, err);
      }
    });
  }

  /**
   * Remove all listeners (useful for testing or cleanup).
   */
  clear(): void {
    this.listeners.clear();
  }
}

/** Singleton instance */
export const tempoEventBus = new TempoEventBusImpl();
