/**
 * LMS Integration Service - FluxStudio
 *
 * Integrates with Google Classroom and Canvas LMS for sharing
 * drill formations as coursework and assignments.
 */

import { buildApiUrl } from '../config/environment';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface LMSProvider {
  id: 'google_classroom' | 'canvas_lms';
  name: string;
  icon: string;
  connected: boolean;
}

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  enrollmentCode?: string;
}

export interface LMSShareOptions {
  provider: LMSProvider['id'];
  courseId: string;
  title: string;
  description?: string;
  formationId: string;
  /** Embed URL for the formation viewer */
  embedUrl: string;
  /** Due date for assignment (ISO string) */
  dueDate?: string;
  /** Max points for grading */
  maxPoints?: number;
}

export interface LMSShareResult {
  success: boolean;
  url?: string;
  assignmentId?: string;
  error?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get list of available LMS providers and connection status.
 */
export async function getLMSProviders(token: string): Promise<LMSProvider[]> {
  const res = await fetch(buildApiUrl('/lms/providers'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to get LMS providers (${res.status})`);
  const data = await res.json();
  return data.providers || [];
}

/**
 * Get courses for a connected LMS provider.
 */
export async function getLMSCourses(
  provider: LMSProvider['id'],
  token: string,
): Promise<ClassroomCourse[]> {
  const res = await fetch(buildApiUrl(`/lms/${provider}/courses`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to get courses (${res.status})`);
  const data = await res.json();
  return data.courses || [];
}

/**
 * Connect to an LMS provider (initiates OAuth flow).
 * Returns the OAuth authorization URL to redirect the user to.
 */
export async function connectLMSProvider(
  provider: LMSProvider['id'],
  token: string,
): Promise<string> {
  const res = await fetch(buildApiUrl(`/lms/${provider}/connect`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Failed to connect to ${provider} (${res.status})`);
  const data = await res.json();
  return data.authUrl;
}

/**
 * Share a formation to an LMS course as an assignment.
 */
export async function shareToLMS(
  options: LMSShareOptions,
  token: string,
): Promise<LMSShareResult> {
  const res = await fetch(buildApiUrl(`/lms/${options.provider}/share`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      courseId: options.courseId,
      title: options.title,
      description: options.description,
      formationId: options.formationId,
      embedUrl: options.embedUrl,
      dueDate: options.dueDate,
      maxPoints: options.maxPoints,
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    return { success: false, error: errData.error || `Share failed (${res.status})` };
  }
  const data = await res.json();
  return { success: true, url: data.url, assignmentId: data.assignmentId };
}

/**
 * Generate the embed URL for a formation.
 */
export function getFormationEmbedUrl(formationId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/embed/formation/${formationId}`;
}
