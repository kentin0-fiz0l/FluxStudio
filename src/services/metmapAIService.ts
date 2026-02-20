/**
 * MetMap AI Service — client-side API calls for MetMap AI endpoints.
 *
 * Sprint 34: Streaming SSE for song analysis, chord suggestions, practice insights.
 */

import { getApiUrl } from '../utils/apiHelpers';

interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

/**
 * Parse SSE events from a ReadableStream.
 */
async function readSSEStream(
  response: Response,
  callbacks: StreamCallbacks,
  signal: AbortSignal
) {
  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error('No response body'));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

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
    if (!signal.aborted) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Stream song analysis from the AI.
 * Returns an AbortController to cancel the request.
 */
export function streamSongAnalysis(
  songId: string,
  token: string,
  focus: 'structure' | 'harmony' | 'arrangement' | 'all',
  callbacks: StreamCallbacks
): AbortController {
  const controller = new AbortController();

  fetch(getApiUrl('/api/ai/metmap/analyze-song'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ songId, focus }),
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
      return readSSEStream(res, callbacks, controller.signal);
    })
    .catch((err) => {
      if (!controller.signal.aborted) {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    });

  return controller;
}

/**
 * Stream chord suggestions for a specific section.
 */
export function streamChordSuggestions(
  songId: string,
  sectionId: string | undefined,
  token: string,
  options: { style?: string; request?: string },
  callbacks: StreamCallbacks
): AbortController {
  const controller = new AbortController();

  fetch(getApiUrl('/api/ai/metmap/suggest-chords'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ songId, sectionId, ...options }),
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Chord suggestions failed (${res.status})`);
      return readSSEStream(res, callbacks, controller.signal);
    })
    .catch((err) => {
      if (!controller.signal.aborted) {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    });

  return controller;
}

/**
 * Stream practice insights.
 */
export function streamPracticeInsights(
  songId: string,
  token: string,
  callbacks: StreamCallbacks
): AbortController {
  const controller = new AbortController();

  fetch(getApiUrl('/api/ai/metmap/practice-insights'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ songId }),
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Practice insights failed (${res.status})`);
      return readSSEStream(res, callbacks, controller.signal);
    })
    .catch((err) => {
      if (!controller.signal.aborted) {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    });

  return controller;
}

// ==================== Chord Grid Parser (T4) ====================

export interface ParsedChordGrid {
  label: string;
  chords: { bar: number; beat: number; symbol: string; durationBeats: number }[];
}

/**
 * Parse chord grids from Claude's markdown response.
 * Looks for lines matching: | Cmaj7 . . . | Am7 . . . |
 */
export function parseChordGridsFromResponse(text: string): ParsedChordGrid[] {
  const results: ParsedChordGrid[] = [];
  const lines = text.split('\n');

  let currentLabel = '';
  let currentBars: string[][] = [];

  function flushGrid() {
    if (currentBars.length === 0) return;

    const chords: ParsedChordGrid['chords'] = [];
    for (let barIdx = 0; barIdx < currentBars.length; barIdx++) {
      const beats = currentBars[barIdx];
      for (let beatIdx = 0; beatIdx < beats.length; beatIdx++) {
        const token = beats[beatIdx];
        if (token !== '.' && token !== '') {
          // Count duration (consecutive dots after this chord)
          let duration = 1;
          for (let d = beatIdx + 1; d < beats.length; d++) {
            if (beats[d] === '.') duration++;
            else break;
          }
          chords.push({
            bar: barIdx + 1,
            beat: beatIdx + 1,
            symbol: token,
            durationBeats: duration,
          });
        }
      }
    }

    if (chords.length > 0) {
      results.push({
        label: currentLabel || `Option ${results.length + 1}`,
        chords,
      });
    }

    currentBars = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect option labels: **Option 1: Jazz variation**
    const labelMatch = trimmed.match(/^\*\*(.+?)\*\*/);
    if (labelMatch && !trimmed.includes('|')) {
      flushGrid();
      currentLabel = labelMatch[1].replace(/:\s*$/, '');
      continue;
    }

    // Detect bar grid lines: | Cmaj7 . . . | Am7 . . . |
    if (trimmed.includes('|') && /\|[^|]+\|/.test(trimmed)) {
      const barSegments = trimmed
        .split('|')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Check if this looks like a chord grid (contains chord symbols or dots)
      const isChordGrid = barSegments.some(seg =>
        /[A-G][#b]?/.test(seg) || seg.split(/\s+/).every(t => t === '.' || /^[A-G]/.test(t))
      );

      if (isChordGrid) {
        for (const seg of barSegments) {
          const beats = seg.split(/\s+/).filter(t => t.length > 0);
          currentBars.push(beats);
        }
        continue;
      }
    }

    // Non-grid line — flush if we had a grid building
    if (currentBars.length > 0 && trimmed !== '') {
      flushGrid();
    }
  }

  flushGrid();
  return results;
}
