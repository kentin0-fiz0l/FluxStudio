/**
 * Store Types - Shared types for Zustand slices
 *
 * This file breaks circular dependencies by providing a central
 * location for shared types that all slices can import.
 */

import type { AuthSlice } from './slices/authSlice';
import type { ProjectSlice } from './slices/projectSlice';
import type { UISlice } from './slices/uiSlice';
import type { MessagingSlice } from './slices/messagingSlice';
import type { OfflineSlice } from './slices/offlineSlice';
import type { CollaborationSlice } from './slices/collaborationSlice';
import type { TimelineSlice } from './slices/timelineSlice';
import type { AISlice } from './slices/aiSlice';

// Combined Store Type
export interface FluxStore extends
  AuthSlice,
  ProjectSlice,
  UISlice,
  MessagingSlice,
  OfflineSlice,
  CollaborationSlice,
  TimelineSlice,
  AISlice {}
