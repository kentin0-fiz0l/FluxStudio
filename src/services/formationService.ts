/**
 * Formation Service - Flux Studio
 *
 * Service for managing dance/marching formations with performer positioning,
 * keyframe animations, and timeline management.
 */

import { jsPDF } from 'jspdf';
import { templateRegistry } from './formationTemplates/registry';
import {
  ApplyTemplateOptions,
  ApplyTemplateResult,
} from './formationTemplates/types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Position {
  x: number; // Grid position X (0-100 normalized)
  y: number; // Grid position Y (0-100 normalized)
  rotation?: number; // Rotation in degrees (0-360)
}

export interface Performer {
  id: string;
  name: string;
  label: string; // Short label shown on marker (e.g., "A1", "S2")
  color: string; // Marker color
  group?: string; // Group name for filtering
}

export type TransitionType = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface Keyframe {
  id: string;
  timestamp: number; // Time in milliseconds
  positions: Map<string, Position>; // performerId -> position
  transition?: TransitionType;
  duration?: number; // Duration to reach this keyframe from previous
}

export interface AudioTrack {
  id: string;
  url: string;
  filename: string;
  duration: number; // Duration in milliseconds
  waveformData?: number[]; // Optional waveform visualization data
}

export interface Formation {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  stageWidth: number; // Stage width in feet/meters
  stageHeight: number; // Stage height in feet/meters
  gridSize: number; // Grid cell size
  performers: Performer[];
  keyframes: Keyframe[];
  audioTrack?: AudioTrack; // Audio track for sync
  musicTrackUrl?: string; // Deprecated - use audioTrack.url
  musicDuration?: number; // Deprecated - use audioTrack.duration
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface FormationExportOptions {
  format: 'pdf' | 'png' | 'jpg' | 'svg' | 'video' | 'gif';
  includeGrid: boolean;
  includeLabels: boolean;
  includeTimestamps: boolean;
  paperSize?: 'letter' | 'a4' | 'tabloid';
  orientation?: 'portrait' | 'landscape';
  quality?: number; // 1-100 for image exports
  fps?: number; // For video/gif exports
  resolution?: { width: number; height: number };
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loop: boolean;
  speed: number; // Playback speed multiplier
}

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

  /**
   * Create a new formation
   */
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

    // Create initial keyframe if none provided
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

  /**
   * Get a formation by ID
   */
  getFormation(id: string): Formation | undefined {
    return this.formations.get(id);
  }

  /**
   * Register an existing formation (e.g., loaded from API)
   * This stores the formation in the service's internal Map for operations like addPerformer
   * Normalizes positions from plain objects to Maps if needed (API returns plain objects)
   */
  registerFormation(formation: Formation): Formation {
    // Normalize keyframe positions: API returns plain objects, we need Maps
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

  /**
   * Update a formation
   */
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

  /**
   * Delete a formation
   */
  deleteFormation(id: string): boolean {
    return this.formations.delete(id);
  }

  /**
   * List formations for a project
   */
  listFormations(projectId: string): Formation[] {
    return Array.from(this.formations.values()).filter(
      (f) => f.projectId === projectId
    );
  }

  // ============================================================================
  // PERFORMER OPERATIONS
  // ============================================================================

  /**
   * Add a performer to a formation
   */
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

    // Add initial position to first keyframe
    if (initialPosition && formation.keyframes.length > 0) {
      formation.keyframes[0].positions.set(newPerformer.id, initialPosition);
    }

    formation.updatedAt = new Date().toISOString();
    return newPerformer;
  }

  /**
   * Remove a performer from a formation
   */
  removePerformer(formationId: string, performerId: string): boolean {
    const formation = this.formations.get(formationId);
    if (!formation) return false;

    const index = formation.performers.findIndex((p) => p.id === performerId);
    if (index === -1) return false;

    formation.performers.splice(index, 1);

    // Remove from all keyframes
    formation.keyframes.forEach((kf) => {
      kf.positions.delete(performerId);
    });

    formation.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Update a performer
   */
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

  /**
   * Add a keyframe
   */
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

    // Insert in sorted order by timestamp
    const insertIndex = formation.keyframes.findIndex((kf) => kf.timestamp > timestamp);
    if (insertIndex === -1) {
      formation.keyframes.push(keyframe);
    } else {
      formation.keyframes.splice(insertIndex, 0, keyframe);
    }

    formation.updatedAt = new Date().toISOString();
    return keyframe;
  }

