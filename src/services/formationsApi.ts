/**
 * Formations API Service - FluxStudio Drill Writer
 *
 * API client for formation persistence endpoints.
 * Handles all CRUD operations for formations, performers, keyframes, and positions.
 */

import { getApiUrl } from '../utils/apiHelpers';
import { apiService } from './apiService';
import { buildApiUrl } from '../config/environment';
import { Formation, Performer, Keyframe, Position, AudioTrack } from './formationService';
import type { PathCurve, SymbolShape, PerformerGroup, DrillSet, DrillSettings, FieldConfig } from './formationTypes';
import type { TempoMap } from './tempoMap';
import type { SceneObject } from './scene3d/types';

// ============================================================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const isRetryable =
        err instanceof TypeError || // Network error
        (err instanceof Error && /5\d{2}|timeout|network|fetch/i.test(err.message));
      if (!isRetryable) throw err;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry exhausted'); // unreachable, satisfies TS
}

// ============================================================================
// RAW API RESPONSE SHAPES (before transform)
// ============================================================================

interface ApiSceneObjectRaw {
  id: string;
  name: string;
  type: string;
  position: SceneObject['position'];
  source: SceneObject['source'];
  attachedToPerformerId?: string;
  visible: boolean;
  locked: boolean;
  layer: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiFormationRaw {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  stageWidth: number;
  stageHeight: number;
  gridSize: number;
  performers?: ApiPerformerRaw[];
  keyframes?: ApiKeyframeRaw[];
  sceneObjects?: ApiSceneObjectRaw[];
  audioTrack?: AudioTrack;
  musicTrackUrl?: string;
  musicDuration?: number;
  drillSettings?: DrillSettings;
  sets?: DrillSet[];
  fieldConfig?: FieldConfig;
  groups?: PerformerGroup[];
  sectionShapeMap?: Record<string, SymbolShape>;
  metmapSongId?: string;
  tempoMap?: TempoMap;
  useConstantTempo?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

interface ApiPerformerRaw {
  id: string;
  name: string;
  label: string;
  color?: string;
  group?: string;
  instrument?: string;
  section?: string;
  drillNumber?: string;
  symbolShape?: SymbolShape;
}

interface ApiKeyframeRaw {
  id: string;
  timestamp: number;
  positions?: Record<string, Position>;
  transition?: string;
  duration?: number;
  beatBinding?: { beatIndex: number; snapResolution: 'beat' | 'half-beat' | 'measure' };
  pathCurves?: Record<string, PathCurve>;
}

// API Response types
export interface FormationsApiResponse<T = unknown> {
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

// Helper for API requests — delegates to centralized apiService
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : undefined;

  let result;
  switch (method) {
    case 'POST':
      result = await apiService.post<T>(url, body);
      break;
    case 'PATCH':
      result = await apiService.patch<T>(url, body);
      break;
    case 'DELETE':
      result = await apiService.delete<T>(url);
      break;
    case 'PUT': {
      // apiService has no PUT method — use makeRequest directly with full URL
      const fullUrl = url.startsWith('http') ? url : buildApiUrl(url);
      result = await apiService.makeRequest<T>(fullUrl, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      break;
    }
    default:
      result = await apiService.get<T>(url);
      break;
  }

  return result.data as T;
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
 * Fetch a single formation with all data (with retry)
 */
export async function fetchFormation(formationId: string): Promise<Formation> {
  return withRetry(async () => {
    const result = await apiRequest<{ success: boolean; formation: ApiFormationRaw }>(
      `/api/formations/${formationId}`
    );
    return transformApiFormation(result.formation);
  });
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
  const result = await apiRequest<{ success: boolean; formation: ApiFormationRaw }>(
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
  const result = await apiRequest<{ success: boolean; formation: ApiFormationRaw }>(
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
 * Save entire formation state (performers, keyframes, positions, groups, etc.)
 * Handles Map→Object serialization for positions and pathCurves.
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
      beatBinding?: Keyframe['beatBinding'];
      pathCurves?: Record<string, PathCurve> | Map<string, PathCurve>;
    }>;
    drillSettings?: DrillSettings;
    sets?: DrillSet[];
    fieldConfig?: FieldConfig;
    groups?: PerformerGroup[];
    sectionShapeMap?: Record<string, SymbolShape>;
    metmapSongId?: string;
    tempoMap?: TempoMap;
    useConstantTempo?: boolean;
  }
): Promise<Formation> {
  // Convert Map types to plain objects for JSON serialization
  const keyframes = data.keyframes.map(kf => ({
    ...kf,
    positions: kf.positions instanceof Map
      ? Object.fromEntries(kf.positions)
      : kf.positions,
    pathCurves: kf.pathCurves instanceof Map
      ? Object.fromEntries(kf.pathCurves)
      : kf.pathCurves,
  }));

  return withRetry(async () => {
    const result = await apiRequest<{ success: boolean; formation: ApiFormationRaw }>(
      `/api/formations/${formationId}/save`,
      {
        method: 'PUT',
        body: JSON.stringify({
          name: data.name,
          performers: data.performers,
          keyframes,
          drillSettings: data.drillSettings,
          sets: data.sets,
          fieldConfig: data.fieldConfig,
          groups: data.groups,
          sectionShapeMap: data.sectionShapeMap,
          metmapSongId: data.metmapSongId,
          tempoMap: data.tempoMap,
          useConstantTempo: data.useConstantTempo,
        })
      }
    );

    return transformApiFormation(result.formation);
  });
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
  const result = await apiRequest<{ success: boolean; performer: ApiPerformerRaw }>(
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
  const result = await apiRequest<{ success: boolean; performer: ApiPerformerRaw }>(
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
  const result = await apiRequest<{ success: boolean; keyframe: ApiKeyframeRaw }>(
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
  const result = await apiRequest<{ success: boolean; keyframe: ApiKeyframeRaw }>(
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
  const result = await apiRequest<{ success: boolean; position: Position }>(
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
// AUDIO OPERATIONS
// ============================================================================

/**
 * Upload audio track for a formation
 */
export async function uploadAudio(
  formationId: string,
  audioTrack: Omit<AudioTrack, 'waveformData'>
): Promise<AudioTrack> {
  const result = await apiRequest<{ success: boolean; audioTrack: AudioTrack }>(
    `/api/formations/${formationId}/audio`,
    {
      method: 'POST',
      body: JSON.stringify(audioTrack)
    }
  );
  return result.audioTrack;
}

/**
 * Remove audio track from a formation
 */
export async function removeAudio(formationId: string): Promise<void> {
  await apiRequest(`/api/formations/${formationId}/audio`, {
    method: 'DELETE'
  });
}

// ============================================================================
// SCENE OBJECT OPERATIONS
// ============================================================================

/**
 * Fetch all scene objects for a formation
 */
export async function fetchSceneObjects(formationId: string): Promise<SceneObject[]> {
  const result = await apiRequest<{ success: boolean; sceneObjects: ApiSceneObjectRaw[] }>(
    `/api/formations/${formationId}/scene-objects`
  );
  return (result.sceneObjects || []).map(transformApiSceneObject);
}

/**
 * Bulk save all scene objects for a formation (primary save path)
 */
export async function saveSceneObjects(formationId: string, objects: SceneObject[]): Promise<SceneObject[]> {
  const result = await apiRequest<{ success: boolean; sceneObjects: ApiSceneObjectRaw[] }>(
    `/api/formations/${formationId}/scene-objects`,
    {
      method: 'PUT',
      body: JSON.stringify({ objects })
    }
  );
  return (result.sceneObjects || []).map(transformApiSceneObject);
}

/**
 * Create a single scene object
 */
export async function createSceneObject(formationId: string, object: SceneObject): Promise<SceneObject> {
  const result = await apiRequest<{ success: boolean; sceneObject: ApiSceneObjectRaw }>(
    `/api/formations/${formationId}/scene-objects`,
    {
      method: 'POST',
      body: JSON.stringify(object)
    }
  );
  return transformApiSceneObject(result.sceneObject);
}

/**
 * Update a scene object
 */
export async function updateSceneObject(
  formationId: string,
  objectId: string,
  updates: Partial<SceneObject>
): Promise<SceneObject> {
  const result = await apiRequest<{ success: boolean; sceneObject: ApiSceneObjectRaw }>(
    `/api/formations/${formationId}/scene-objects/${objectId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }
  );
  return transformApiSceneObject(result.sceneObject);
}

/**
 * Delete a scene object
 */
export async function deleteSceneObject(formationId: string, objectId: string): Promise<void> {
  await apiRequest(`/api/formations/${formationId}/scene-objects/${objectId}`, {
    method: 'DELETE'
  });
}

// ============================================================================
// PUBLIC / SHARED ENDPOINTS (no auth required)
// ============================================================================

export async function fetchSharedFormation(formationId: string): Promise<Formation & { createdBy?: string }> {
  return withRetry(async () => {
    // Public endpoint — use fetch directly without auth
    const url = getApiUrl(`/api/formations/${formationId}/share`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch shared formation: ${res.status}`);
    const data = await res.json();
    const raw = data.data || data;
    return { ...transformApiFormation(raw), createdBy: raw.createdBy };
  });
}

export async function generateShareLink(formationId: string): Promise<string> {
  const result = await apiRequest<{ success: boolean; shareUrl: string }>(
    `/api/formations/${formationId}/share`,
    { method: 'POST' }
  );
  return result.shareUrl || `${window.location.origin}/share/${formationId}`;
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

function transformApiFormation(api: ApiFormationRaw): Formation {
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
    sceneObjects: (api.sceneObjects || []).map(transformApiSceneObject),
    audioTrack: api.audioTrack,
    musicTrackUrl: api.musicTrackUrl || api.audioTrack?.url,
    musicDuration: api.musicDuration || api.audioTrack?.duration,
    drillSettings: api.drillSettings,
    sets: api.sets,
    fieldConfig: api.fieldConfig,
    groups: api.groups,
    sectionShapeMap: api.sectionShapeMap,
    metmapSongId: api.metmapSongId,
    tempoMap: api.tempoMap,
    useConstantTempo: api.useConstantTempo,
    createdAt: api.createdAt ?? new Date().toISOString(),
    updatedAt: api.updatedAt ?? new Date().toISOString(),
    createdBy: api.createdBy ?? ''
  };
}

function transformApiPerformer(api: ApiPerformerRaw): Performer {
  return {
    id: api.id,
    name: api.name,
    label: api.label,
    color: api.color ?? '#000000',
    group: api.group,
    instrument: api.instrument,
    section: api.section,
    drillNumber: api.drillNumber,
    symbolShape: api.symbolShape,
  };
}

function transformApiSceneObject(api: ApiSceneObjectRaw): SceneObject {
  return {
    id: api.id,
    name: api.name,
    type: api.type as SceneObject['type'],
    position: api.position,
    source: api.source,
    attachedToPerformerId: api.attachedToPerformerId,
    visible: api.visible,
    locked: api.locked,
    layer: api.layer,
    createdAt: api.createdAt ?? new Date().toISOString(),
    updatedAt: api.updatedAt ?? new Date().toISOString(),
  };
}

function transformApiKeyframe(api: ApiKeyframeRaw): Keyframe {
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

  // Convert pathCurves object to Map (if present)
  let pathCurvesMap: Map<string, PathCurve> | undefined;
  if (api.pathCurves && Object.keys(api.pathCurves).length > 0) {
    pathCurvesMap = new Map<string, PathCurve>();
    for (const [performerId, curve] of Object.entries(api.pathCurves)) {
      pathCurvesMap.set(performerId, curve);
    }
  }

  return {
    id: api.id,
    timestamp: api.timestamp,
    positions: positionsMap,
    transition: api.transition as Keyframe['transition'],
    duration: api.duration,
    beatBinding: api.beatBinding,
    pathCurves: pathCurvesMap,
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
  setPosition,
  uploadAudio,
  removeAudio,
  fetchSceneObjects,
  saveSceneObjects,
  createSceneObject,
  updateSceneObject,
  deleteSceneObject
};
