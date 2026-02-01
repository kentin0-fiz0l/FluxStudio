/**
 * Shared types for annotation components
 */

import { ImageAnnotation, MessageUser } from '../../../types/messaging';

export type AnnotationType = 'point' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'freehand';

export interface CollaboratorCursor {
  userId: string;
  user: MessageUser;
  position: { x: number; y: number };
  lastSeen: Date;
  isActive: boolean;
}

export interface AnnotationLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  annotations: string[];
  color: string;
}

export interface AnnotationHistory {
  id: string;
  action: 'create' | 'update' | 'delete';
  annotation: ImageAnnotation;
  timestamp: Date;
  userId: string;
}

export interface AnnotationTool {
  type: AnnotationType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

export const defaultColors = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFA500', '#800080', '#008000', '#800000', '#000080', '#808000',
  '#FF69B4', '#32CD32', '#1E90FF', '#FFD700', '#DC143C', '#00CED1'
];
