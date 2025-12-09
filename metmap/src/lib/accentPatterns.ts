/**
 * Accent Patterns - Predefined accent patterns for various time signatures
 *
 * Values represent volume multipliers:
 * - 1.0 = Full accent (downbeat)
 * - 0.7 = Medium accent
 * - 0.5 = Normal beat
 * - 0.3 = Ghost note / light beat
 * - 0.0 = Silent (for complex patterns)
 */

export interface AccentPatternDefinition {
  name: string;
  pattern: number[];
  description?: string;
}

export interface TimeSignaturePatterns {
  default: number[];
  patterns: AccentPatternDefinition[];
}

export const ACCENT_PATTERNS: Record<string, TimeSignaturePatterns> = {
  // 4/4 Time
  '4/4': {
    default: [1, 0.5, 0.5, 0.5],
    patterns: [
      { name: 'Standard', pattern: [1, 0.5, 0.5, 0.5], description: 'Accent on 1' },
      { name: 'Backbeat', pattern: [0.5, 1, 0.5, 1], description: 'Accent on 2 & 4 (rock/pop)' },
      { name: 'Four on Floor', pattern: [1, 1, 1, 1], description: 'All beats equal (dance)' },
      { name: '1 and 3', pattern: [1, 0.5, 0.7, 0.5], description: 'Accent on 1 and 3' },
      { name: 'Soft', pattern: [0.7, 0.3, 0.5, 0.3], description: 'Light accents' },
    ],
  },

  // 3/4 Time (Waltz)
  '3/4': {
    default: [1, 0.5, 0.5],
    patterns: [
      { name: 'Standard', pattern: [1, 0.5, 0.5], description: 'Accent on 1' },
      { name: 'Waltz', pattern: [1, 0.3, 0.5], description: 'Strong 1, light 2' },
      { name: 'Mazurka', pattern: [0.7, 1, 0.5], description: 'Accent on 2 (Polish dance)' },
      { name: 'Even', pattern: [0.7, 0.7, 0.7], description: 'All beats equal' },
    ],
  },

  // 2/4 Time (March)
  '2/4': {
    default: [1, 0.5],
    patterns: [
      { name: 'Standard', pattern: [1, 0.5], description: 'Accent on 1' },
      { name: 'March', pattern: [1, 0.7], description: 'Strong downbeat' },
      { name: 'Polka', pattern: [1, 0.3], description: 'Very light 2' },
    ],
  },

  // 6/8 Time (Compound duple)
  '6/8': {
    default: [1, 0.3, 0.5, 0.7, 0.3, 0.5],
    patterns: [
      { name: 'Standard', pattern: [1, 0.3, 0.5, 0.7, 0.3, 0.5], description: 'Accent on 1 and 4' },
      { name: 'Irish Jig', pattern: [1, 0.3, 0.3, 0.7, 0.3, 0.3], description: 'Strong 1 and 4' },
      { name: 'Blues Shuffle', pattern: [1, 0, 0.5, 0.7, 0, 0.5], description: 'Shuffle feel' },
      { name: 'Even', pattern: [0.7, 0.5, 0.5, 0.7, 0.5, 0.5], description: 'Light swing' },
    ],
  },

  // 9/8 Time (Compound triple)
  '9/8': {
    default: [1, 0.3, 0.5, 0.7, 0.3, 0.5, 0.7, 0.3, 0.5],
    patterns: [
      { name: 'Standard', pattern: [1, 0.3, 0.5, 0.7, 0.3, 0.5, 0.7, 0.3, 0.5], description: '3 groups of 3' },
      { name: 'Slip Jig', pattern: [1, 0.3, 0.3, 0.7, 0.3, 0.3, 0.7, 0.3, 0.3], description: 'Irish slip jig' },
    ],
  },

  // 12/8 Time (Compound quadruple)
  '12/8': {
    default: [1, 0.3, 0.5, 0.7, 0.3, 0.5, 0.7, 0.3, 0.5, 0.7, 0.3, 0.5],
    patterns: [
      { name: 'Standard', pattern: [1, 0.3, 0.5, 0.7, 0.3, 0.5, 0.7, 0.3, 0.5, 0.7, 0.3, 0.5], description: '4 groups of 3' },
      { name: 'Blues', pattern: [1, 0, 0.5, 0.7, 0, 0.5, 0.7, 0, 0.5, 0.7, 0, 0.5], description: 'Slow blues' },
    ],
  },

  // 5/4 Time (Irregular)
  '5/4': {
    default: [1, 0.5, 0.5, 0.7, 0.5],
    patterns: [
      { name: '3+2', pattern: [1, 0.5, 0.5, 0.7, 0.5], description: 'Groups of 3 then 2' },
      { name: '2+3', pattern: [1, 0.5, 0.7, 0.5, 0.5], description: 'Groups of 2 then 3' },
      { name: 'Take Five', pattern: [1, 0.3, 0.5, 0.7, 0.3], description: 'Jazz style (Dave Brubeck)' },
    ],
  },

  // 7/8 Time (Irregular)
  '7/8': {
    default: [1, 0.5, 0.7, 0.5, 0.7, 0.5, 0.5],
    patterns: [
      { name: '2+2+3', pattern: [1, 0.5, 0.7, 0.5, 0.7, 0.5, 0.5], description: 'Common grouping' },
      { name: '3+2+2', pattern: [1, 0.5, 0.5, 0.7, 0.5, 0.7, 0.5], description: 'Bulgarian rhythm' },
      { name: '3+4', pattern: [1, 0.5, 0.5, 0.7, 0.5, 0.5, 0.5], description: 'Simple split' },
    ],
  },

  // 7/4 Time
  '7/4': {
    default: [1, 0.5, 0.5, 0.7, 0.5, 0.5, 0.5],
    patterns: [
      { name: '4+3', pattern: [1, 0.5, 0.5, 0.5, 0.7, 0.5, 0.5], description: '4 then 3' },
      { name: '3+4', pattern: [1, 0.5, 0.5, 0.7, 0.5, 0.5, 0.5], description: '3 then 4' },
      { name: 'Money', pattern: [1, 0.5, 0.7, 0.5, 0.7, 0.5, 0.5], description: 'Pink Floyd style' },
    ],
  },

  // 11/8 Time (Irregular)
  '11/8': {
    default: [1, 0.5, 0.5, 0.7, 0.5, 0.5, 0.7, 0.5, 0.7, 0.5, 0.5],
    patterns: [
      { name: '3+3+3+2', pattern: [1, 0.5, 0.5, 0.7, 0.5, 0.5, 0.7, 0.5, 0.5, 0.7, 0.5], description: 'Common grouping' },
      { name: '2+2+3+2+2', pattern: [1, 0.5, 0.7, 0.5, 0.7, 0.5, 0.5, 0.7, 0.5, 0.7, 0.5], description: 'Balkan style' },
    ],
  },
};

