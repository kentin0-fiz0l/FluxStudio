/**
 * Formation Version Service - FluxStudio Phase 9.2
 *
 * In-memory version history for formations with localStorage persistence.
 * Supports user-created checkpoints and automatic save points.
 */

import type { Formation, Keyframe, PathCurve, Position } from './formationTypes';

export interface FormationVersion {
  id: string;
  formationId: string;
  name: string;
  /** Snapshot of the full formation state */
  snapshot: Formation;
  createdAt: string;
  createdBy: string;
  /** Whether this is an auto-save or user-created checkpoint */
  type: 'auto' | 'checkpoint';
}

// ============================================================================
// Serialization helpers for Map<->Object conversion
// ============================================================================

/** Convert a Formation's Maps to plain objects for JSON storage */
function serializeFormation(formation: Formation): Record<string, unknown> {
  const plain = { ...formation } as Record<string, unknown>;
  plain.keyframes = formation.keyframes.map((kf) => ({
    ...kf,
    positions: Object.fromEntries(kf.positions),
    pathCurves: kf.pathCurves ? Object.fromEntries(kf.pathCurves) : undefined,
  }));
  return plain;
}

/** Restore Maps from plain-object keyframes loaded from JSON */
function deserializeFormation(raw: Record<string, unknown>): Formation {
  const formation = { ...raw } as unknown as Formation;
  const rawKeyframes = raw.keyframes as Array<Record<string, unknown>>;
  if (rawKeyframes) {
    formation.keyframes = rawKeyframes.map((kf) => {
      const positions = new Map<string, Position>(
        Object.entries((kf.positions as Record<string, Position>) ?? {}),
      );
      let pathCurves: Map<string, PathCurve> | undefined;
      if (kf.pathCurves && Object.keys(kf.pathCurves as object).length > 0) {
        pathCurves = new Map<string, PathCurve>(
          Object.entries(kf.pathCurves as Record<string, PathCurve>),
        );
      }
      return { ...kf, positions, pathCurves } as Keyframe;
    });
  }
  return formation;
}

// ============================================================================
// FormationVersionHistory
// ============================================================================

/**
 * In-memory version history for a formation.
 * Persists to localStorage for session continuity.
 */
export class FormationVersionHistory {
  private versions: FormationVersion[] = [];
  private formationId: string;
  private maxVersions: number;

  constructor(formationId: string, maxVersions = 50) {
    this.formationId = formationId;
    this.maxVersions = maxVersions;
    this.load();
  }

  /** Create a checkpoint (user-initiated save point) */
  createCheckpoint(formation: Formation, name: string, createdBy = ''): FormationVersion {
    const version: FormationVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      formationId: this.formationId,
      name,
      snapshot: structuredClone(formation),
      createdAt: new Date().toISOString(),
      createdBy,
      type: 'checkpoint',
    };
    this.versions.unshift(version);
    this.trimVersions();
    this.save();
    return version;
  }

  /** Auto-save a version (called on significant changes) */
  autoSave(formation: Formation, createdBy = ''): FormationVersion {
    const version: FormationVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      formationId: this.formationId,
      name: `Auto-save`,
      snapshot: structuredClone(formation),
      createdAt: new Date().toISOString(),
      createdBy,
      type: 'auto',
    };
    this.versions.unshift(version);
    this.trimVersions();
    this.save();
    return version;
  }

  /** Get all versions sorted by date (newest first) */
  getVersions(): FormationVersion[] {
    return [...this.versions];
  }

  /** Restore a specific version */
  getVersion(versionId: string): FormationVersion | null {
    return this.versions.find((v) => v.id === versionId) ?? null;
  }

  /** Delete a version */
  deleteVersion(versionId: string): void {
    this.versions = this.versions.filter((v) => v.id !== versionId);
    this.save();
  }

  /** Trim to max versions, keeping checkpoints preferentially */
  private trimVersions(): void {
    if (this.versions.length <= this.maxVersions) return;
    // Remove oldest auto-saves first, keep checkpoints longer
    const checkpoints = this.versions.filter((v) => v.type === 'checkpoint');
    const autos = this.versions.filter((v) => v.type === 'auto');
    while (checkpoints.length + autos.length > this.maxVersions && autos.length > 0) {
      autos.pop();
    }
    while (checkpoints.length + autos.length > this.maxVersions && checkpoints.length > 0) {
      checkpoints.pop();
    }
    this.versions = [...checkpoints, ...autos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /** Persist to localStorage */
  private save(): void {
    try {
      const key = `flux_formation_versions_${this.formationId}`;
      const serialized = this.versions.map((v) => ({
        ...v,
        snapshot: serializeFormation(v.snapshot),
      }));
      localStorage.setItem(key, JSON.stringify(serialized));
    } catch {
      // localStorage full or unavailable - silently degrade
      console.warn('FormationVersionHistory: failed to persist to localStorage');
    }
  }

  /** Load from localStorage */
  private load(): void {
    try {
      const key = `flux_formation_versions_${this.formationId}`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
      this.versions = parsed.map((entry) => ({
        ...entry,
        snapshot: deserializeFormation(entry.snapshot as Record<string, unknown>),
      })) as FormationVersion[];
    } catch {
      // Corrupt data - start fresh
      this.versions = [];
    }
  }
}