  /**
   * Remove a keyframe
   */
  removeKeyframe(formationId: string, keyframeId: string): boolean {
    const formation = this.formations.get(formationId);
    if (!formation) return false;

    // Don't allow removing the first keyframe
    if (formation.keyframes.length <= 1) return false;
    if (formation.keyframes[0].id === keyframeId) return false;

    const index = formation.keyframes.findIndex((kf) => kf.id === keyframeId);
    if (index === -1) return false;

    formation.keyframes.splice(index, 1);
    formation.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Update performer position in a keyframe
   */
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

  /**
   * Get interpolated positions at a specific time
   */
  getPositionsAtTime(formationId: string, time: number): Map<string, Position> {
    const formation = this.formations.get(formationId);
    if (!formation || formation.keyframes.length === 0) {
      return new Map();
    }

    // Find surrounding keyframes
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

    // If same keyframe or at exact keyframe time
    if (prevKeyframe.id === nextKeyframe.id || prevKeyframe.timestamp === time) {
      return new Map(prevKeyframe.positions);
    }

    // Interpolate between keyframes
    const progress =
      (time - prevKeyframe.timestamp) / (nextKeyframe.timestamp - prevKeyframe.timestamp);
    const easedProgress = this.applyEasing(progress, nextKeyframe.transition ?? 'linear');

    const interpolatedPositions = new Map<string, Position>();

    // Get all performer IDs from both keyframes
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

  /**
   * Apply a formation template to create a new keyframe
   */
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

    // Check performer count
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

    // Get template positions scaled for performer count
    const targetCount = Math.min(
      Math.max(performerCount, minPerformers),
      maxPerformers || performerCount
    );
    const templatePositions = templateRegistry.scaleTemplateForPerformers(
      template,
      targetCount
    );

    // Create missing performers if needed
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

    // Apply transformations to positions
    const scale = options.scale ?? 1;
    const rotation = options.rotation ?? 0;
    const centerX = options.centerX ?? 50;
    const centerY = options.centerY ?? 50;
    const mirror = options.mirror ?? 'none';

    const transformedPositions = templatePositions.map((pos) => {
      // Start with template position
      let x = pos.x;
      let y = pos.y;

      // Apply mirroring
      if (mirror === 'horizontal' || mirror === 'both') {
        x = 100 - x;
      }
      if (mirror === 'vertical' || mirror === 'both') {
        y = 100 - y;
      }

      // Translate to center, apply scale and rotation, translate back
      const dx = x - 50;
      const dy = y - 50;
      const scaledDx = dx * scale;
      const scaledDy = dy * scale;

      const rotationRad = (rotation * Math.PI) / 180;
      const rotatedDx = scaledDx * Math.cos(rotationRad) - scaledDy * Math.sin(rotationRad);
      const rotatedDy = scaledDx * Math.sin(rotationRad) + scaledDy * Math.cos(rotationRad);

      const finalX = centerX + rotatedDx;
      const finalY = centerY + rotatedDy;

      // Clamp to valid range
      return {
        x: Math.max(0, Math.min(100, finalX)),
        y: Math.max(0, Math.min(100, finalY)),
        rotation: pos.rotation,
      };
    });

    // Create performer mapping
    const performerMapping = options.performerMapping ?? new Map();
    const actualMapping = new Map<number, string>();

    for (let i = 0; i < transformedPositions.length && i < formation.performers.length; i++) {
      const performerId = performerMapping.get(i) ?? formation.performers[i].id;
      actualMapping.set(i, performerId);
    }

    // Create new keyframe with template positions
    const positions = new Map<string, Position>();
    actualMapping.forEach((performerId, templateIndex) => {
      if (templateIndex < transformedPositions.length) {
        positions.set(performerId, transformedPositions[templateIndex]);
      }
    });

    // Determine where to insert the keyframe
    let insertTimestamp: number;
    if (options.insertAt === 'end') {
      const lastKf = formation.keyframes[formation.keyframes.length - 1];
      insertTimestamp = lastKf ? lastKf.timestamp + 2000 : 0;
    } else if (typeof options.insertAt === 'number') {
      insertTimestamp = options.insertAt;
    } else {
      // 'current' - use current playback time or last keyframe + 2 seconds
      insertTimestamp = this.playbackState.currentTime || (
        formation.keyframes.length > 0
          ? formation.keyframes[formation.keyframes.length - 1].timestamp + 2000
          : 0
      );
    }

    // Replace existing keyframes if requested
    if (options.replaceExisting) {
      formation.keyframes = [];
    }

    // Add the keyframe
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

  /**
   * Get the interpolated path for a performer between keyframes
   * Returns an array of positions representing the travel path
   */
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

    // Iterate through keyframe pairs
    for (let i = startKeyframeIndex; i < endIdx && i < formation.keyframes.length - 1; i++) {
      const startKf = formation.keyframes[i];
      const endKf = formation.keyframes[i + 1];

      const startPos = startKf.positions.get(performerId);
      const endPos = endKf.positions.get(performerId);

      if (!startPos || !endPos) continue;

      const timeDelta = endKf.timestamp - startKf.timestamp;
      const easing = endKf.transition ?? 'linear';

      // Generate intermediate points
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

    // Add final keyframe position
    const lastKf = formation.keyframes[Math.min(endIdx, formation.keyframes.length - 1)];
    const lastPos = lastKf.positions.get(performerId);
    if (lastPos) {
      path.push({
        time: lastKf.timestamp,
        position: lastPos,
      });
    }

    return path;
  }

  /**
   * Get all performer paths for the formation
   * Returns a map of performerId -> path array
   */
  getAllPerformerPaths(
    formationId: string,
    pointsPerSegment: number = 15
  ): Map<string, { time: number; position: Position }[]> {
    const formation = this.formations.get(formationId);
    if (!formation) {
      return new Map();
    }

    const paths = new Map<string, { time: number; position: Position }[]>();

    for (const performer of formation.performers) {
      const path = this.getPerformerPath(
        formationId,
        performer.id,
        0,
        undefined,
        pointsPerSegment
      );
      if (path.length > 0) {
        paths.set(performer.id, path);
      }
    }

    return paths;
  }

  // ============================================================================
  // PLAYBACK CONTROL
  // ============================================================================

  /**
   * Get playback state
   */
  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  /**
   * Start playback
   */
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
    }, 1000 / 60); // 60fps
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.playbackState.isPlaying = false;
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  /**
   * Stop playback (reset to start)
   */
  stop(): void {
    this.pause();
    this.playbackState.currentTime = 0;
  }

