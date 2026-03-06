import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { FieldSetupDialog } from './FieldSetupDialog';
import type { FieldConfig } from '../../services/formationTypes';

// ---------------------------------------------------------------------------
// Mock the field config service
// ---------------------------------------------------------------------------

vi.mock('../../services/fieldConfigService', () => ({
  getFieldPresetList: () => [
    { type: 'ncaa_football', name: 'NCAA Football', description: '100 yards, college hash marks' },
    { type: 'nfl_football', name: 'NFL Football', description: '100 yards, NFL hash marks' },
    { type: 'indoor_wgi', name: 'Indoor (WGI)', description: '90ft x 60ft indoor floor' },
    { type: 'stage', name: 'Stage', description: '40ft x 30ft performance stage' },
    { type: 'parade', name: 'Parade', description: 'Street parade formation' },
    { type: 'custom', name: 'Custom', description: 'Define your own dimensions' },
  ],
  getFieldPreset: (type: string) => {
    const presets: Record<string, FieldConfig> = {
      ncaa_football: {
        type: 'ncaa_football',
        name: 'NCAA Football Field',
        width: 120,
        height: 53.33,
        yardLineInterval: 5,
        hashMarks: { front: 20, back: 20 },
        endZoneDepth: 10,
        unit: 'yards' as const,
      },
      custom: {
        type: 'custom',
        name: 'Custom Field',
        width: 40,
        height: 30,
        yardLineInterval: 5,
        hashMarks: { front: 7.5, back: 7.5 },
        endZoneDepth: 0,
        unit: 'yards' as const,
      },
    };
    return presets[type] ?? presets.ncaa_football;
  },
  createCustomField: (name: string, width: number, height: number, options: Record<string, unknown> = {}) => ({
    type: 'custom',
    name,
    width,
    height,
    yardLineInterval: (options.yardLineInterval as number) ?? 5,
    hashMarks: (options.hashMarks as { front: number; back: number }) ?? { front: height / 4, back: height / 4 },
    endZoneDepth: (options.endZoneDepth as number) ?? 0,
    unit: (options.unit as string) ?? 'yards',
  }),
  validateFieldConfig: (config: FieldConfig) => {
    const errors: string[] = [];
    if (config.width <= 0) errors.push('Width must be positive');
    if (config.height <= 0) errors.push('Height must be positive');
    return errors;
  },
}));

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const mockFieldConfig: FieldConfig = {
  type: 'ncaa_football',
  name: 'NCAA Football Field',
  width: 120,
  height: 53.33,
  yardLineInterval: 5,
  hashMarks: { front: 20, back: 20 },
  endZoneDepth: 10,
  unit: 'yards',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FieldSetupDialog', () => {
  const onApply = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders dialog with header and field type grid', () => {
    render(
      <FieldSetupDialog
        currentConfig={mockFieldConfig}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('dialog', { name: /field setup/i })).toBeInTheDocument();
    expect(screen.getByText('Field Setup')).toBeInTheDocument();
    expect(screen.getByText('Select Field Type')).toBeInTheDocument();
  });

  test('shows all preset options', () => {
    render(
      <FieldSetupDialog
        currentConfig={mockFieldConfig}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('NCAA Football')).toBeInTheDocument();
    expect(screen.getByText('NFL Football')).toBeInTheDocument();
    expect(screen.getByText('Indoor (WGI)')).toBeInTheDocument();
    expect(screen.getByText('Stage')).toBeInTheDocument();
    expect(screen.getByText('Parade')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  test('highlights the currently selected preset', () => {
    render(
      <FieldSetupDialog
        currentConfig={mockFieldConfig}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    const ncaaButton = screen.getByText('NCAA Football').closest('button')!;
    expect(ncaaButton.className).toContain('border-blue-500');
  });

  test('clicking a preset selects it', async () => {
    const { user } = render(
      <FieldSetupDialog
        currentConfig={mockFieldConfig}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByText('NFL Football'));

    const nflButton = screen.getByText('NFL Football').closest('button')!;
    expect(nflButton.className).toContain('border-blue-500');
  });

  test('selecting Custom preset shows custom configuration inputs', async () => {
    const { user } = render(
      <FieldSetupDialog
        currentConfig={mockFieldConfig}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByText('Custom'));

    expect(screen.getByText('Custom Configuration')).toBeInTheDocument();
    expect(screen.getByText('Field Name')).toBeInTheDocument();
    expect(screen.getByText('Width')).toBeInTheDocument();
    expect(screen.getByText('Height')).toBeInTheDocument();
    expect(screen.getByText('Yard Line Interval')).toBeInTheDocument();
    expect(screen.getByText('End Zone Depth')).toBeInTheDocument();
    expect(screen.getByText('Front Hash Position')).toBeInTheDocument();
    expect(screen.getByText('Back Hash Position')).toBeInTheDocument();
    expect(screen.getByText('Unit')).toBeInTheDocument();
  });

  test('custom mode inputs are hidden for non-custom presets', () => {
    render(
      <FieldSetupDialog
        currentConfig={mockFieldConfig}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    expect(screen.queryByText('Custom Configuration')).not.toBeInTheDocument();
  });

  test('shows field preview section', () => {
    render(
      <FieldSetupDialog
        currentConfig={mockFieldConfig}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Field Preview')).toBeInTheDocument();
  });

  test('Apply button calls onApply when there are no validation errors', async () => {
    const { user } = render(
      <FieldSetupDialog
        currentConfig={mockFieldConfig}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /apply/i }));

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  test('Cancel button calls onClose', async () => {
    const { user } = render(
      <FieldSetupDialog
        currentConfig={mockFieldConfig}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('close button in header calls onClose', { timeout: 15000 }, async () => {
    const { user } = render(
      <FieldSetupDialog
        currentConfig={mockFieldConfig}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /close field setup/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shows validation errors when custom config is invalid', { timeout: 15000 }, async () => {
    const invalidConfig: FieldConfig = {
      type: 'custom',
      name: 'Bad Field',
      width: -10,
      height: 0,
      yardLineInterval: 5,
      hashMarks: { front: 10, back: 10 },
      endZoneDepth: 0,
      unit: 'yards',
    };

    render(
      <FieldSetupDialog
        currentConfig={invalidConfig}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    // The validation errors should be displayed
    expect(screen.getByText('Configuration errors:')).toBeInTheDocument();

    // Apply should be disabled
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
  });
});
