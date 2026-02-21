/**
 * Formation Service - Flux Studio
 *
 * Main service for managing dance/marching formations.
 * Types: ./formationTypes.ts
 * Export utilities: ./formationExport.ts
 */

import { templateRegistry } from './formationTemplates/registry';
import {
  ApplyTemplateOptions,
  ApplyTemplateResult,
} from './formationTemplates/types';
import { exportToPdf, exportToImage, exportToSvg, exportToAnimation } from './formationExport';
import type {
  Position,
  Performer,
  Keyframe,
  Formation,
  FormationExportOptions,
  PlaybackState,
} from './formationTypes';

// Re-export all types for backward compatibility
export type {
  Position,
  Performer,
  TransitionType,
  Keyframe,
  AudioTrack,
  Formation,
  DrillSettings,
  FormationExportOptions,
  PlaybackState,
} from './formationTypes';

// ============================================================================
// FORMATION SERVICE CLASS
// ============================================================================

class FormationService {
  private formations: Map<string, Formation> = new Map();
  private playbackState: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    loop: false,
    speed: 1,
  };
  private playbackInterval: NodeJS.Timeout | null = null;

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  createFormation(
    name: string,
    projectId: string,
    options: Partial<Omit<Formation, 'id' | 'name' | 'projectId' | 'createdAt' | 'updatedAt'>> = {}
  ): Formation {
    const formation: Formation = {
      id: `formation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      projectId,
      stageWidth: options.stageWidth ?? 40,
      stageHeight: options.stageHeight ?? 30,
      gridSize: options.gridSize ?? 2,
      performers: options.performers ?? [],
      keyframes: options.keyframes ?? [],
      description: options.description,
      musicTrackUrl: options.musicTrackUrl,
      musicDuration: options.musicDuration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: options.createdBy ?? 'unknown',
    };

    if (formation.keyframes.length === 0) {
      formation.keyframes.push({
        id: `keyframe-${Date.now()}`,
        timestamp: 0,
        positions: new Map(),
        transition: 'linear',
      });
    }

    this.formations.set(formation.id, formation);
    return formation;
  }

  getFormation(id: string): Formation | undefined {
    return this.formations.get(id);
  }

  registerFormation(formation: Formation): Formation {
    const normalizedFormation: Formation = {
      ...formation,
      keyframes: formation.keyframes.map((kf) => ({
        ...kf,
        positions:
          kf.positions instanceof Map
            ? kf.positions
            : new Map(Object.entries(kf.positions || {})),
      })),
    };
    this.formations.set(normalizedFormation.id, normalizedFormation);
    return normalizedFormation;
  }

  updateFormation(id: string, updates: Partial<Formation>): Formation | undefined {
    const formation = this.formations.get(id);
    if (!formation) return undefined;

    const updated = {
      ...formation,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.formations.set(id, updated);
    return updated;
  }

  deleteFormation(id: string): boolean {
    return this.formations.delete(id);
  }

  listFormations(projectId: string): Formation[] {
    return Array.from(this.formations.values()).filter(
      (f) => f.projectId === projectId
    );
  }

  // ============================================================================
  // PERFORMER OPERATIONS
  // ============================================================================

  addPerformer(
    formationId: string,
    performer: Omit<Performer, 'id'>,
    initialPosition?: Position
  ): Performer | undefined {
    const formation = this.formations.get(formationId);
    if (!formation) return undefined;

    const newPerformer: Performer = {
      ...performer,
      id: `performer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    formation.performers.push(newPerformer);

    if (initialPosition && formation.keyframes.length > 0) {
      formation.keyframes[0].positions.set(newPerformer.id, initialPosition);
    }

    formation.updatedAt = new Date().toISOString();
    return newPerformer;
  }

  removePerformer(formationId: string, performerId: string): boolean {
    const formation = this.formations.get(formationId);
    if (!formation) return false;

    const index = formation.performers.findIndex((p) => p.id === performerId);
    if (index === -1) return false;

    formation.performers.splice(index, 1);
    formation.keyframes.forEach((kf) => {
      kf.positions.delete(performerId);
    });

    formation.updatedAt = new Date().toISOString();
    return true;
  }

  updatePerformer(
    formationId: string,
    performerId: string,
    updates: Partial<Performer>
  ): Performer | undefined {
    const formation = this.formations.get(formationId);
    if (!formation) return undefined;

    const performer = formation.performers.find((p) => p.id === performerId);
    if (!performer) return undefined;

    Object.assign(performer, updates);
    formation.updatedAt = new Date().toISOString();
    return performer;
  }

  // ============================================================================
  // KEYFRAME OPERATIONS
  // ============================================================================

  addKeyframe(
    formationId: string,
    timestamp: number,
    positions?: Map<string, Position>,
    options?: { transition?: Keyframe['transition']; duration?: number }
  ): Keyframe | undefined {
    const formation = this.formations.get(formationId);
    if (!formation) return undefined;

    const keyframe: Keyframe = {
      id: `keyframe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      positions: positions ?? new Map(),
      transition: options?.transition ?? 'linear',
      duration: options?.duration,
    };

    const insertIndex = formation.keyframes.findIndex((kf) => kf.timestamp > timestamp);
    if (insertIndex === -1) {
      formation.keyframes.push(keyframe);
    } else {
      formation.keyframes.splice(insertIndex, 0, keyframe);
    }

    formation.updatedAt = new Date().toISOString();
    return keyframe;
  }

  removeKeyframe(formationId: string, keyframeId: string): boolean {
    const formation = this.formations.get(formationId);
    if (!formation) return false;

    if (formation.keyframes.length <= 1) return false;
    if (formation.keyframes[0].id === keyframeId) return false;

    const index = formation.keyframes.findIndex((kf) => kf.id === keyframeId);
    if (index === -1) return false;

    formation.keyframes.splice(index, 1);
    formation.updatedAt = new Date().toISOString();
    return true;
  }

  updatePosition(
    formationId: string,
    keyframeId: string,
    performerId: string,
    position: Position
  ): boolean {
    const formation = this.formations.get(formationId);
    if (!formation) return false;

    const keyframe = formation.keyframes.find((kf) => kf.id === keyframeId);
    if (!keyframe) return false;

    keyframe.positions.set(performerId, position);
    formation.updatedAt = new Date().toISOString();
    return true;
  }

  getPositionsAtTime(formationId: string, time: number): Map<string, Position> {
    const formation = this.formations.get(formationId);
    if (!formation || formation.keyframes.length === 0) {
      return new Map();
    }

    let prevKeyframe = formation.keyframes[0];
    let nextKeyframe = formation.keyframes[0];

    for (let i = 0; i < formation.keyframes.length; i++) {
      if (formation.keyframes[i].timestamp <= time) {
        prevKeyframe = formation.keyframes[i];
      }
      if (formation.keyframes[i].timestamp >= time) {
        nextKeyframe = formation.keyframes[i];
        break;
      }
    }

    if (prevKeyframe.id === nextKeyframe.id || prevKeyframe.timestamp === time) {
      return new Map(prevKeyframe.positions);
    }

    const progress =
      (time - prevKeyframe.timestamp) / (nextKeyframe.timestamp - prevKeyframe.timestamp);
    const easedProgress = this.applyEasing(progress, nextKeyframe.transition ?? 'linear');

    const interpolatedPositions = new Map<string, Position>();
    const performerIds = new Set([
      ...prevKeyframe.positions.keys(),
      ...nextKeyframe.positions.keys(),
    ]);

    for (const performerId of performerIds) {
      const prevPos = prevKeyframe.positions.get(performerId);
      const nextPos = nextKeyframe.positions.get(performerId);

      if (prevPos && nextPos) {
        interpolatedPositions.set(performerId, {
          x: prevPos.x + (nextPos.x - prevPos.x) * easedProgress,
          y: prevPos.y + (nextPos.y - prevPos.y) * easedProgress,
          rotation: this.interpolateRotation(
            prevPos.rotation ?? 0,
            nextPos.rotation ?? 0,
            easedProgress
          ),
        });
      } else if (prevPos) {
        interpolatedPositions.set(performerId, { ...prevPos });
      } else if (nextPos) {
        interpolatedPositions.set(performerId, { ...nextPos });
      }
    }

    return interpolatedPositions;
  }

  // ============================================================================
  // TEMPLATE APPLICATION
  // ============================================================================

  applyTemplate(options: ApplyTemplateOptions): ApplyTemplateResult {
    const formation = this.formations.get(options.formationId);
    if (!formation) {
      return {
        success: false,
        keyframesCreated: 0,
        performersCreated: 0,
        performersMapped: new Map(),
        error: 'Formation not found',
      };
    }

    const template = templateRegistry.getTemplate(options.templateId);
    if (!template) {
      return {
        success: false,
        keyframesCreated: 0,
        performersCreated: 0,
        performersMapped: new Map(),
        error: 'Template not found',
      };
    }

    const performerCount = formation.performers.length;
    const minPerformers = template.parameters.minPerformers;
    const maxPerformers = template.parameters.maxPerformers;

    if (performerCount < minPerformers && !options.createMissingPerformers) {
      return {
        success: false,
        keyframesCreated: 0,
        performersCreated: 0,
        performersMapped: new Map(),
        error: `Template requires at least ${minPerformers} performers, but only ${performerCount} exist`,
      };
    }

    const targetCount = Math.min(
      Math.max(performerCount, minPerformers),
      maxPerformers || performerCount
    );
    const templatePositions = templateRegistry.scaleTemplateForPerformers(
      template,
      targetCount
    );

    let performersCreated = 0;
    if (options.createMissingPerformers && performerCount < minPerformers) {
      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
      for (let i = performerCount; i < minPerformers; i++) {
        const newPerformer: Performer = {
          id: `performer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: `Performer ${i + 1}`,
          label: String(i + 1),
          color: colors[i % colors.length],
        };
        formation.performers.push(newPerformer);
        performersCreated++;
      }
    }

    const scale = options.scale ?? 1;
    const rotation = options.rotation ?? 0;
    const centerX = options.centerX ?? 50;
    const centerY = options.centerY ?? 50;
    const mirror = options.mirror ?? 'none';

    const transformedPositions = templatePositions.map((pos) => {
      let x = pos.x;
      let y = pos.y;

      if (mirror === 'horizontal' || mirror === 'both') x = 100 - x;
      if (mirror === 'vertical' || mirror === 'both') y = 100 - y;

      const dx = x - 50;
      const dy = y - 50;
      const scaledDx = dx * scale;
      const scaledDy = dy * scale;

      const rotationRad = (rotation * Math.PI) / 180;
      const rotatedDx = scaledDx * Math.cos(rotationRad) - scaledDy * Math.sin(rotationRad);
      const rotatedDy = scaledDx * Math.sin(rotationRad) + scaledDy * Math.cos(rotationRad);

      return {
        x: Math.max(0, Math.min(100, centerX + rotatedDx)),
        y: Math.max(0, Math.min(100, centerY + rotatedDy)),
        rotation: pos.rotation,
      };
    });

    const performerMapping = options.performerMapping ?? new Map();
    const actualMapping = new Map<number, string>();

    for (let i = 0; i < transformedPositions.length && i < formation.performers.length; i++) {
      const performerId = performerMapping.get(i) ?? formation.performers[i].id;
      actualMapping.set(i, performerId);
    }

    const positions = new Map<string, Position>();
    actualMapping.forEach((performerId, templateIndex) => {
      if (templateIndex < transformedPositions.length) {
        positions.set(performerId, transformedPositions[templateIndex]);
      }
    });

    let insertTimestamp: number;
    if (options.insertAt === 'end') {
      const lastKf = formation.keyframes[formation.keyframes.length - 1];
      insertTimestamp = lastKf ? lastKf.timestamp + 2000 : 0;
    } else if (typeof options.insertAt === 'number') {
      insertTimestamp = options.insertAt;
    } else {
      insertTimestamp = this.playbackState.currentTime || (
        formation.keyframes.length > 0
          ? formation.keyframes[formation.keyframes.length - 1].timestamp + 2000
          : 0
      );
    }

    if (options.replaceExisting) {
      formation.keyframes = [];
    }

    const keyframe = this.addKeyframe(
      options.formationId,
      insertTimestamp,
      positions,
      { transition: 'ease-in-out' }
    );

    formation.updatedAt = new Date().toISOString();

    return {
      success: true,
      keyframesCreated: keyframe ? 1 : 0,
      performersCreated,
      performersMapped: actualMapping,
    };
  }

  // ============================================================================
  // PATH CALCULATION
  // ============================================================================

  getPerformerPath(
    formationId: string,
    performerId: string,
    startKeyframeIndex: number = 0,
    endKeyframeIndex?: number,
    pointsPerSegment: number = 15
  ): { time: number; position: Position }[] {
    const formation = this.formations.get(formationId);
    if (!formation || formation.keyframes.length === 0) {
      return [];
    }

    const endIdx = endKeyframeIndex ?? formation.keyframes.length - 1;
    const path: { time: number; position: Position }[] = [];

    for (let i = startKeyframeIndex; i < endIdx && i < formation.keyframes.length - 1; i++) {
      const startKf = formation.keyframes[i];
      const endKf = formation.keyframes[i + 1];

      const startPos = startKf.positions.get(performerId);
      const endPos = endKf.positions.get(performerId);

      if (!startPos || !endPos) continue;

      const timeDelta = endKf.timestamp - startKf.timestamp;
      const easing = endKf.transition ?? 'linear';

      for (let j = 0; j < pointsPerSegment; j++) {
        const t = j / pointsPerSegment;
        const easedT = this.applyEasing(t, easing);
        const time = startKf.timestamp + timeDelta * t;

        path.push({
          time,
          position: {
            x: startPos.x + (endPos.x - startPos.x) * easedT,
            y: startPos.y + (endPos.y - startPos.y) * easedT,
            rotation: this.interpolateRotation(
              startPos.rotation ?? 0,
              endPos.rotation ?? 0,
              easedT
            ),
          },
        });
      }
    }

    const lastKf = formation.keyframes[Math.min(endIdx, formation.keyframes.length - 1)];
    const lastPos = lastKf.positions.get(performerId);
    if (lastPos) {
      path.push({ time: lastKf.timestamp, position: lastPos });
    }

    return path;
  }

  getAllPerformerPaths(
    formationId: string,
    pointsPerSegment: number = 15
  ): Map<string, { time: number; position: Position }[]> {
    const formation = this.formations.get(formationId);
    if (!formation) return new Map();

    const paths = new Map<string, { time: number; position: Position }[]>();
    for (const performer of formation.performers) {
      const path = this.getPerformerPath(formationId, performer.id, 0, undefined, pointsPerSegment);
      if (path.length > 0) paths.set(performer.id, path);
    }
    return paths;
  }

  // ============================================================================
  // PLAYBACK CONTROL
  // ============================================================================

  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  play(formationId: string, onUpdate?: (time: number) => void): void {
    const formation = this.formations.get(formationId);
    if (!formation) return;

    this.playbackState.isPlaying = true;
    this.playbackState.duration = this.getFormationDuration(formationId);

    const startTime = Date.now() - this.playbackState.currentTime;

    this.playbackInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) * this.playbackState.speed;
      this.playbackState.currentTime = elapsed;

      if (elapsed >= this.playbackState.duration) {
        if (this.playbackState.loop) {
          this.playbackState.currentTime = 0;
          onUpdate?.(0);
        } else {
          this.pause();
        }
      } else {
        onUpdate?.(elapsed);
      }
    }, 1000 / 60);
  }

  pause(): void {
    this.playbackState.isPlaying = false;
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  stop(): void {
    this.pause();
    this.playbackState.currentTime = 0;
  }

  seek(time: number): void {
    this.playbackState.currentTime = Math.max(0, Math.min(time, this.playbackState.duration));
  }

  setSpeed(speed: number): void {
    this.playbackState.speed = Math.max(0.25, Math.min(speed, 4));
  }

  toggleLoop(): boolean {
    this.playbackState.loop = !this.playbackState.loop;
    return this.playbackState.loop;
  }

  // ============================================================================
  // EXPORT OPERATIONS (delegated to formationExport.ts)
  // ============================================================================

  async exportFormation(
    formationId: string,
    options: FormationExportOptions
  ): Promise<Blob | null> {
    const formation = this.formations.get(formationId);
    if (!formation) return null;

    switch (options.format) {
      case 'pdf':
        return exportToPdf(formation, options);
      case 'png':
      case 'jpg':
        return exportToImage(formation, options);
      case 'svg':
        return exportToSvg(formation, options);
      case 'video':
      case 'gif':
        return exportToAnimation(
          formation,
          options,
          (fId, time) => this.getPositionsAtTime(fId, time),
          (fId) => this.getFormationDuration(fId)
        );
      default:
        return null;
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private getFormationDuration(formationId: string): number {
    const formation = this.formations.get(formationId);
    if (!formation || formation.keyframes.length === 0) return 0;

    const lastKeyframe = formation.keyframes[formation.keyframes.length - 1];
    return lastKeyframe.timestamp + (lastKeyframe.duration ?? 0);
  }

  private applyEasing(t: number, easing: Keyframe['transition']): number {
    switch (easing) {
      case 'ease':
        return t * t * (3 - 2 * t);
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return t * (2 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'linear':
      default:
        return t;
    }
  }

  private interpolateRotation(from: number, to: number, t: number): number {
    let diff = to - from;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (from + diff * t + 360) % 360;
  }
}

// Export singleton instance
export const formationService = new FormationService();
export default formationService;
