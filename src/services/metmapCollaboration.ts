/**
 * MetMap Collaboration — Yjs Binding for Real-Time Collaborative Editing
 *
 * Sprint 30: Upgraded from Sprint 29 PoC mock interfaces to real Y.Doc.
 * Sprint 31: Granular chord/animation Y.Arrays, new CRUD methods.
 */

import * as Y from 'yjs';
import type { Section, Chord, Animation, Keyframe } from '../contexts/metmap/types';

// ---------------------------------------------------------------------------
// Converters: MetMap state ↔ Yjs shared types
// ---------------------------------------------------------------------------

/**
 * Convert a Chord to a Y.Map.
 */
function chordToYMap(chord: Chord): Y.Map<unknown> {
  const yMap = new Y.Map<unknown>();
  yMap.set('id', chord.id ?? null);
  yMap.set('sectionId', chord.sectionId ?? null);
  yMap.set('bar', chord.bar);
  yMap.set('beat', chord.beat);
  yMap.set('symbol', chord.symbol);
  yMap.set('durationBeats', chord.durationBeats);
  if (chord.voicing) yMap.set('voicing', JSON.stringify(chord.voicing));
  return yMap;
}

/**
 * Convert a Y.Map to a Chord.
 */
function yMapToChord(yMap: Y.Map<unknown>): Chord {
  const data = yMap.toJSON();
  return {
    id: data.id as string | undefined,
    sectionId: data.sectionId as string | undefined,
    bar: (data.bar as number) || 1,
    beat: (data.beat as number) || 1,
    symbol: (data.symbol as string) || 'C',
    durationBeats: (data.durationBeats as number) || 1,
    voicing: data.voicing ? JSON.parse(data.voicing as string) : undefined,
  };
}

/**
 * Convert a Keyframe to a Y.Map.
 */
function keyframeToYMap(kf: Keyframe): Y.Map<unknown> {
  const yMap = new Y.Map<unknown>();
  yMap.set('id', kf.id);
  yMap.set('time', kf.time);
  yMap.set('value', kf.value);
  yMap.set('easing', kf.easing);
  if (kf.bezierHandles) {
    yMap.set('bezierHandles', JSON.stringify(kf.bezierHandles));
  }
  return yMap;
}

/**
 * Convert a Y.Map to a Keyframe.
 */
function yMapToKeyframe(yMap: Y.Map<unknown>): Keyframe {
  const data = yMap.toJSON();
  return {
    id: data.id as string,
    time: data.time as number,
    value: data.value as number,
    easing: (data.easing as Keyframe['easing']) || 'linear',
    bezierHandles: data.bezierHandles ? JSON.parse(data.bezierHandles as string) : undefined,
  };
}

/**
 * Convert an Animation to a Y.Map with Y.Array<Y.Map> keyframes.
 */
function animationToYMap(anim: Animation): Y.Map<unknown> {
  const yMap = new Y.Map<unknown>();
  yMap.set('id', anim.id);
  yMap.set('property', anim.property);
  yMap.set('enabled', anim.enabled);
  const yKeyframes = new Y.Array<Y.Map<unknown>>();
  for (const kf of anim.keyframes || []) {
    yKeyframes.push([keyframeToYMap(kf)]);
  }
  yMap.set('keyframes', yKeyframes);
  return yMap;
}

/**
 * Convert a Y.Map to an Animation.
 */
function yMapToAnimation(yMap: Y.Map<unknown>): Animation {
  const data: Record<string, unknown> = {};
  yMap.forEach((value, key) => {
    data[key] = value;
  });

  const keyframes: Keyframe[] = [];
  const yKeyframes = data.keyframes;
  if (yKeyframes instanceof Y.Array) {
    for (let i = 0; i < yKeyframes.length; i++) {
      const item = yKeyframes.get(i);
      if (item instanceof Y.Map) {
        keyframes.push(yMapToKeyframe(item));
      }
    }
  }

  return {
    id: data.id as string,
    property: data.property as Animation['property'],
    enabled: (data.enabled as boolean) ?? true,
    keyframes,
  };
}

