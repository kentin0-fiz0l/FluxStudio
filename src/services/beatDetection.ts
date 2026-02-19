/**
 * Beat Detection Service
 *
 * Analyzes an AudioBuffer to detect beat positions and tempo.
 * Uses onset-detection via energy flux in the frequency domain.
 *
 * Results are cached in IndexedDB keyed by a hash of the audio data
 * so re-opening the same song doesn't re-analyze.
 */

import type { BeatMap } from '../contexts/metmap/types';
import { db } from './db';

// ---------------------------------------------------------------------------
// Simple onset detection using spectral energy flux
// ---------------------------------------------------------------------------

/**
 * Detect beats from an AudioBuffer using energy-based onset detection.
 *
 * This is a lightweight pure-JS implementation that avoids WASM dependencies.
 * It works by:
 * 1. Down-mixing to mono
 * 2. Computing energy in short windows
 * 3. Detecting onsets where energy increases sharply
 * 4. Estimating BPM from inter-onset intervals
 */
export async function detectBeats(audioBuffer: AudioBuffer): Promise<BeatMap> {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0); // mono

  // Window size: ~23ms at 44.1kHz = 1024 samples
  const windowSize = 1024;
  const hopSize = 512;
  const numWindows = Math.floor((channelData.length - windowSize) / hopSize);

  // Compute energy per window
  const energies: number[] = [];
  for (let i = 0; i < numWindows; i++) {
    const offset = i * hopSize;
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += channelData[offset + j] ** 2;
    }
    energies.push(energy / windowSize);
  }

  // Compute spectral flux (positive energy differences)
  const flux: number[] = [0];
  for (let i = 1; i < energies.length; i++) {
    const diff = energies[i] - energies[i - 1];
    flux.push(Math.max(0, diff));
  }

  // Adaptive threshold: local mean + multiplier * local std dev
  const thresholdWindowSize = 20;
  const multiplier = 1.4;
  const onsets: number[] = [];

  for (let i = thresholdWindowSize; i < flux.length - thresholdWindowSize; i++) {
    const window = flux.slice(i - thresholdWindowSize, i + thresholdWindowSize);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const stdDev = Math.sqrt(
      window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length
    );
    const threshold = mean + multiplier * stdDev;

    if (flux[i] > threshold && flux[i] >= flux[i - 1] && flux[i] >= flux[i + 1]) {
      const timeInSeconds = (i * hopSize) / sampleRate;
      // Minimum 100ms between onsets
      if (onsets.length === 0 || timeInSeconds - onsets[onsets.length - 1] > 0.1) {
        onsets.push(timeInSeconds);
      }
    }
  }

  // Estimate BPM from inter-onset intervals
  const intervals: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    intervals.push(onsets[i] - onsets[i - 1]);
  }

  // Find the most common interval using histogram
  const bpmCandidates = intervals
    .map(interval => 60 / interval)
    .filter(bpm => bpm >= 40 && bpm <= 240);

  let detectedBpm = 120; // fallback
  let confidence = 0;

  if (bpmCandidates.length > 0) {
    // Group into bins of ~2 BPM
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

  // Generate beat grid from detected BPM
  const beatInterval = 60 / detectedBpm;
  const duration = audioBuffer.duration;
  const beats: number[] = [];

  // Find the best phase offset by maximizing alignment with onsets
  let bestOffset = 0;
  let bestScore = 0;
  const searchSteps = 20;
  for (let step = 0; step < searchSteps; step++) {
    const offset = (step / searchSteps) * beatInterval;
    let score = 0;
    for (let t = offset; t < duration; t += beatInterval) {
      // Check if any onset is within 50ms of this beat
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
