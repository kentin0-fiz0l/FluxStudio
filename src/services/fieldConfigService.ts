/**
 * Field Configuration Service - FluxStudio
 *
 * Manages field type presets and custom configurations for
 * multiple performance contexts: marching band, indoor, guard, stage, parade.
 */

import type { FieldConfig } from './formationTypes';

// ============================================================================
// FIELD PRESETS
// ============================================================================

export const NCAA_FOOTBALL_FIELD: FieldConfig = {
  type: 'ncaa_football',
  name: 'NCAA Football Field',
  width: 120,       // 100 yards + 2x10 end zones
  height: 53.33,    // 160 feet = 53.33 yards
  yardLineInterval: 5,
  hashMarks: {
    front: 20,      // 60 feet from sideline = 20 yards
    back: 20,
  },
  endZoneDepth: 10,
  unit: 'yards',
};

export const NFL_FOOTBALL_FIELD: FieldConfig = {
  type: 'nfl_football',
  name: 'NFL Football Field',
  width: 120,
  height: 53.33,
  yardLineInterval: 5,
  hashMarks: {
    front: 23.58,   // 70 feet 9 inches from sideline
    back: 23.58,
  },
  endZoneDepth: 10,
  unit: 'yards',
};

export const INDOOR_WGI_FIELD: FieldConfig = {
  type: 'indoor_wgi',
  name: 'WGI Indoor Floor',
  width: 30,        // 90 feet = 30 yards
  height: 20,       // 60 feet = 20 yards
  yardLineInterval: 5,
  hashMarks: {
    front: 6.67,    // 20 feet from sideline
    back: 6.67,
  },
  endZoneDepth: 0,
  unit: 'feet',
  customLines: [
    { position: 15, label: 'Center', orientation: 'vertical' },
    { position: 10, label: '10', orientation: 'horizontal' },
  ],
};

export const STAGE_FIELD: FieldConfig = {
  type: 'stage',
  name: 'Stage',
  width: 13.33,     // 40 feet = 13.33 yards
  height: 10,       // 30 feet = 10 yards
  yardLineInterval: 3.33,
  hashMarks: {
    front: 3.33,
    back: 3.33,
  },
  endZoneDepth: 0,
  unit: 'feet',
  customLines: [
    { position: 6.67, label: 'Center', orientation: 'vertical' },
  ],
};

export const PARADE_FIELD: FieldConfig = {
  type: 'parade',
  name: 'Parade Route',
  width: 40,        // Variable; default ~120 feet
  height: 8.33,     // 25 feet wide street
  yardLineInterval: 10,
  hashMarks: {
    front: 4.17,
    back: 4.17,
  },
  endZoneDepth: 0,
  unit: 'feet',
};

// ============================================================================
// PRESET REGISTRY
// ============================================================================

export const FIELD_PRESETS: Record<FieldConfig['type'], FieldConfig> = {
  ncaa_football: NCAA_FOOTBALL_FIELD,
  nfl_football: NFL_FOOTBALL_FIELD,
  indoor_wgi: INDOOR_WGI_FIELD,
  stage: STAGE_FIELD,
  parade: PARADE_FIELD,
  custom: {
    type: 'custom',
    name: 'Custom Field',
    width: 40,
    height: 30,
    yardLineInterval: 5,
    hashMarks: { front: 10, back: 10 },
    endZoneDepth: 0,
    unit: 'yards',
  },
};

/**
 * Get a field preset by type.
 */
export function getFieldPreset(type: FieldConfig['type']): FieldConfig {
  return { ...FIELD_PRESETS[type] };
}

/**
 * Get all available field presets as an array for UI selection.
 */
export function getFieldPresetList(): { type: FieldConfig['type']; name: string; description: string }[] {
  return [
    { type: 'ncaa_football', name: 'NCAA Football', description: '100 yards, college hash marks' },
    { type: 'nfl_football', name: 'NFL Football', description: '100 yards, NFL hash marks' },
    { type: 'indoor_wgi', name: 'Indoor (WGI)', description: '90ft x 60ft indoor floor' },
    { type: 'stage', name: 'Stage', description: '40ft x 30ft performance stage' },
    { type: 'parade', name: 'Parade', description: 'Street parade formation' },
    { type: 'custom', name: 'Custom', description: 'Define your own dimensions' },
  ];
}

/**
 * Create a custom field configuration.
 */
export function createCustomField(
  name: string,
  width: number,
  height: number,
  options: Partial<Pick<FieldConfig, 'yardLineInterval' | 'hashMarks' | 'endZoneDepth' | 'customLines' | 'unit'>> = {},
): FieldConfig {
  return {
    type: 'custom',
    name,
    width,
    height,
    yardLineInterval: options.yardLineInterval ?? 5,
    hashMarks: options.hashMarks ?? { front: height / 4, back: height / 4 },
    endZoneDepth: options.endZoneDepth ?? 0,
    customLines: options.customLines,
    unit: options.unit ?? 'yards',
  };
}

/**
 * Validate a field configuration.
 */
export function validateFieldConfig(config: FieldConfig): string[] {
  const errors: string[] = [];

  if (config.width <= 0) errors.push('Width must be positive');
  if (config.height <= 0) errors.push('Height must be positive');
  if (config.yardLineInterval <= 0) errors.push('Yard line interval must be positive');
  if (config.hashMarks.front < 0) errors.push('Front hash position must be non-negative');
  if (config.hashMarks.back < 0) errors.push('Back hash position must be non-negative');
  if (config.hashMarks.front + config.hashMarks.back > config.height) {
    errors.push('Hash marks overlap (front + back > height)');
  }
  if (config.endZoneDepth < 0) errors.push('End zone depth must be non-negative');
  if (config.endZoneDepth * 2 >= config.width) {
    errors.push('End zones are larger than the field');
  }

  return errors;
}

/**
 * Convert field dimensions to stage dimensions (normalized 0-100 space).
 * Returns the aspect-ratio-corrected stage width and height.
 */
export function fieldToStageDimensions(config: FieldConfig): { stageWidth: number; stageHeight: number } {
  const aspect = config.width / config.height;
  // Use the wider dimension as reference
  if (aspect >= 1) {
    return { stageWidth: 100, stageHeight: 100 / aspect };
  }
  return { stageWidth: 100 * aspect, stageHeight: 100 };
}