/**
 * Convert a MetMap Section to a Y.Map.
 * Chords and animations are stored as Y.Array<Y.Map> for granular collaboration.
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

  // Granular chords (Sprint 31)
  const yChords = new Y.Array<Y.Map<unknown>>();
  for (const chord of section.chords || []) {
    yChords.push([chordToYMap(chord)]);
  }
  yMap.set('chords', yChords);

  // Granular animations (Sprint 31)
  const yAnimations = new Y.Array<Y.Map<unknown>>();
  for (const anim of section.animations || []) {
    yAnimations.push([animationToYMap(anim)]);
  }
  yMap.set('animations', yAnimations);

  return yMap;
}

/**
 * Convert a Y.Map to a MetMap Section.
 * Supports both Y.Array (Sprint 31+) and JSON string (Sprint 30 legacy) formats.
 */
export function yMapToSection(yMap: Y.Map<unknown>): Section {
  const data: Record<string, unknown> = {};
  yMap.forEach((value, key) => {
    data[key] = value;
  });

  // Parse chords — support both Y.Array and legacy JSON string
  let chords: Chord[] = [];
  const rawChords = data.chords;
  if (rawChords instanceof Y.Array) {
    for (let i = 0; i < rawChords.length; i++) {
      const item = rawChords.get(i);
      if (item instanceof Y.Map) {
        chords.push(yMapToChord(item));
      }
    }
  } else if (typeof rawChords === 'string') {
    try { chords = JSON.parse(rawChords); } catch { chords = []; }
  }

  // Parse animations — support both Y.Array and legacy JSON string
  let animations: Animation[] = [];
  const rawAnimations = data.animations;
  if (rawAnimations instanceof Y.Array) {
    for (let i = 0; i < rawAnimations.length; i++) {
      const item = rawAnimations.get(i);
      if (item instanceof Y.Map) {
        animations.push(yMapToAnimation(item));
      }
    }
  } else if (typeof rawAnimations === 'string') {
    try { animations = JSON.parse(rawAnimations); } catch { animations = []; }
  }

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
    chords,
    animations,
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

  /** Update a single chord within a section. */
  updateChord(sectionIndex: number, chordIndex: number, chord: Chord): void;

  /** Add a chord to a section. */
  addChord(sectionIndex: number, chord: Chord): void;

  /** Remove a chord from a section. */
  removeChord(sectionIndex: number, chordIndex: number): void;

  /** Update a single animation within a section. */
  updateAnimation(sectionIndex: number, animationIndex: number, animation: Animation): void;

  /** Add an animation to a section. */
  addAnimation(sectionIndex: number, animation: Animation): void;

  /** Remove an animation from a section. */
  removeAnimation(sectionIndex: number, animationIndex: number): void;

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

  function getYSection(index: number): Y.Map<unknown> | null {
    const ySection = ySections.get(index);
    if (!ySection || !(ySection instanceof Y.Map)) return null;
    return ySection;
  }

  function getYChords(ySection: Y.Map<unknown>): Y.Array<Y.Map<unknown>> | null {
    const chords = ySection.get('chords');
    if (chords instanceof Y.Array) return chords;
    return null;
  }

  function getYAnimations(ySection: Y.Map<unknown>): Y.Array<Y.Map<unknown>> | null {
    const anims = ySection.get('animations');
    if (anims instanceof Y.Array) return anims;
    return null;
  }

  return {
    getSections: readSections,

    updateSection(index: number, section: Section) {
      doc.transact(() => {
        const ySection = getYSection(index);
        if (!ySection) return;
        ySection.set('id', section.id);
        ySection.set('name', section.name);
        ySection.set('bars', section.bars);
        ySection.set('timeSignature', section.timeSignature);
        ySection.set('tempoStart', section.tempoStart);
        ySection.set('tempoEnd', section.tempoEnd ?? null);
        ySection.set('tempoCurve', section.tempoCurve ?? null);
        ySection.set('startBar', section.startBar);
        ySection.set('orderIndex', section.orderIndex);

        // Replace chords array
        const existingChords = getYChords(ySection);
        if (existingChords) {
          if (existingChords.length > 0) existingChords.delete(0, existingChords.length);
          for (const chord of section.chords || []) {
            existingChords.push([chordToYMap(chord)]);
          }
        } else {
          const yChords = new Y.Array<Y.Map<unknown>>();
          for (const chord of section.chords || []) {
            yChords.push([chordToYMap(chord)]);
          }
          ySection.set('chords', yChords);
        }

        // Replace animations array
        const existingAnims = getYAnimations(ySection);
        if (existingAnims) {
          if (existingAnims.length > 0) existingAnims.delete(0, existingAnims.length);
          for (const anim of section.animations || []) {
            existingAnims.push([animationToYMap(anim)]);
          }
        } else {
          const yAnimations = new Y.Array<Y.Map<unknown>>();
          for (const anim of section.animations || []) {
            yAnimations.push([animationToYMap(anim)]);
          }
          ySection.set('animations', yAnimations);
        }
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
        if (ySections.length > 0) {
          ySections.delete(0, ySections.length);
        }
        for (const section of sections) {
          const yMap = sectionToYMap(doc, section);
          ySections.push([yMap]);
        }
      });
    },

    // ==================== Granular Chord Operations ====================

    updateChord(sectionIndex: number, chordIndex: number, chord: Chord) {
      doc.transact(() => {
        const ySection = getYSection(sectionIndex);
        if (!ySection) return;
        const yChords = getYChords(ySection);
        if (!yChords || chordIndex < 0 || chordIndex >= yChords.length) return;
        const yChord = yChords.get(chordIndex);
        if (!(yChord instanceof Y.Map)) return;
        yChord.set('id', chord.id ?? null);
        yChord.set('bar', chord.bar);
        yChord.set('beat', chord.beat);
        yChord.set('symbol', chord.symbol);
        yChord.set('durationBeats', chord.durationBeats);
        if (chord.voicing) yChord.set('voicing', JSON.stringify(chord.voicing));
      });
    },

    addChord(sectionIndex: number, chord: Chord) {
      doc.transact(() => {
        const ySection = getYSection(sectionIndex);
        if (!ySection) return;
        let yChords = getYChords(ySection);
        if (!yChords) {
          yChords = new Y.Array<Y.Map<unknown>>();
          ySection.set('chords', yChords);
        }
        yChords.push([chordToYMap(chord)]);
      });
    },

    removeChord(sectionIndex: number, chordIndex: number) {
      doc.transact(() => {
        const ySection = getYSection(sectionIndex);
        if (!ySection) return;
        const yChords = getYChords(ySection);
        if (!yChords || chordIndex < 0 || chordIndex >= yChords.length) return;
        yChords.delete(chordIndex, 1);
      });
    },

    // ==================== Granular Animation Operations ====================

    updateAnimation(sectionIndex: number, animationIndex: number, animation: Animation) {
      doc.transact(() => {
        const ySection = getYSection(sectionIndex);
        if (!ySection) return;
        const yAnims = getYAnimations(ySection);
        if (!yAnims || animationIndex < 0 || animationIndex >= yAnims.length) return;
        const yAnim = yAnims.get(animationIndex);
        if (!(yAnim instanceof Y.Map)) return;
        yAnim.set('id', animation.id);
        yAnim.set('property', animation.property);
        yAnim.set('enabled', animation.enabled);
        // Replace keyframes
        let yKeyframes = yAnim.get('keyframes');
        if (yKeyframes instanceof Y.Array) {
          if (yKeyframes.length > 0) yKeyframes.delete(0, yKeyframes.length);
        } else {
          yKeyframes = new Y.Array<Y.Map<unknown>>();
          yAnim.set('keyframes', yKeyframes);
        }
        for (const kf of animation.keyframes || []) {
          (yKeyframes as Y.Array<Y.Map<unknown>>).push([keyframeToYMap(kf)]);
        }
      });
    },

    addAnimation(sectionIndex: number, animation: Animation) {
      doc.transact(() => {
        const ySection = getYSection(sectionIndex);
        if (!ySection) return;
        let yAnims = getYAnimations(ySection);
        if (!yAnims) {
          yAnims = new Y.Array<Y.Map<unknown>>();
          ySection.set('animations', yAnims);
        }
        yAnims.push([animationToYMap(animation)]);
      });
    },

    removeAnimation(sectionIndex: number, animationIndex: number) {
      doc.transact(() => {
        const ySection = getYSection(sectionIndex);
        if (!ySection) return;
        const yAnims = getYAnimations(ySection);
        if (!yAnims || animationIndex < 0 || animationIndex >= yAnims.length) return;
        yAnims.delete(animationIndex, 1);
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
  avatar?: string;
  editingSection: string | null;
  selectedKeyframe: string | null;
  cursorBar: number | null;
  lastActive: number;
}

// ---------------------------------------------------------------------------
// Collaboration status types
// ---------------------------------------------------------------------------

export type CollaborationStatus = 'disconnected' | 'connecting' | 'synced';
