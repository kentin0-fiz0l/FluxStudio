/**
 * AI Drill Path Suggestion Service
 *
 * Sends start/end positions + constraints to the backend AI endpoint
 * and receives suggested cubic Bezier control points for smooth curved paths.
 */

import { apiService } from '@/services/apiService';
import type { Position, PathCurve } from './formationTypes';

export interface PathSuggestionRequest {
  /** Start positions keyed by performer ID */
  startPositions: Record<string, { x: number; y: number }>;
  /** End positions keyed by performer ID */
  endPositions: Record<string, { x: number; y: number }>;
  /** Minimum distance between performers in normalized units */
  minSpacing?: number;
  /** Whether to maintain relative formation shape */
  maintainShape?: boolean;
  /** Preferred path style */
  style?: 'smooth' | 'direct' | 'sweeping';
}

export interface PathSuggestionResponse {
  /** Suggested control points keyed by performer ID */
  curves: Record<string, { cp1: { x: number; y: number }; cp2: { x: number; y: number } }>;
  /** Confidence score 0-1 */
  confidence: number;
  /** Human-readable description of the suggestion */
  description: string;
}

/**
 * Request AI-suggested curved paths between two sets of positions.
 * Falls back to default curve control points if the API is unavailable.
 */
export async function suggestPaths(
  request: PathSuggestionRequest,
): Promise<PathSuggestionResponse> {
  const response = await apiService.post<PathSuggestionResponse>(
    '/api/ai/suggest-drill-paths',
    request,
  );

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to get path suggestions');
  }

  return response.data;
}

/**
 * Convert API response curves to the internal PathCurve Map format.
 */
export function responseToCurveMap(
  response: PathSuggestionResponse,
): Map<string, PathCurve> {
  const map = new Map<string, PathCurve>();

  for (const [id, curve] of Object.entries(response.curves)) {
    map.set(id, {
      cp1: { x: curve.cp1.x, y: curve.cp1.y },
      cp2: { x: curve.cp2.x, y: curve.cp2.y },
    });
  }

  return map;
}

/**
 * Convert positions Map to a plain object for API serialization.
 */
export function positionsToRecord(
  positions: Map<string, Position>,
): Record<string, { x: number; y: number }> {
  const record: Record<string, { x: number; y: number }> = {};
  for (const [id, pos] of positions) {
    record[id] = { x: pos.x, y: pos.y };
  }
  return record;
}
