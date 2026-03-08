/**
 * Presentation AI Service
 *
 * Phase 3.3: Client Presentation Mode
 *
 * Generates AI-powered narration notes for each set in a formation,
 * summarizing the formation rationale for presentations.
 * Uses the same SSE streaming pattern as drillMusicAIService.ts.
 */

import { buildApiUrl } from '../config/environment';
import type { PresentationNote } from '../components/presentation/PresentationView';

// ============================================================================
// Types
// ============================================================================

export interface PresentationNotesRequest {
  formationId: string;
  formationName: string;
  performers: Array<{
    id: string;
    name: string;
    section?: string;
    instrument?: string;
  }>;
  sets: Array<{
    name: string;
    counts: number;
    notes?: string;
  }>;
  /** Optional audience context to tailor the notes */
  audience?: 'parents' | 'boosters' | 'clients' | 'staff';
}

// ============================================================================
// SSE Stream Reader
// ============================================================================

/**
 * Stream AI-generated presentation notes for each set.
 *
 * Calls POST `/api/ai/presentation/notes` with formation context.
 * Returns an AbortController for cancellation.
 *
 * SSE events:
 * - { type: 'note', data: { setIndex, setName, content } }
 * - { type: 'done' }
 * - { type: 'error', error: string }
 */
export function streamPresentationNotes(
  params: PresentationNotesRequest,
  token: string,
  callbacks: {
    onNote: (note: PresentationNote) => void;
    onDone: () => void;
    onError: (err: Error) => void;
  },
): AbortController {
  const controller = new AbortController();

  fetch(buildApiUrl('/ai/presentation/notes'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Presentation notes generation failed (${res.status})`);

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onError(new Error('No response body'));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let timedOut = false;

      const resetTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          timedOut = true;
          callbacks.onError(new Error('Stream timed out — AI took too long to respond'));
          reader.cancel();
        }, 90_000);
      };

      resetTimeout();

      try {
        while (true) {
          if (controller.signal.aborted) break;
          const { done, value } = await reader.read();
          if (done) break;
          resetTimeout();

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const json = line.slice(6).trim();
            if (!json) continue;
            try {
              const event = JSON.parse(json);
              if (event.type === 'note' && event.data) {
                callbacks.onNote(event.data);
              } else if (event.type === 'done') {
                callbacks.onDone();
              } else if (event.type === 'error') {
                callbacks.onError(new Error(event.error));
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        if (!controller.signal.aborted && !timedOut) {
          callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        reader.releaseLock();
      }
    })
    .catch((err) => {
      if (!controller.signal.aborted) {
        if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
          callbacks.onError(new Error('Unable to connect to AI service — check your internet connection'));
        } else {
          callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    });

  return controller;
}

/**
 * Generate presentation notes locally (non-AI fallback).
 *
 * Creates simple descriptive notes based on set names and counts.
 * Used when AI service is unavailable.
 */
export function generateLocalPresentationNotes(
  sets: Array<{ name: string; counts: number; notes?: string }>,
): PresentationNote[] {
  return sets.map((set, index) => ({
    setIndex: index,
    setName: set.name,
    content: set.notes
      ? set.notes
      : `${set.name}: ${set.counts} counts. ${getSetDescription(set.name)}`,
  }));
}

function getSetDescription(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('opener')) return 'Opening formation establishes the visual theme.';
  if (lower.includes('ballad')) return 'Flowing movement complements the musical passage.';
  if (lower.includes('closer') || lower.includes('finale')) return 'Dynamic closer builds energy to the finish.';
  if (lower.includes('drill')) return 'Precision movement showcasing technique.';
  return 'Transition between visual forms.';
}