  /**
   * Seek to a specific time
   */
  seek(time: number): void {
    this.playbackState.currentTime = Math.max(0, Math.min(time, this.playbackState.duration));
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: number): void {
    this.playbackState.speed = Math.max(0.25, Math.min(speed, 4));
  }

  /**
   * Toggle loop
   */
  toggleLoop(): boolean {
    this.playbackState.loop = !this.playbackState.loop;
    return this.playbackState.loop;
  }

  // ============================================================================
  // EXPORT OPERATIONS
  // ============================================================================

  /**
   * Export formation to various formats
   */
  async exportFormation(
    formationId: string,
    options: FormationExportOptions
  ): Promise<Blob | null> {
    const formation = this.formations.get(formationId);
    if (!formation) return null;

    switch (options.format) {
      case 'pdf':
        return this.exportToPdf(formation, options);
      case 'png':
      case 'jpg':
        return this.exportToImage(formation, options);
      case 'svg':
        return this.exportToSvg(formation, options);
      case 'video':
      case 'gif':
        return this.exportToAnimation(formation, options);
      default:
        return null;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
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
    // Handle shortest path for rotation
    let diff = to - from;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (from + diff * t + 360) % 360;
  }

  private async exportToPdf(
    formation: Formation,
    options: FormationExportOptions
  ): Promise<Blob> {
    const { stageWidth, stageHeight, gridSize, performers, keyframes, name, description } = formation;

    // Determine paper size and orientation
    const paperSize = options.paperSize ?? 'letter';
    const orientation = options.orientation ?? 'landscape';

    // Create PDF document
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: paperSize,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2 - 30; // Leave room for header

    // Calculate scale to fit stage within content area
    const scaleX = contentWidth / stageWidth;
    const scaleY = contentHeight / stageHeight;
    const scale = Math.min(scaleX, scaleY);

    // Center the stage on the page
    const stageDrawWidth = stageWidth * scale;
    const stageDrawHeight = stageHeight * scale;
    const offsetX = margin + (contentWidth - stageDrawWidth) / 2;
    const offsetY = margin + 25 + (contentHeight - stageDrawHeight) / 2;

    // Export each keyframe as a separate page
    for (let i = 0; i < keyframes.length; i++) {
      if (i > 0) {
        doc.addPage();
      }

      const keyframe = keyframes[i];

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(name, margin, margin + 5);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (description) {
        doc.text(description, margin, margin + 12);
      }

      // Keyframe info
      const timeStr = this.formatTime(keyframe.timestamp);
      doc.text(`Keyframe ${i + 1} of ${keyframes.length} - ${timeStr}`, margin, margin + 19);

      // Timestamp in corner
      if (options.includeTimestamps) {
        doc.setFontSize(8);
        doc.text(timeStr, pageWidth - margin - 15, margin + 5);
      }

      // Draw stage background
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(200, 200, 200);
      doc.rect(offsetX, offsetY, stageDrawWidth, stageDrawHeight, 'FD');

      // Draw grid if requested
      if (options.includeGrid) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);

        // Vertical lines
        for (let x = 0; x <= stageWidth; x += gridSize) {
          const lineX = offsetX + x * scale;
          doc.line(lineX, offsetY, lineX, offsetY + stageDrawHeight);
        }

        // Horizontal lines
        for (let y = 0; y <= stageHeight; y += gridSize) {
          const lineY = offsetY + y * scale;
          doc.line(offsetX, lineY, offsetX + stageDrawWidth, lineY);
        }
      }

      // Draw performers
      const positions = keyframe.positions;
      for (const performer of performers) {
        const pos = positions.get(performer.id);
        if (!pos) continue;

        const cx = offsetX + (pos.x / 100) * stageDrawWidth;
        const cy = offsetY + (pos.y / 100) * stageDrawHeight;
        const radius = 3;

        // Draw marker circle
        const color = this.hexToRgb(performer.color);
        doc.setFillColor(color.r, color.g, color.b);
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.circle(cx, cy, radius, 'FD');

        // Draw rotation indicator if present
        if (pos.rotation !== undefined && pos.rotation !== 0) {
          const angle = (pos.rotation * Math.PI) / 180;
          const arrowLength = radius + 2;
          const endX = cx + Math.cos(angle) * arrowLength;
          const endY = cy + Math.sin(angle) * arrowLength;
          doc.setDrawColor(color.r, color.g, color.b);
          doc.setLineWidth(0.8);
          doc.line(cx, cy, endX, endY);
        }

        // Draw label if requested
        if (options.includeLabels) {
          doc.setFontSize(6);
          doc.setTextColor(255, 255, 255);
          doc.text(performer.label, cx, cy + 1.5, { align: 'center' });
          doc.setTextColor(0, 0, 0);
        }
      }

      // Draw performer legend at bottom
      doc.setFontSize(8);
      let legendX = margin;
      const legendY = pageHeight - margin;

      for (const performer of performers.slice(0, 10)) {
        const color = this.hexToRgb(performer.color);
        doc.setFillColor(color.r, color.g, color.b);
        doc.circle(legendX + 2, legendY - 2, 2, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text(`${performer.label}: ${performer.name}`, legendX + 6, legendY - 0.5);
        legendX += 40;
        if (legendX > pageWidth - margin - 40) {
          break;
        }
      }

      if (performers.length > 10) {
        doc.text(`... and ${performers.length - 10} more`, legendX + 6, legendY - 0.5);
      }
    }

    // Return as Blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const remainingMs = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${remainingMs.toString().padStart(2, '0')}`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 100, g: 100, b: 100 };
  }

