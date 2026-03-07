/**
 * DrillMusicAIService - AI-enhanced drill set suggestions via SSE streaming
 *
 * Phase 5: Auto-Set Generation from Music
 *
 * Calls the AI endpoint to get smarter set placement suggestions
 * based on musical analysis. Uses the same SSE streaming pattern
 * as metmapAIService.ts.
 */

import { buildApiUrl } from '../config/environment';

// ============================================================================
// TYPES
// ============================================================================

interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

// ============================================================================
// SSE STREAM READER
// ============================================================================

/**
 * Parse SSE events from a ReadableStream.
 * Replicates the pattern from metmapAIService.ts with 60-second timeout.
 */
async function readSSEStream(
  response: Response,
  callbacks: StreamCallbacks,
  signal: AbortSignal,
) {
  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error('No response body'));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const resetTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timedOut = true;
      callbacks.onError(new Error('Stream timed out — no response from AI service'));
      reader.cancel();
    }, 60_000);
  };

  resetTimeout();

  try {
    while (true) {
      if (signal.aborted) break;

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
          if (event.type === 'chunk' && event.content) {
            callbacks.onChunk(event.content);
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
    if (!signal.aborted && !timedOut) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    reader.releaseLock();
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Stream AI-enhanced set suggestions for a song.
 *
 * Calls POST `/api/ai/drill/suggest-sets` with `{ songId }`.
 * Returns an AbortController for cancellation.
 */
/**
 * Stream AI-generated show formations from music analysis.
 *
 * Calls POST `/api/ai/drill/generate-show` with performer list,
 * sections, and tempo map. The AI generates positions for each set
 * based on musical structure.
 *
 * SSE events:
 * - { type: 'status', message: '...' } — progress updates
 * - { type: 'set', data: { name, counts, positions, notes } } — a generated set
 * - { type: 'done' }
 * - { type: 'error', error: '...' }
 */
export function streamShowGeneration(
  params: {
    songId: string;
    performers: Array<{ id: string; name: string; section?: string; instrument?: string }>;
    sections: Array<{ name: string; bars: number; timeSignature: string; tempoStart: number; tempoEnd?: number }>;
    fieldType?: string;
    bandSize: number;
  },
  token: string,
  callbacks: {
    onStatus: (message: string) => void;
    onSet: (set: { name: string; counts: number; positions: Record<string, { x: number; y: number }>; notes?: string }) => void;
    onDone: () => void;
    onError: (err: Error) => void;
  },
): AbortController {
  const controller = new AbortController();

  fetch(buildApiUrl('/ai/drill/generate-show'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Show generation failed (${res.status})`);

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
        }, 120_000); // 2 minutes for full show generation
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
              if (event.type === 'status' && event.message) {
                callbacks.onStatus(event.message);
              } else if (event.type === 'set' && event.data) {
                callbacks.onSet(event.data);
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

export function streamSetSuggestions(
  songId: string,
  token: string,
  callbacks: {
    onChunk: (text: string) => void;
    onDone: () => void;
    onError: (err: Error) => void;
  },
): AbortController {
  const controller = new AbortController();

  fetch(buildApiUrl('/ai/drill/suggest-sets'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ songId }),
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Set suggestion failed (${res.status})`);
      return readSSEStream(res, callbacks, controller.signal);
    })
    .catch((err) => {
      if (!controller.signal.aborted) {
        if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
          callbacks.onError(
            new Error('Unable to connect to AI service — check your internet connection'),
          );
        } else {
          callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    });

  return controller;
}
