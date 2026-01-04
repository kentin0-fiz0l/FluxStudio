// Re-export all types
export * from './database';

// Common types used across the application

export interface Position2D {
  x: number;
  y: number;
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface CameraPosition {
  position: Position3D;
  target: Position3D;
}

export interface Dimensions {
  width: number;
  height: number;
}

export type AssetType = 'image' | 'video' | 'audio' | '3d' | 'document';

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface UploadedFile {
  id: string;
  url: string;
  path: string;
  metadata: FileMetadata;
  assetType: AssetType;
}

export interface Annotation {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  createdAt: string;
  isResolved: boolean;
  // Position data varies by asset type
  position?: Position2D; // For images
  timestamp?: number; // For video/audio (in seconds)
  frame?: number; // For video
  cameraPosition?: CameraPosition; // For 3D models
}

export interface ReviewSession {
  id: string;
  name: string;
  projectId: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  assets: string[];
  participants: string[];
}

export interface NotificationPayload {
  type: 'comment' | 'mention' | 'review_request' | 'asset_upload';
  title: string;
  body: string;
  url?: string;
  metadata?: Record<string, unknown>;
}
