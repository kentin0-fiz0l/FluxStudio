/**
 * Formations API Service - FluxStudio Drill Writer
 *
 * API client for formation persistence endpoints.
 * Handles all CRUD operations for formations, performers, keyframes, and positions.
 */

import { getApiUrl, getAuthToken } from '../utils/apiHelpers';
import { Formation, Performer, Keyframe, Position } from './formationService';

// API Response types
export interface FormationsApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface FormationListItem {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  stageWidth: number;
  stageHeight: number;
  gridSize: number;
  isArchived: boolean;
  createdBy: string;
  creatorName?: string;
  performerCount: number;
  keyframeCount: number;
  createdAt: string;
  updatedAt: string;
}

// Helper to get CSRF token
async function getCsrfToken(): Promise<string> {
  const response = await fetch(getApiUrl('/api/csrf-token'), {
    credentials: 'include'
  });
  const data = await response.json();
  return data.csrfToken;
}

// Helper for API requests
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Get CSRF token for mutating requests
  if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
    const csrfToken = await getCsrfToken();
    headers['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(getApiUrl(url), {
    ...options,
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API request failed: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// FORMATION OPERATIONS
// ============================================================================

/**
 * Fetch all formations for a project
 */
export async function fetchFormations(projectId: string): Promise<FormationListItem[]> {
  const result = await apiRequest<{ success: boolean; formations: FormationListItem[] }>(
    `/api/projects/${projectId}/formations`
  );
  return result.formations || [];
}

/**
 * Fetch a single formation with all data
 */
export async function fetchFormation(formationId: string): Promise<Formation> {
  const result = await apiRequest<{ success: boolean; formation: any }>(
    `/api/formations/${formationId}`
  );

  // Transform API response to match frontend Formation interface
  const apiFormation = result.formation;
  return transformApiFormation(apiFormation);
}

/**
 * Create a new formation
 */
export async function createFormation(
  projectId: string,
  data: {
    name: string;
    description?: string;
    stageWidth?: number;
    stageHeight?: number;
    gridSize?: number;
  }
): Promise<Formation> {
  const result = await apiRequest<{ success: boolean; formation: any }>(
    `/api/projects/${projectId}/formations`,
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  );

  // Re-fetch to get full formation with keyframes
  return fetchFormation(result.formation.id);
}

/**
 * Update formation metadata
 */
export async function updateFormation(
  formationId: string,
  data: {
    name?: string;
    description?: string;
    stageWidth?: number;
    stageHeight?: number;
    gridSize?: number;
    isArchived?: boolean;
  }
): Promise<Formation> {
  const result = await apiRequest<{ success: boolean; formation: any }>(
    `/api/formations/${formationId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data)
    }
  );
  return transformApiFormation(result.formation);
}

/**
 * Delete a formation
 */
export async function deleteFormation(formationId: string): Promise<void> {
  await apiRequest(`/api/formations/${formationId}`, {
    method: 'DELETE'
  });
}

/**
 * Save entire formation state (performers, keyframes, positions)
 */
export async function saveFormation(
  formationId: string,
  data: {
    name?: string;
    performers: Performer[];
    keyframes: Array<{
      id: string;
      timestamp: number;
      transition?: string;
      duration?: number;
      positions: Record<string, Position> | Map<string, Position>;
    }>;
  }
): Promise<Formation> {
  // Convert Map to object for serialization
  const keyframes = data.keyframes.map(kf => ({
    ...kf,
    positions: kf.positions instanceof Map
      ? Object.fromEntries(kf.positions)
      : kf.positions
  }));

  const result = await apiRequest<{ success: boolean; formation: any }>(
    `/api/formations/${formationId}/save`,
    {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name,
        performers: data.performers,
        keyframes
      })
    }
  );

  return transformApiFormation(result.formation);
}

// ============================================================================
// PERFORMER OPERATIONS
// ============================================================================

/**
 * Add a performer to a formation
 */
export async function addPerformer(
  formationId: string,
  data: { name: string; label: string; color?: string; groupName?: string }
): Promise<Performer> {
  const result = await apiRequest<{ success: boolean; performer: any }>(
    `/api/formations/${formationId}/performers`,
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  );
  return transformApiPerformer(result.performer);
}

/**
 * Update a performer
 */
export async function updatePerformer(
  formationId: string,
  performerId: string,
  data: { name?: string; label?: string; color?: string; groupName?: string }
): Promise<Performer> {
  const result = await apiRequest<{ success: boolean; performer: any }>(
    `/api/formations/${formationId}/performers/${performerId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data)
    }
  );
  return transformApiPerformer(result.performer);
}

