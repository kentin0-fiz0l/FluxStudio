/**
 * Audio Analysis Service — BPM detection and waveform extraction
 *
 * Uses Web Audio API for:
 * - BPM detection via autocorrelation
 * - Waveform data extraction for timeline visualization
 * - Beat marker generation at detected tempo
 */

// ============================================================================
// Types
// ============================================================================

export interface AudioAnalysisResult {
  bpm: number;
  confidence: number; // 0-1
  waveform: Float32Array; // Downsampled amplitude envelope
  beats: number[]; // Timestamps in ms
  duration: number; // Total duration in ms
}

export interface BeatMarker {
  time: number; // ms
  beat: number; // 1-indexed beat number
  measure: number; // 1-indexed measure number
  beatInMeasure: number; // 1-indexed beat within measure
}

// ============================================================================
// BPM Detection (autocorrelation)
// ============================================================================

/**
 * Detect BPM from an AudioBuffer using autocorrelation on a filtered,
 * energy-enveloped signal.
 */
function detectBPM(buffer: AudioBuffer): { bpm: number; confidence: number } {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);

  // Downsample to ~11025 Hz for efficiency
  const downsampleFactor = Math.max(1, Math.floor(sampleRate / 11025));
  const downsampled = new Float32Array(Math.floor(channelData.length / downsampleFactor));
  for (let i = 0; i < downsampled.length; i++) {
    downsampled[i] = Math.abs(channelData[i * downsampleFactor]);
  }

  const effectiveSR = sampleRate / downsampleFactor;

  // Compute onset-strength envelope: difference of adjacent samples (energy onset)
  const envelope = new Float32Array(downsampled.length - 1);
  for (let i = 0; i < envelope.length; i++) {
    envelope[i] = Math.max(0, downsampled[i + 1] - downsampled[i]);
  }

  // Autocorrelation over BPM range 60-200
  const minLag = Math.floor(effectiveSR * 60 / 200); // 200 BPM
  const maxLag = Math.floor(effectiveSR * 60 / 60);  // 60 BPM
  const acLength = Math.min(envelope.length, maxLag + 1);

  let bestLag = minLag;
  let bestCorr = -Infinity;
  let totalCorr = 0;
  let corrCount = 0;

  for (let lag = minLag; lag <= Math.min(maxLag, acLength - 1); lag++) {
    let corr = 0;
    const limit = Math.min(acLength - lag, 8192); // Limit computation window
    for (let i = 0; i < limit; i++) {
      corr += envelope[i] * envelope[i + lag];
    }
    totalCorr += corr;
    corrCount++;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  const bpm = Math.round((effectiveSR * 60) / bestLag);
  const avgCorr = corrCount > 0 ? totalCorr / corrCount : 0;
  const confidence = avgCorr > 0 ? Math.min(1, bestCorr / (avgCorr * 3)) : 0;

  // Prefer common tempos: if detected BPM is a multiple/division, adjust
  const normalizedBPM = normalizeBPM(bpm);

  return { bpm: normalizedBPM, confidence: Math.round(confidence * 100) / 100 };
}

/** Normalize BPM to a common range (80-180) by halving or doubling */
function normalizeBPM(bpm: number): number {
  while (bpm > 180) bpm /= 2;
  while (bpm < 60) bpm *= 2;
  return Math.round(bpm);
}

// ============================================================================
// Waveform Extraction
// ============================================================================

/** Extract a downsampled waveform envelope for timeline visualization */
function extractWaveform(buffer: AudioBuffer, targetSamples = 2000): Float32Array {
  const channelData = buffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / targetSamples);
  const waveform = new Float32Array(targetSamples);

  for (let i = 0; i < targetSamples; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channelData.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    waveform[i] = max;
  }

  return waveform;
}

// ============================================================================
// Beat Marker Generation
// ============================================================================

/** Generate beat markers from BPM and duration */
export function generateBeatMarkers(
  bpm: number,
  durationMs: number,
  beatsPerMeasure = 4,
  offsetMs = 0,
): BeatMarker[] {
  if (bpm <= 0 || durationMs <= 0) return [];

  const beatIntervalMs = 60000 / bpm;
  const markers: BeatMarker[] = [];
  let beat = 1;

  for (let time = offsetMs; time < durationMs; time += beatIntervalMs) {
    const measure = Math.ceil(beat / beatsPerMeasure);
    const beatInMeasure = ((beat - 1) % beatsPerMeasure) + 1;
    markers.push({ time: Math.round(time), beat, measure, beatInMeasure });
    beat++;
  }

  return markers;
}

/** Snap a time value to the nearest beat marker */
export function snapToBeat(timeMs: number, bpm: number, offsetMs = 0): number {
  if (bpm <= 0) return timeMs;
  const interval = 60000 / bpm;
  const relative = timeMs - offsetMs;
  const beatIndex = Math.round(relative / interval);
  return Math.round(offsetMs + beatIndex * interval);
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Analyze an audio file: detect BPM, extract waveform, generate beat markers.
 * Uses Web Audio API to decode the file.
 */
export async function analyzeAudio(file: File): Promise<AudioAnalysisResult> {
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const durationMs = Math.round(audioBuffer.duration * 1000);
    const { bpm, confidence } = detectBPM(audioBuffer);
    const waveform = extractWaveform(audioBuffer);
    const beatMarkers = generateBeatMarkers(bpm, durationMs);

    return {
      bpm,
      confidence,
      waveform,
      beats: beatMarkers.map((m) => m.time),
      duration: durationMs,
    };
  } finally {
    await audioContext.close();
  }
}

/**
 * Analyze from an AudioBuffer directly (if already decoded).
 */
export function analyzeAudioBuffer(buffer: AudioBuffer): AudioAnalysisResult {
  const durationMs = Math.round(buffer.duration * 1000);
  const { bpm, confidence } = detectBPM(buffer);
  const waveform = extractWaveform(buffer);
  const beatMarkers = generateBeatMarkers(bpm, durationMs);

  return {
    bpm,
    confidence,
    waveform,
    beats: beatMarkers.map((m) => m.time),
    duration: durationMs,
  };
}
