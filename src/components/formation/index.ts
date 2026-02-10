/**
 * Formation Components - Flux Studio
 *
 * Components for creating and managing dance/marching formations.
 */

export { FormationCanvas } from './FormationCanvas';
export { PerformerMarker } from './PerformerMarker';
export { Timeline } from './Timeline';
export { ExportDialog } from './ExportDialog';
export { AudioUpload } from './AudioUpload';
export { PathOverlay } from './PathOverlay';
export { TemplatePicker } from './TemplatePicker';

// Re-export types from service for convenience
export type {
  Formation,
  Performer,
  Position,
  Keyframe,
  PlaybackState,
  FormationExportOptions,
  AudioTrack,
} from '../../services/formationService';
