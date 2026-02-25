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
export { TemplateGallery } from './TemplateGallery';
export type { FormationTemplate, TemplateGalleryProps } from './TemplateGallery';
export { FormationCursorOverlay } from './FormationCursorOverlay';
export type { FormationCursorOverlayProps } from './FormationCursorOverlay';
export { ViewToggle } from './ViewToggle';
export { Scene3DToolbar } from './Scene3DToolbar';
export { Formation3DView } from './Formation3DView';

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