/**
 * Delete a performer
 */
export async function deletePerformer(formationId: string, performerId: string): Promise<void> {
  await apiRequest(`/api/formations/${formationId}/performers/${performerId}`, {
    method: 'DELETE'
  });
}

// ============================================================================
// KEYFRAME OPERATIONS
// ============================================================================

/**
 * Add a keyframe to a formation
 */
export async function addKeyframe(
  formationId: string,
  data: { timestampMs?: number; transition?: string; duration?: number }
): Promise<Keyframe> {
  const result = await apiRequest<{ success: boolean; keyframe: any }>(
    `/api/formations/${formationId}/keyframes`,
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  );
  return transformApiKeyframe(result.keyframe);
}

/**
 * Update a keyframe
 */
export async function updateKeyframe(
  formationId: string,
  keyframeId: string,
  data: { timestampMs?: number; transition?: string; duration?: number }
): Promise<Keyframe> {
  const result = await apiRequest<{ success: boolean; keyframe: any }>(
    `/api/formations/${formationId}/keyframes/${keyframeId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data)
    }
  );
  return transformApiKeyframe(result.keyframe);
}

/**
 * Delete a keyframe
 */
export async function deleteKeyframe(formationId: string, keyframeId: string): Promise<void> {
  await apiRequest(`/api/formations/${formationId}/keyframes/${keyframeId}`, {
    method: 'DELETE'
  });
}

// ============================================================================
// POSITION OPERATIONS
// ============================================================================

/**
 * Set performer position at a keyframe
 */
export async function setPosition(
  formationId: string,
  keyframeId: string,
  performerId: string,
  position: Position
): Promise<Position> {
  const result = await apiRequest<{ success: boolean; position: any }>(
    `/api/formations/${formationId}/keyframes/${keyframeId}/positions/${performerId}`,
    {
      method: 'PUT',
      body: JSON.stringify(position)
    }
  );
  return {
    x: result.position.x,
    y: result.position.y,
    rotation: result.position.rotation || 0
  };
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

function transformApiFormation(api: any): Formation {
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    projectId: api.projectId,
    stageWidth: api.stageWidth,
    stageHeight: api.stageHeight,
    gridSize: api.gridSize,
    performers: (api.performers || []).map(transformApiPerformer),
    keyframes: (api.keyframes || []).map(transformApiKeyframe),
    musicTrackUrl: api.musicTrackUrl,
    musicDuration: api.musicDuration,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    createdBy: api.createdBy
  };
}

function transformApiPerformer(api: any): Performer {
  return {
    id: api.id,
    name: api.name,
    label: api.label,
    color: api.color,
    group: api.group
  };
}

function transformApiKeyframe(api: any): Keyframe {
  // Convert positions object to Map
  const positionsMap = new Map<string, Position>();
  if (api.positions) {
    for (const [performerId, pos] of Object.entries(api.positions)) {
      const position = pos as Position;
      positionsMap.set(performerId, {
        x: position.x,
        y: position.y,
        rotation: position.rotation || 0
      });
    }
  }

  return {
    id: api.id,
    timestamp: api.timestamp,
    positions: positionsMap,
    transition: api.transition,
    duration: api.duration
  };
}

export default {
  fetchFormations,
  fetchFormation,
  createFormation,
  updateFormation,
  deleteFormation,
  saveFormation,
  addPerformer,
  updatePerformer,
  deletePerformer,
  addKeyframe,
  updateKeyframe,
  deleteKeyframe,
  setPosition
};
