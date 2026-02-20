/**
 * MetMap Collaboration — Yjs Binding for Real-Time Collaborative Editing
 *
 * Sprint 30: Upgraded from Sprint 29 PoC mock interfaces to real Y.Doc.
 * Provides the API for syncing MetMap sections between local React state
 * and the Yjs CRDT document.
 */

import * as Y from 'yjs';
import type { Section } from '../contexts/metmap/types';

// ---------------------------------------------------------------------------
// Converters: MetMap state ↔ Yjs shared types
// ---------------------------------------------------------------------------

/**
 * Convert a MetMap Section to a Y.Map within a transaction.
 * Nested arrays (chords, animations) are stored as JSON strings — in Sprint 31+
 * these will be Y.Arrays for granular collaboration.
 */
export function sectionToYMap(_doc: Y.Doc, section: Section): Y.Map<unknown> {
  const yMap = new Y.Map<unknown>();
  yMap.set('id', section.id);
  yMap.set('name', section.name);
  yMap.set('bars', section.bars);
  yMap.set('timeSignature', section.timeSignature);
  yMap.set('tempoStart', section.tempoStart);
  yMap.set('tempoEnd', section.tempoEnd ?? null);
  yMap.set('tempoCurve', section.tempoCurve ?? null);
  yMap.set('startBar', section.startBar);
  yMap.set('orderIndex', section.orderIndex);
  yMap.set('chords', JSON.stringify(section.chords || []));
  yMap.set('animations', JSON.stringify(section.animations || []));
  return yMap;
}

/**
 * Convert a Y.Map to a MetMap Section.
 */
export function yMapToSection(yMap: Y.Map<unknown>): Section {
  const data = yMap.toJSON();
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

  /** Replace all sections in the Yjs document (for initial load). */
  setSections(sections: Section[]): void;

  /** Observe all section changes (for dispatching to React state). */
  onSectionsChange(callback: (sections: Section[]) => void): () => void;

  /** Clean up observers and connections. */
  destroy(): void;
}

/**
 * Create a collaboration binding for a real Y.Doc.
 */
export function createMetMapCollaboration(doc: Y.Doc): MetMapCollaborationAPI {
  const ySections: Y.Array<Y.Map<unknown>> = doc.getArray('sections');
  const observers: Array<(sections: Section[]) => void> = [];

  function readSections(): Section[] {
    const result: Section[] = [];
    for (let i = 0; i < ySections.length; i++) {
      const yMap = ySections.get(i);
      if (yMap instanceof Y.Map) {
        result.push(yMapToSection(yMap));
      }
    }
    return result;
  }

  function notifyObservers() {
    const sections = readSections();
    for (const cb of observers) cb(sections);
  }

  // Observe Y.Array changes (deep — catches both array and nested map changes)
  ySections.observeDeep(() => {
    notifyObservers();
  });

  return {
    getSections: readSections,

    updateSection(index: number, section: Section) {
      doc.transact(() => {
        const ySection = ySections.get(index);
        if (!ySection || !(ySection instanceof Y.Map)) return;
        ySection.set('id', section.id);
        ySection.set('name', section.name);
        ySection.set('bars', section.bars);
        ySection.set('timeSignature', section.timeSignature);
        ySection.set('tempoStart', section.tempoStart);
        ySection.set('tempoEnd', section.tempoEnd ?? null);
        ySection.set('tempoCurve', section.tempoCurve ?? null);
        ySection.set('startBar', section.startBar);
        ySection.set('orderIndex', section.orderIndex);
        ySection.set('chords', JSON.stringify(section.chords || []));
        ySection.set('animations', JSON.stringify(section.animations || []));
      });
    },

    addSection(section: Section) {
      doc.transact(() => {
        const yMap = sectionToYMap(doc, section);
        ySections.push([yMap]);
      });
    },

    removeSection(index: number) {
      doc.transact(() => {
        if (index >= 0 && index < ySections.length) {
          ySections.delete(index, 1);
        }
      });
    },

    setSections(sections: Section[]) {
      doc.transact(() => {
        // Clear existing
        if (ySections.length > 0) {
          ySections.delete(0, ySections.length);
        }
        // Insert all
        for (const section of sections) {
          const yMap = sectionToYMap(doc, section);
          ySections.push([yMap]);
        }
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
// Presence types
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
// Collaboration status types
// ---------------------------------------------------------------------------

export type CollaborationStatus = 'disconnected' | 'connecting' | 'synced';
