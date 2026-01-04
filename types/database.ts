/**
 * Database Types for FluxStudio
 *
 * This file contains TypeScript types for the database schema.
 * Update this file when making schema changes.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// User type
export interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// Organization/Team type
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// Organization member type
export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  createdAt: string;
}

// Project type
export interface Project {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdBy: string;
  status: 'active' | 'archived' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// Asset type (files uploaded for feedback)
export interface Asset {
  id: string;
  name: string;
  filePath: string;
  fileType: 'image' | 'video' | 'audio' | '3d' | 'document';
  mimeType: string;
  fileSize: number;
  thumbnailUrl: string | null;
  duration: number | null; // For video/audio in seconds
  dimensions: { width: number; height: number } | null;
  metadata: Json | null;
  projectId: string;
  uploadedBy: string;
  version: number;
  parentAssetId: string | null; // For version tracking
  createdAt: string;
  updatedAt: string;
}

// Comment/Annotation type
export interface Comment {
  id: string;
  content: string;
  assetId: string;
  authorId: string;
  author?: User;
  parentCommentId: string | null; // For replies
  // Position data for annotations
  position: { x: number; y: number } | null; // For images
  timestamp: number | null; // For video/audio timestamps in seconds
  frame: number | null; // For video frame numbers
  cameraPosition: { x: number; y: number; z: number; target: { x: number; y: number; z: number } } | null; // For 3D models
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

// Review session type
export interface ReviewSession {
  id: string;
  name: string;
  projectId: string;
  createdBy: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// Enum types
export type AssetType = 'image' | 'video' | 'audio' | '3d' | 'document';
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ProjectStatus = 'active' | 'archived' | 'completed';
export type ReviewStatus = 'pending' | 'in_progress' | 'completed';

// Input types for creating/updating records
export interface CreateUserInput {
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  organizationId: string;
}

export interface CreateAssetInput {
  name: string;
  filePath: string;
  fileType: AssetType;
  mimeType: string;
  fileSize: number;
  projectId: string;
  thumbnailUrl?: string;
  duration?: number;
  dimensions?: { width: number; height: number };
  metadata?: Json;
}

export interface CreateCommentInput {
  content: string;
  assetId: string;
  parentCommentId?: string;
  position?: { x: number; y: number };
  timestamp?: number;
  frame?: number;
  cameraPosition?: { x: number; y: number; z: number; target: { x: number; y: number; z: number } };
}
