/**
 * Scene 3D Types - Type definitions for 3D scene objects in the Drillwriter
 *
 * Extends the existing 2D Position with 3D coordinates and defines
 * scene object types for props, custom models, primitives, and imports.
 */

// ============================================================================
// Position Types
// ============================================================================

/** 3D position extending the existing 2D Position with depth, rotation axes, and scale */
export interface Position3D {
  x: number;           // 0-100 (stage percentage, same as 2D)
  y: number;           // 0-100 (stage percentage, same as 2D)
  z: number;           // Height above field in world units
  rotation?: number;   // Y-axis rotation in degrees (yaw) - matches 2D rotation
  rotationX?: number;  // X-axis rotation in degrees (pitch)
  rotationZ?: number;  // Z-axis rotation in degrees (roll)
  scale?: number;      // Uniform scale factor (default 1)
}

// ============================================================================
// Primitive Shape Types
// ============================================================================

export type PrimitiveShape =
  | 'box'
  | 'cylinder'
  | 'sphere'
  | 'cone'
  | 'plane'
  | 'torus';

export interface PrimitiveDimensions {
  // Box
  width?: number;
  height?: number;
  depth?: number;
  // Cylinder / Cone
  radiusTop?: number;
  radiusBottom?: number;
  // Sphere
  radius?: number;
  // Torus
  tubeRadius?: number;
  // Shared
  segments?: number;
}

export interface MaterialConfig {
  color: string;            // Hex color
  metalness?: number;       // 0-1
  roughness?: number;       // 0-1
  opacity?: number;         // 0-1
  transparent?: boolean;
  emissive?: string;        // Hex color for glow
  emissiveIntensity?: number;
}

export const DEFAULT_MATERIAL: MaterialConfig = {
  color: '#6366f1',
  metalness: 0.1,
  roughness: 0.7,
  opacity: 1,
  transparent: false,
};

// ============================================================================
// Source Types (how each object was created)
// ============================================================================

/** Predefined prop from the catalog */
export interface PropSource {
  type: 'prop';
  catalogId: string;
  variant?: string;       // Color/size variant
}

/** Custom-composed model from Primitive Builder */
export interface CustomSource {
  type: 'custom';
  primitives: ComposedPrimitive[];
  name: string;
}

/** Single primitive shape */
export interface PrimitiveSource {
  type: 'primitive';
  shape: PrimitiveShape;
  dimensions: PrimitiveDimensions;
  material: MaterialConfig;
}

/** Imported 3D model (.glb/.obj) */
export interface ImportedSource {
  type: 'imported';
  fileId: string;
  fileUrl: string;
  filename: string;
  boundingBox: { width: number; height: number; depth: number };
  polyCount: number;
}

export type ObjectSource = PropSource | CustomSource | PrimitiveSource | ImportedSource;

// ============================================================================
// Composed Primitive (used inside CustomSource)
// ============================================================================

export interface ComposedPrimitive {
  id: string;
  shape: PrimitiveShape;
  dimensions: PrimitiveDimensions;
  material: MaterialConfig;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

// ============================================================================
// Scene Object (the main entity)
// ============================================================================

export type SceneObjectType = 'prop' | 'custom' | 'primitive' | 'imported';

export interface SceneObject {
  id: string;
  name: string;
  type: SceneObjectType;
  position: Position3D;
  source: ObjectSource;
  /** Optional: attach this object to a performer (it follows them) */
  attachedToPerformerId?: string;
  /** Whether this object is visible in the scene */
  visible: boolean;
  /** Whether this object is locked from editing */
  locked: boolean;
  /** Layer ordering for rendering */
  layer: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Scene State
// ============================================================================

export type Scene3DTool =
  | 'select'
  | 'pan'
  | 'translate'
  | 'rotate'
  | 'scale'
  | 'add-box'
  | 'add-cylinder'
  | 'add-sphere'
  | 'add-cone'
  | 'add-plane'
  | 'add-torus';

export interface Scene3DCamera {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
}

export interface Scene3DSettings {
  showGrid: boolean;
  showFieldOverlay: boolean;
  showPerformers: boolean;
  showLabels: boolean;
  showShadows: boolean;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
}

export const DEFAULT_SCENE_SETTINGS: Scene3DSettings = {
  showGrid: true,
  showFieldOverlay: true,
  showPerformers: true,
  showLabels: true,
  showShadows: true,
  ambientLightIntensity: 0.6,
  directionalLightIntensity: 0.8,
};

// ============================================================================
// View Mode
// ============================================================================

export type FormationViewMode = '2d' | '3d' | 'split';

// ============================================================================
// Poly Count Limits
// ============================================================================

export const POLY_COUNT_WARN = 50_000;
export const POLY_COUNT_REJECT = 200_000;
