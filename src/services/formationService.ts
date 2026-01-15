/**
 * Formation Service - Flux Studio
 *
 * Service for managing dance/marching formations with performer positioning,
 * keyframe animations, and timeline management.
 */

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

export interface Keyframe {
  id: string;
  timestamp: number; // Time in milliseconds
  positions: Map<string, Position>; // performerId -> position
  transition?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  duration?: number; // Duration to reach this keyframe from previous
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
  musicTrackUrl?: string;
  musicDuration?: number;
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
  private currentFormation: Formation | null = null;
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
    // In production, use jsPDF or similar library
    console.log('PDF export not implemented yet', formation, options);
    return new Blob(['PDF export placeholder'], { type: 'application/pdf' });
  }

  private async exportToImage(
    formation: Formation,
    options: FormationExportOptions
  ): Promise<Blob> {
    // In production, use canvas rendering
    console.log('Image export not implemented yet', formation, options);
    const mimeType = options.format === 'png' ? 'image/png' : 'image/jpeg';
    return new Blob(['Image export placeholder'], { type: mimeType });
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
    // In production, use canvas recording or GIF library
    console.log('Animation export not implemented yet', formation, options);
    const mimeType = options.format === 'gif' ? 'image/gif' : 'video/mp4';
    return new Blob(['Animation export placeholder'], { type: mimeType });
  }
}

// Export singleton instance
export const formationService = new FormationService();
export default formationService;
