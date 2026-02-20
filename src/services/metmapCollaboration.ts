/**
 * MetMap Collaboration — Yjs Proof-of-Concept Binding
 *
 * Sprint 29 spike: demonstrates how MetMap state maps to Yjs shared types
 * and how changes flow between local React state and the CRDT document.
 *
 * NOT wired into the app — standalone module with a clear API.
 * Yjs is a dev-only dependency for now (not in the main bundle).
 */

import type { Section } from '../contexts/metmap/types';

// ---------------------------------------------------------------------------
// Types (Yjs-like interfaces — actual Yjs import deferred to Sprint 30)
// ---------------------------------------------------------------------------

/** Minimal Y.Map-like interface for the PoC. */
interface YMapLike {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  toJSON(): Record<string, unknown>;
  observe(fn: (event: unknown) => void): void;
}

/** Minimal Y.Array-like interface for the PoC. */
interface YArrayLike<T = unknown> {
  length: number;
  get(index: number): T;
  insert(index: number, items: T[]): void;
  delete(index: number, count?: number): void;
  toArray(): T[];
  toJSON(): unknown[];
  observe(fn: (event: unknown) => void): void;
}

/** Minimal Y.Doc-like interface for the PoC. */
interface YDocLike {
  getMap(name: string): YMapLike;
  getArray(name: string): YArrayLike;
  transact(fn: () => void): void;
}

// ---------------------------------------------------------------------------
// Converters: MetMap state ↔ Yjs shared types
// ---------------------------------------------------------------------------

/**
 * Convert a MetMap Section to a plain object suitable for Y.Map.set().
 * Nested arrays (chords, animations) are stored as JSON — in production
 * these would be Y.Arrays for granular collaboration.
 */
export function sectionToYMap(section: Section): Record<string, unknown> {
  return {
    id: section.id,
    name: section.name,
    bars: section.bars,
    timeSignature: section.timeSignature,
    tempoStart: section.tempoStart,
    tempoEnd: section.tempoEnd ?? null,
    tempoCurve: section.tempoCurve ?? null,
    startBar: section.startBar,
    orderIndex: section.orderIndex,
    chords: JSON.stringify(section.chords || []),
    animations: JSON.stringify(section.animations || []),
  };
}

/**
 * Convert a Y.Map JSON snapshot back to a MetMap Section.
 */
export function yMapToSection(data: Record<string, unknown>): Section {
  return {
    id: data.id as string,
    name: (data.name as string) || 'Section',
    bars: (data.bars as number) || 4,
    timeSignature: (data.timeSignature as string) || '4/4',
    tempoStart: (data.tempoStart as number) || 120,
    tempoEnd: (data.tempoEnd as number) || undefined,
    tempoCurve: (data.tempoCurve as string) || undefined,
    startBar: (data.startBar as number) || 1,
    orderIndex: (data.orderIndex as number) || 0,
    chords: data.chords ? JSON.parse(data.chords as string) : [],
    animations: data.animations ? JSON.parse(data.animations as string) : [],
  } as Section;
}

// ---------------------------------------------------------------------------
// Collaboration binding API
// ---------------------------------------------------------------------------

export interface MetMapCollaborationAPI {
  /** Load sections from the Yjs document into local state. */
  getSections(): Section[];

  /** Push a local section change to the Yjs document. */
  updateSection(index: number, section: Section): void;

  /** Add a new section to the Yjs document. */
  addSection(section: Section): void;

  /** Remove a section from the Yjs document. */
  removeSection(index: number): void;

  /** Observe all section changes (for dispatching to React state). */
  onSectionsChange(callback: (sections: Section[]) => void): () => void;

  /** Clean up observers and connections. */
  destroy(): void;
}

/**
 * Create a collaboration binding for a Yjs document.
 *
 * In Sprint 30 this will accept a real Y.Doc; for now it works
 * with the YDocLike interface to demonstrate the API shape.
 */
export function createMetMapCollaboration(doc: YDocLike): MetMapCollaborationAPI {
  const ySections = doc.getArray('sections');
  const observers: Array<(sections: Section[]) => void> = [];

  function readSections(): Section[] {
    return ySections.toJSON().map((item) => yMapToSection(item as Record<string, unknown>));
  }

  function notifyObservers() {
    const sections = readSections();
    for (const cb of observers) cb(sections);
  }

  // Observe Y.Array changes
  ySections.observe(() => {
    notifyObservers();
  });

  return {
    getSections: readSections,

    updateSection(index: number, section: Section) {
      doc.transact(() => {
        const ySection = ySections.get(index) as YMapLike | undefined;
        if (!ySection) return;
        const data = sectionToYMap(section);
        for (const [key, value] of Object.entries(data)) {
          ySection.set(key, value);
        }
      });
    },

    addSection(section: Section) {
      doc.transact(() => {
        // In production: ySections.insert(index, [new Y.Map(entries)])
        // For PoC: insert the plain object
        ySections.insert(ySections.length, [sectionToYMap(section) as unknown]);
      });
    },

    removeSection(index: number) {
      doc.transact(() => {
        ySections.delete(index, 1);
      });
    },

    onSectionsChange(callback: (sections: Section[]) => void): () => void {
      observers.push(callback);
      return () => {
        const idx = observers.indexOf(callback);
        if (idx !== -1) observers.splice(idx, 1);
      };
    },

    destroy() {
      observers.length = 0;
    },
  };
}

// ---------------------------------------------------------------------------
// Presence types (for Sprint 30+)
// ---------------------------------------------------------------------------

export interface MetMapPresence {
  userId: string;
  username: string;
  color: string;
  editingSection: number | null;
  selectedKeyframe: string | null;
  cursorBar: number | null;
}

// ---------------------------------------------------------------------------
// Usage example (not executed — documentation only)
// ---------------------------------------------------------------------------

/*
import * as Y from 'yjs';

// 1. Create Yjs document
const ydoc = new Y.Doc();

// 2. Create collaboration binding
const collab = createMetMapCollaboration(ydoc as unknown as YDocLike);

// 3. Observe changes for React dispatch
const unsubscribe = collab.onSectionsChange((sections) => {
  dispatch({ type: 'SET_SECTIONS', sections });
});

// 4. Push local edits to Yjs
collab.updateSection(0, updatedSection);

// 5. Cleanup
unsubscribe();
collab.destroy();
*/
