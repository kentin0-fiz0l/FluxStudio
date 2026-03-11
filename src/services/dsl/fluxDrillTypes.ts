/**
 * FluxDrill DSL Types
 *
 * AST types for the FluxDrill notation language. These represent
 * the intermediate structure between Formation objects and the
 * human-readable DSL text output.
 */

/** Root node of a FluxDrill document */
export interface DslShow {
  name: string;
  field: string;
  bpm?: number;
  sections: DslSection[];
  sets: DslSet[];
}

/** A performer section declaration */
export interface DslSection {
  name: string;
  rangePrefix: string;
  rangeStart: number;
  rangeEnd: number;
  symbol?: string;
  color?: string;
}

/** A drill set */
export interface DslSet {
  name: string;
  counts: number;
  rehearsalMark?: string;
  notes?: string;
  placements: DslPlacement[];
  transition?: string;
}

/** A placement for a section or individual performer within a set */
export interface DslPlacement {
  /** Section name or individual performer ID */
  target: string;
  /** Detected shape, or 'explicit' for raw coordinates */
  shape: DslShape;
}

/** Shape types for placements */
export type DslShape =
  | { type: 'line'; from: DslFieldPos; to: DslFieldPos; spacing?: string }
  | { type: 'arc'; center: DslFieldPos; radius: number; startAngle?: number; endAngle?: number }
  | { type: 'circle'; center: DslFieldPos; radius: number }
  | { type: 'block'; topLeft: DslFieldPos; bottomRight: DslFieldPos; columns?: number }
  | { type: 'wedge'; tip: DslFieldPos; angle: number; depth: number }
  | { type: 'scatter'; center: DslFieldPos; radius: number }
  | { type: 'company_front'; yardLine: DslFieldPos; frontToBack: string }
  | { type: 'explicit'; positions: Array<{ id: string; pos: DslFieldPos }> };

/** Field position in drill notation */
export interface DslFieldPos {
  /** Side-to-side: e.g., "R35", "L20", "50" */
  sideToSide: string;
  /** Front-to-back: e.g., "front-hash", "4-behind-front-hash", "back-sideline" */
  frontToBack: string;
}
