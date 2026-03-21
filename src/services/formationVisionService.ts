/**
 * Formation Vision Service - Client for AI formation screenshot analysis
 *
 * Captures the formation canvas as an image and sends it to the
 * Vision API for spacing, alignment, and collision analysis.
 */

import { buildApiUrl } from '@/config/environment';

// ============================================================================
// Types
// ============================================================================

export interface SpacingIssue {
  performers: string;
  description: string;
  suggestion: string;
}

export interface AlignmentIssue {
  performers: string;
  description: string;
  suggestion: string;
}

export interface CollisionPair {
  performer1: string;
  performer2: string;
  distance: string;
}

export interface FormationAnalysis {
  overallScore: number;
  spacing: {
    score: number;
    issues: SpacingIssue[];
  };
  alignment: {
    score: number;
    issues: AlignmentIssue[];
  };
  visualImpact: {
    score: number;
    suggestions: string[];
  };
  collisions: {
    detected: boolean;
    pairs: CollisionPair[];
  };
}

export type AnalysisType = 'general' | 'spacing' | 'alignment' | 'collisions';

// ============================================================================
// Canvas Capture
// ============================================================================

/**
 * Capture the formation canvas as a base64 PNG string.
 */
export function captureFormationScreenshot(canvasElement: HTMLCanvasElement): string {
  return canvasElement.toDataURL('image/png');
}

// ============================================================================
// API Client
// ============================================================================

/**
 * Send a formation screenshot to the Vision API for analysis.
 */
export async function analyzeFormation(
  image: string,
  options?: {
    formationId?: string;
    analysisType?: AnalysisType;
  },
): Promise<FormationAnalysis> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(buildApiUrl('/ai/formation/analyze-screenshot'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      image,
      formationId: options?.formationId,
      analysisType: options?.analysisType ?? 'general',
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || `Analysis failed (${response.status})`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Analysis failed');
  }

  return data.data as FormationAnalysis;
}
