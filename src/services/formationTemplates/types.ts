/**
 * Formation Template Types - FluxStudio Drill Writer
 *
 * Type definitions for drill formation templates.
 */

import { Position } from '../formationService';

/**
 * Template category for organization
 */
export type TemplateCategory = 'basic' | 'intermediate' | 'advanced' | 'custom' | 'drill';

/**
 * Relative position for template performers
 * Positions are normalized (0-100) and will be scaled based on performer count
 */
export interface TemplatePosition {
  x: number;
  y: number;
  rotation?: number;
}

/**
 * Template performer definition
 * Uses relative indexing rather than specific IDs
 */
export interface TemplatePerformer {
  index: number; // 0-based index
  label: string; // Default label (e.g., "1", "A", "P1")
  relativePosition: TemplatePosition;
}

/**
 * Template keyframe for multi-step templates
 */
export interface TemplateKeyframe {
  index: number;
  timestamp: number; // Relative timestamp in ms
  transition?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  duration?: number;
  positions: Map<number, TemplatePosition>; // performerIndex -> position
}

/**
 * Template parameters and constraints
 */
export interface TemplateParameters {
  minPerformers: number;
  maxPerformers?: number;
  scalable: boolean; // Can scale with performer count
  reversible: boolean; // Can be played in reverse
  mirrorable: boolean; // Can be mirrored horizontally/vertically
  rotatable: boolean; // Can be rotated as a whole
}

/**
 * Main drill template interface
 */
export interface DrillTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail?: string; // URL or base64 image
  icon?: string; // Icon name or SVG

  // Template data
  performers: TemplatePerformer[];
  keyframes: TemplateKeyframe[];

  // Configuration
  parameters: TemplateParameters;

  // Metadata
  tags: string[];
  author?: string;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Options for applying a template to a formation
 */
export interface ApplyTemplateOptions {
  formationId: string;
  templateId: string;

  // Positioning
  centerX?: number; // Center X position (0-100), default 50
  centerY?: number; // Center Y position (0-100), default 50
  scale?: number; // Scale factor, default 1
  rotation?: number; // Rotation in degrees, default 0
  mirror?: 'none' | 'horizontal' | 'vertical' | 'both';

  // Performer mapping
  performerMapping?: Map<number, string>; // templateIndex -> performerId
  createMissingPerformers?: boolean; // Create performers if not enough

  // Keyframe options
  insertAt?: 'current' | 'end' | number; // Where to insert keyframes
  replaceExisting?: boolean; // Replace all existing keyframes
}

/**
 * Result of applying a template
 */
export interface ApplyTemplateResult {
  success: boolean;
  keyframesCreated: number;
  performersCreated: number;
  performersMapped: Map<number, string>;
  error?: string;
}

/**
 * Template search/filter options
 */
export interface TemplateFilter {
  category?: TemplateCategory;
  search?: string;
  minPerformers?: number;
  maxPerformers?: number;
  tags?: string[];
}

/**
 * Preview data for template visualization
 */
export interface TemplatePreview {
  template: DrillTemplate;
  previewPositions: Position[]; // Positions for preview rendering
  animationFrames?: Position[][]; // Frames for animated preview
}