  private async exportToImage(
    formation: Formation,
    options: FormationExportOptions
  ): Promise<Blob> {
    const { stageWidth, stageHeight, gridSize, performers, keyframes } = formation;

    // Use resolution from options or default
    const width = options.resolution?.width ?? 1920;
    const height = options.resolution?.height ?? 1080;
    const quality = (options.quality ?? 90) / 100;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    // Calculate scale to fit stage within canvas
    const margin = Math.min(width, height) * 0.05;
    const contentWidth = width - margin * 2;
    const contentHeight = height - margin * 2;
    const scaleX = contentWidth / stageWidth;
    const scaleY = contentHeight / stageHeight;
    const scale = Math.min(scaleX, scaleY);

    // Center the stage
    const stageDrawWidth = stageWidth * scale;
    const stageDrawHeight = stageHeight * scale;
    const offsetX = margin + (contentWidth - stageDrawWidth) / 2;
    const offsetY = margin + (contentHeight - stageDrawHeight) / 2;

    // Draw background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Draw stage area
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.fillRect(offsetX, offsetY, stageDrawWidth, stageDrawHeight);
    ctx.strokeRect(offsetX, offsetY, stageDrawWidth, stageDrawHeight);

    // Draw grid if requested
    if (options.includeGrid) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.5;

      // Vertical lines
      for (let x = 0; x <= stageWidth; x += gridSize) {
        const lineX = offsetX + x * scale;
        ctx.beginPath();
        ctx.moveTo(lineX, offsetY);
        ctx.lineTo(lineX, offsetY + stageDrawHeight);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= stageHeight; y += gridSize) {
        const lineY = offsetY + y * scale;
        ctx.beginPath();
        ctx.moveTo(offsetX, lineY);
        ctx.lineTo(offsetX + stageDrawWidth, lineY);
        ctx.stroke();
      }
    }

