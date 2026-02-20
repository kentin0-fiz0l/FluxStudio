/**
 * Beat Detection Web Worker
 *
 * Runs the onset-detection algorithm off the main thread so the UI
 * stays responsive during analysis of large audio files.
 *
 * Communication:
 *   Main → Worker: { channelData: Float32Array, sampleRate: number, duration: number }
 *   Worker → Main: { beatMap: BeatMap } | { error: string }
 *
 * channelData should be transferred (not copied) for performance.
 */

interface BeatMap {
  bpm: number;
  beats: number[];
  onsets: number[];
  confidence: number;
}

function detectBeatsCore(
  channelData: Float32Array,
  sampleRate: number,
  duration: number,
): BeatMap {
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

  // Estimate BPM from inter-onset intervals
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

  // Generate beat grid from detected BPM
  const beatInterval = 60 / detectedBpm;
  const beats: number[] = [];

  // Find best phase offset
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

// Worker message handler
self.onmessage = (e: MessageEvent<{ channelData: Float32Array; sampleRate: number; duration: number }>) => {
  try {
    const { channelData, sampleRate, duration } = e.data;
    const beatMap = detectBeatsCore(channelData, sampleRate, duration);
    self.postMessage({ beatMap });
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : 'Beat detection failed' });
  }
};
