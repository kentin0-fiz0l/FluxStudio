/**
 * Model Loader - GLB/OBJ loading with validation
 *
 * Provides client-side model validation (poly count, file size)
 * and loading utilities using Three.js loaders.
 */

import type { Object3D, Group, Mesh } from 'three';
import { POLY_COUNT_WARN, POLY_COUNT_REJECT } from './types';

// ============================================================================
// Types
// ============================================================================

export interface ModelValidationResult {
  valid: boolean;
  polyCount: number;
  boundingBox: { width: number; height: number; depth: number };
  fileSize: number;
  warnings: string[];
  errors: string[];
}

export interface LoadedModel {
  scene: Group;
  polyCount: number;
  boundingBox: { width: number; height: number; depth: number };
}

// ============================================================================
// File Validation (pre-upload)
// ============================================================================

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['.glb', '.gltf', '.obj'];

export function validateModelFile(file: File): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    errors.push(`Unsupported file format: ${ext}. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  if (file.size === 0) {
    errors.push('File is empty');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Geometry Analysis (post-load)
// ============================================================================

/** Count total triangles in a Three.js object hierarchy */
export function countPolygons(object: Object3D): number {
  let count = 0;
  object.traverse((child: Object3D) => {
    const maybeMesh = child as Mesh;
    if (maybeMesh.isMesh) {
      const geometry = maybeMesh.geometry;
      if (geometry.index) {
        count += geometry.index.count / 3;
      } else if (geometry.attributes.position) {
        count += geometry.attributes.position.count / 3;
      }
    }
  });
  return Math.round(count);
}

/** Compute bounding box dimensions from a Three.js object */
export async function computeBoundingBox(object: Object3D): Promise<{ width: number; height: number; depth: number }> {
  const THREE = await import('three');
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  return {
    width: Math.round(size.x * 100) / 100,
    height: Math.round(size.y * 100) / 100,
    depth: Math.round(size.z * 100) / 100,
  };
}

/** Validate a loaded model's geometry */
export async function validateLoadedModel(object: Object3D, fileSize: number): Promise<ModelValidationResult> {
  const polyCount = countPolygons(object);
  const boundingBox = await computeBoundingBox(object);
  const warnings: string[] = [];
  const errors: string[] = [];

  if (polyCount > POLY_COUNT_REJECT) {
    errors.push(
      `Model has ${polyCount.toLocaleString()} polygons, exceeding the ${POLY_COUNT_REJECT.toLocaleString()} limit. ` +
      'Please simplify the model in a 3D editor before importing.'
    );
  } else if (polyCount > POLY_COUNT_WARN) {
    warnings.push(
      `Model has ${polyCount.toLocaleString()} polygons. ` +
      `Models over ${POLY_COUNT_WARN.toLocaleString()} may cause performance issues with many objects in the scene.`
    );
  }

  return {
    valid: errors.length === 0,
    polyCount,
    boundingBox,
    fileSize,
    warnings,
    errors,
  };
}

// ============================================================================
// GLB/GLTF Loading (uses drei's useGLTF in components; this is for imperative use)
// ============================================================================

/**
 * Load a GLB file from a URL imperatively (outside React).
 * For React components, prefer drei's useGLTF hook.
 */
export async function loadGLBFromUrl(url: string): Promise<LoadedModel> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const THREE = await import('three');
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      async (gltf) => {
        const polyCount = countPolygons(gltf.scene);
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3());
        resolve({
          scene: gltf.scene,
          polyCount,
          boundingBox: {
            width: Math.round(size.x * 100) / 100,
            height: Math.round(size.y * 100) / 100,
            depth: Math.round(size.z * 100) / 100,
          },
        });
      },
      undefined,
      (error) => reject(new Error(`Failed to load model: ${error}`))
    );
  });
}

/**
 * Load a GLB from a File object (for preview before upload).
 */
export async function loadGLBFromFile(file: File): Promise<LoadedModel> {
  const url = URL.createObjectURL(file);
  try {
    return await loadGLBFromUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
