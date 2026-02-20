/**
 * Beat Detection Service
 *
 * Analyzes an AudioBuffer to detect beat positions and tempo.
 * Uses onset-detection via energy flux in the frequency domain.
 *
 * The heavy computation runs in a Web Worker to avoid blocking the UI.
 * Falls back to main-thread execution if the worker fails to load.
 *
 * Results are cached in IndexedDB keyed by a hash of the audio data
 * so re-opening the same song doesn't re-analyze.
 */

import type { BeatMap } from '../contexts/metmap/types';
import { db } from './db';

// ---------------------------------------------------------------------------
// Web Worker dispatch with main-thread fallback
// ---------------------------------------------------------------------------

/**
 * Run beat detection in a Web Worker.
 * Transfers the Float32Array for zero-copy performance.
 */
function detectBeatsInWorker(
  channelData: Float32Array,
  sampleRate: number,
  duration: number,
): Promise<BeatMap> {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(
        new URL('../workers/beatDetection.worker.ts', import.meta.url),
        { type: 'module' },
      );

      worker.onmessage = (e: MessageEvent<{ beatMap?: BeatMap; error?: string }>) => {
        worker.terminate();
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else if (e.data.beatMap) {
          resolve(e.data.beatMap);
        } else {
          reject(new Error('Invalid worker response'));
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };

      // Copy channelData so we can transfer it (getChannelData returns a view)
      const copy = new Float32Array(channelData);
      worker.postMessage(
        { channelData: copy, sampleRate, duration },
        [copy.buffer], // Transfer
      );
    } catch (err) {
      reject(err);
    }
  });
}

// ---------------------------------------------------------------------------
// Main-thread fallback (same algorithm as the worker)
// ---------------------------------------------------------------------------

function detectBeatsMainThread(
  channelData: Float32Array,
  sampleRate: number,
  duration: number,
): BeatMap {
  const windowSize = 1024;
  const hopSize = 512;
  const numWindows = Math.floor((channelData.length - windowSize) / hopSize);

  const energies: number[] = [];
  for (let i = 0; i < numWindows; i++) {
    const offset = i * hopSize;
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += channelData[offset + j] ** 2;
    }
    energies.push(energy / windowSize);
  }

  const flux: number[] = [0];
  for (let i = 1; i < energies.length; i++) {
    const diff = energies[i] - energies[i - 1];
    flux.push(Math.max(0, diff));
  }

  const thresholdWindowSize = 20;
  const multiplier = 1.4;
  const onsets: number[] = [];

  for (let i = thresholdWindowSize; i < flux.length - thresholdWindowSize; i++) {
    const window = flux.slice(i - thresholdWindowSize, i + thresholdWindowSize);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const stdDev = Math.sqrt(
      window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length,
    );
    const threshold = mean + multiplier * stdDev;

    if (flux[i] > threshold && flux[i] >= flux[i - 1] && flux[i] >= flux[i + 1]) {
      const timeInSeconds = (i * hopSize) / sampleRate;
      if (onsets.length === 0 || timeInSeconds - onsets[onsets.length - 1] > 0.1) {
        onsets.push(timeInSeconds);
      }
    }
  }

  const intervals: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    intervals.push(onsets[i] - onsets[i - 1]);
  }

  const bpmCandidates = intervals
    .map(interval => 60 / interval)
    .filter(bpm => bpm >= 40 && bpm <= 240);

  let detectedBpm = 120;
  let confidence = 0;

  if (bpmCandidates.length > 0) {
    const bins = new Map<number, number>();
    for (const bpm of bpmCandidates) {
      const binKey = Math.round(bpm / 2) * 2;
      bins.set(binKey, (bins.get(binKey) || 0) + 1);
    }

    let maxCount = 0;
    for (const [bpm, count] of bins) {
      if (count > maxCount) {
        maxCount = count;
        detectedBpm = bpm;
      }
    }

    confidence = Math.min(1, maxCount / (bpmCandidates.length * 0.5));
  }

  const beatInterval = 60 / detectedBpm;
  const beats: number[] = [];

  let bestOffset = 0;
  let bestScore = 0;
  const searchSteps = 20;
  for (let step = 0; step < searchSteps; step++) {
    const offset = (step / searchSteps) * beatInterval;
    let score = 0;
    for (let t = offset; t < duration; t += beatInterval) {
      for (const onset of onsets) {
        if (Math.abs(onset - t) < 0.05) {
          score++;
          break;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }

  for (let t = bestOffset; t < duration; t += beatInterval) {
    beats.push(Math.round(t * 1000) / 1000);
  }

  return {
    bpm: Math.round(detectedBpm * 10) / 10,
    beats,
    onsets: onsets.map(o => Math.round(o * 1000) / 1000),
    confidence: Math.round(confidence * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect beats from an AudioBuffer.
 * Runs in a Web Worker when available, falls back to main thread.
 */
export async function detectBeats(audioBuffer: AudioBuffer): Promise<BeatMap> {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const duration = audioBuffer.duration;

  // Try Web Worker first
  if (typeof Worker !== 'undefined') {
    try {
      return await detectBeatsInWorker(channelData, sampleRate, duration);
    } catch {
      // Worker failed to load — fall back to main thread
      console.warn('Beat detection worker failed, falling back to main thread');
    }
  }

  return detectBeatsMainThread(channelData, sampleRate, duration);
}

// ---------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------

async function hashAudioBuffer(buffer: AudioBuffer): Promise<string> {
  const data = buffer.getChannelData(0);
  // Sample first 10000 values for fast hashing
  const sample = data.slice(0, Math.min(10000, data.length));
  const bytes = new Uint8Array(sample.buffer, sample.byteOffset, sample.byteLength);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function detectBeatsWithCache(audioBuffer: AudioBuffer): Promise<BeatMap> {
  const hash = await hashAudioBuffer(audioBuffer);

  // Check cache
  try {
    const cached = await db.table('cachedData').get(hash);
    if (cached?.data) {
      return cached.data as BeatMap;
    }
  } catch {
    // Cache miss or DB error — proceed with detection
  }

  const result = await detectBeats(audioBuffer);

  // Cache result
  try {
    await db.table('cachedData').put({ id: hash, data: result, createdAt: new Date().toISOString() });
  } catch {
    // Non-critical — detection still succeeded
  }

  return result;
}
