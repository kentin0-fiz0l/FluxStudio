/**
 * Scene 3D Services - Public API
 */

export * from './types';
export * from './propRegistry';
export {
  validateModelFile,
  validateLoadedModel,
  countPolygons,
  loadGLBFromUrl,
  loadGLBFromFile,
} from './modelLoader';
export type { ModelValidationResult, LoadedModel } from './modelLoader';
