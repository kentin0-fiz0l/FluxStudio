/**
 * Latency Calibration Utility
 *
 * Measures the user's audio-to-tap latency and stores a compensation value.
 * This helps ensure the visual beat indicator and audio clicks feel synchronized.
 */

const STORAGE_KEY = 'metmap-latency-offset';
const DEFAULT_LATENCY_OFFSET = 0;

export interface CalibrationState {
  /** Measured taps (timestamps relative to expected beat time) */
  taps: number[];
  /** Calculated average offset in milliseconds (positive = user taps late) */
  averageOffset: number;
  /** Whether calibration is complete */
  isComplete: boolean;
  /** Number of taps required for calibration */
  requiredTaps: number;
}

/**
 * Load saved latency offset from localStorage
 */
export function loadLatencyOffset(): number {
  if (typeof window === 'undefined') return DEFAULT_LATENCY_OFFSET;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const value = parseInt(stored, 10);
      if (!isNaN(value) && value >= -200 && value <= 200) {
        return value;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_LATENCY_OFFSET;
}

/**
 * Save latency offset to localStorage
 */
export function saveLatencyOffset(offset: number): void {
  if (typeof window === 'undefined') return;
  try {
    // Clamp to reasonable range
    const clamped = Math.max(-200, Math.min(200, Math.round(offset)));
    localStorage.setItem(STORAGE_KEY, clamped.toString());
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear saved latency offset
 */
export function clearLatencyOffset(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Create initial calibration state
 */
export function createCalibrationState(requiredTaps = 8): CalibrationState {
  return {
    taps: [],
    averageOffset: 0,
    isComplete: false,
    requiredTaps,
  };
}

/**
 * Record a tap during calibration
 * @param state Current calibration state
 * @param offsetMs Offset in milliseconds (positive = tap was late, negative = early)
 * @returns Updated calibration state
 */
export function recordCalibrationTap(
  state: CalibrationState,
  offsetMs: number
): CalibrationState {
  // Ignore outliers (> 300ms off)
  if (Math.abs(offsetMs) > 300) {
    return state;
  }

  const taps = [...state.taps, offsetMs];
  const isComplete = taps.length >= state.requiredTaps;

  // Calculate average offset if complete
  let averageOffset = 0;
  if (isComplete) {
    // Remove highest and lowest values for more accurate average
    const sorted = [...taps].sort((a, b) => a - b);
    const trimmed = sorted.slice(1, -1);
    averageOffset = Math.round(
      trimmed.reduce((sum, v) => sum + v, 0) / trimmed.length
    );
  }

  return {
    ...state,
    taps,
    averageOffset,
    isComplete,
  };
}

/**
 * Get calibration progress as percentage
 */
export function getCalibrationProgress(state: CalibrationState): number {
  return Math.min(100, Math.round((state.taps.length / state.requiredTaps) * 100));
}

/**
 * Format offset for display
 */
export function formatOffset(offsetMs: number): string {
  if (offsetMs === 0) return '0ms (in sync)';
  if (offsetMs > 0) return `+${offsetMs}ms (you tap late)`;
  return `${offsetMs}ms (you tap early)`;
}