    // Get first keyframe positions (for static image export)
    const positions = keyframes[0]?.positions ?? new Map();

    // Draw performers
    const markerRadius = Math.min(stageDrawWidth, stageDrawHeight) * 0.02;
    for (const performer of performers) {
      const pos = positions.get(performer.id);
      if (!pos) continue;

      const cx = offsetX + (pos.x / 100) * stageDrawWidth;
      const cy = offsetY + (pos.y / 100) * stageDrawHeight;

      // Draw marker circle
      ctx.fillStyle = performer.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, markerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw rotation indicator
      if (pos.rotation !== undefined && pos.rotation !== 0) {
        const angle = (pos.rotation * Math.PI) / 180;
        const arrowLength = markerRadius + 5;
        ctx.strokeStyle = performer.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * arrowLength, cy + Math.sin(angle) * arrowLength);
        ctx.stroke();
      }

      // Draw label if requested
      if (options.includeLabels) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, markerRadius * 0.8)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(performer.label, cx, cy);
      }
    }

    // Draw title if timestamps requested
    if (options.includeTimestamps && keyframes.length > 0) {
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(formation.name, margin, margin / 2);

      ctx.font = '16px sans-serif';
      ctx.fillText(this.formatTime(keyframes[0].timestamp), margin, margin / 2 + 30);
    }

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      const mimeType = options.format === 'png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        mimeType,
        quality
      );
    });
  }

  private async exportToSvg(
    formation: Formation,
    options: FormationExportOptions
  ): Promise<Blob> {
    // Generate SVG markup
    const { stageWidth, stageHeight, gridSize, performers, keyframes } = formation;
    const scale = 10; // Scale factor for SVG units
    const width = stageWidth * scale;
    const height = stageHeight * scale;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

    // Add background
    svg += `<rect width="${width}" height="${height}" fill="#f8fafc"/>`;

    // Add grid if requested
    if (options.includeGrid) {
      svg += '<g stroke="#e2e8f0" stroke-width="0.5">';
      for (let x = 0; x <= stageWidth; x += gridSize) {
        svg += `<line x1="${x * scale}" y1="0" x2="${x * scale}" y2="${height}"/>`;
      }
      for (let y = 0; y <= stageHeight; y += gridSize) {
        svg += `<line x1="0" y1="${y * scale}" x2="${width}" y2="${y * scale}"/>`;
      }
      svg += '</g>';
    }

    // Add performers at first keyframe positions
    const positions = keyframes[0]?.positions ?? new Map();
    for (const performer of performers) {
      const pos = positions.get(performer.id);
      if (pos) {
        const cx = (pos.x / 100) * width;
        const cy = (pos.y / 100) * height;
        svg += `<circle cx="${cx}" cy="${cy}" r="8" fill="${performer.color}"/>`;
        if (options.includeLabels) {
          svg += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="10" fill="white">${performer.label}</text>`;
        }
      }
    }

    svg += '</svg>';
    return new Blob([svg], { type: 'image/svg+xml' });
  }

  private async exportToAnimation(
    formation: Formation,
    options: FormationExportOptions
  ): Promise<Blob> {
    const { stageWidth, stageHeight, gridSize, performers, keyframes } = formation;

    // Use resolution from options or default
    const width = options.resolution?.width ?? 1280;
    const height = options.resolution?.height ?? 720;
    const fps = options.fps ?? 30;

    // Create canvas for rendering frames
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    // Calculate stage dimensions
    const margin = Math.min(width, height) * 0.05;
    const contentWidth = width - margin * 2;
    const contentHeight = height - margin * 2;
    const scaleX = contentWidth / stageWidth;
    const scaleY = contentHeight / stageHeight;
    const scale = Math.min(scaleX, scaleY);
    const stageDrawWidth = stageWidth * scale;
    const stageDrawHeight = stageHeight * scale;
    const offsetX = margin + (contentWidth - stageDrawWidth) / 2;
    const offsetY = margin + (contentHeight - stageDrawHeight) / 2;
    const markerRadius = Math.min(stageDrawWidth, stageDrawHeight) * 0.02;

    // Get total duration
    const duration = this.getFormationDuration(formation.id) ||
      (keyframes.length > 0 ? keyframes[keyframes.length - 1].timestamp + 1000 : 5000);
    const frameCount = Math.ceil((duration / 1000) * fps);
    const frameDuration = 1000 / fps;

    // For GIF export, we'll use a simple approach with collected frames
    // In production, you'd want to use a library like gif.js
    const frames: ImageData[] = [];

    // Render each frame
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
      const time = frameIndex * frameDuration;

      // Clear canvas
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Draw stage
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.fillRect(offsetX, offsetY, stageDrawWidth, stageDrawHeight);
      ctx.strokeRect(offsetX, offsetY, stageDrawWidth, stageDrawHeight);

      // Draw grid
      if (options.includeGrid) {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= stageWidth; x += gridSize) {
          const lineX = offsetX + x * scale;
          ctx.beginPath();
          ctx.moveTo(lineX, offsetY);
          ctx.lineTo(lineX, offsetY + stageDrawHeight);
          ctx.stroke();
        }
        for (let y = 0; y <= stageHeight; y += gridSize) {
          const lineY = offsetY + y * scale;
          ctx.beginPath();
          ctx.moveTo(offsetX, lineY);
          ctx.lineTo(offsetX + stageDrawWidth, lineY);
          ctx.stroke();
        }
      }

      // Get interpolated positions for this time
      const positions = this.getPositionsAtTime(formation.id, time);

      // Draw performers
      for (const performer of performers) {
        const pos = positions.get(performer.id);
        if (!pos) continue;

        const cx = offsetX + (pos.x / 100) * stageDrawWidth;
        const cy = offsetY + (pos.y / 100) * stageDrawHeight;

        ctx.fillStyle = performer.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, markerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (options.includeLabels) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(10, markerRadius * 0.8)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(performer.label, cx, cy);
        }
      }

      // Draw timestamp
      if (options.includeTimestamps) {
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(this.formatTime(time), width - margin, margin / 2);
      }

      // Capture frame
      frames.push(ctx.getImageData(0, 0, width, height));
    }

    // For now, return a simple video placeholder
    // In production, use MediaRecorder API or a GIF encoding library
    if (options.format === 'gif') {
      // Simple GIF placeholder - in production use gif.js or similar
      const mimeType = 'image/gif';

      // For actual GIF encoding, you would use a library like gif.js:
      // const gif = new GIF({ workers: 2, quality: 10, width, height });
      // frames.forEach(frame => gif.addFrame(frame, { delay: frameDuration }));
      // return new Promise((resolve) => {
      //   gif.on('finished', (blob) => resolve(blob));
      //   gif.render();
      // });

      // Return last frame as static image for now
      canvas.toBlob((blob) => blob, 'image/png');
      return new Blob(['GIF animation data'], { type: mimeType });
    } else {
      // For video, use MediaRecorder if available
      if (typeof MediaRecorder !== 'undefined') {
        const stream = canvas.captureStream(fps);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];

        return new Promise((resolve) => {
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          recorder.onstop = () => {
            resolve(new Blob(chunks, { type: 'video/webm' }));
          };

          recorder.start();

          // Replay animation for recording
          let frameIndex = 0;
          const renderFrame = () => {
            if (frameIndex < frames.length) {
              ctx.putImageData(frames[frameIndex], 0, 0);
              frameIndex++;
              requestAnimationFrame(renderFrame);
            } else {
              recorder.stop();
            }
          };
          renderFrame();
        });
      }

      return new Blob(['Video export placeholder'], { type: 'video/mp4' });
    }
  }
}

// Export singleton instance
export const formationService = new FormationService();
export default formationService;