// Common time signatures for UI dropdown
export const TIME_SIGNATURES = [
  { display: '4/4', beatsPerMeasure: 4, beatUnit: 4 },
  { display: '3/4', beatsPerMeasure: 3, beatUnit: 4 },
  { display: '2/4', beatsPerMeasure: 2, beatUnit: 4 },
  { display: '6/8', beatsPerMeasure: 6, beatUnit: 8 },
  { display: '9/8', beatsPerMeasure: 9, beatUnit: 8 },
  { display: '12/8', beatsPerMeasure: 12, beatUnit: 8 },
  { display: '5/4', beatsPerMeasure: 5, beatUnit: 4 },
  { display: '7/8', beatsPerMeasure: 7, beatUnit: 8 },
  { display: '7/4', beatsPerMeasure: 7, beatUnit: 4 },
  { display: '11/8', beatsPerMeasure: 11, beatUnit: 8 },
];

/**
 * Get the default accent pattern for a time signature
 */
export function getDefaultAccentPattern(timeSignature: string): number[] {
  const patterns = ACCENT_PATTERNS[timeSignature];
  if (patterns) {
    return [...patterns.default];
  }

  // Fallback: create a basic pattern with accent on beat 1
  const [beatsStr] = timeSignature.split('/');
  const beats = parseInt(beatsStr) || 4;
  return Array(beats).fill(0.5).map((v, i) => i === 0 ? 1 : v);
}

/**
 * Get all available patterns for a time signature
 */
export function getAccentPatterns(timeSignature: string): AccentPatternDefinition[] {
  const patterns = ACCENT_PATTERNS[timeSignature];
  if (patterns) {
    return patterns.patterns;
  }
  return [{ name: 'Standard', pattern: getDefaultAccentPattern(timeSignature) }];
}

/**
 * Create a custom accent pattern by setting specific beats
 */
export function createCustomPattern(beats: number, accents: number[]): number[] {
  const pattern = Array(beats).fill(0.5);
  accents.forEach(beat => {
    if (beat >= 0 && beat < beats) {
      pattern[beat] = 1;
    }
  });
  return pattern;
}
