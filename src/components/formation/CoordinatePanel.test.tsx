import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { CoordinatePanel } from './CoordinatePanel';
import type { FieldConfig, Position } from '../../services/formationTypes';

// ---------------------------------------------------------------------------
// Mock coordinate utilities
// ---------------------------------------------------------------------------

vi.mock('../../utils/drillCoordinates', () => ({
  positionToCoordinate: (pos: Position, _config: FieldConfig) => ({
    sideToSide: `4 steps outside R${Math.round(pos.x)}`,
    frontToBack: `12 behind front hash`,
  }),
  calculateStepInfo: (
    _from: Position,
    _to: Position,
    counts: number,
    _config: FieldConfig,
  ) => ({
    stepSizeLabel: '8 to 5',
    directionLabel: 'to the right',
    difficulty: 'easy' as const,
    counts,
    distanceYards: 5.0,
  }),
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

const baseProps = {
  performerId: null as string | null,
  performerName: '',
  position: null as Position | null,
  nextPosition: null as Position | null,
  prevPosition: null as Position | null,
  fieldConfig: mockFieldConfig,
  currentSetCounts: 8,
  prevSetCounts: 8,
  onPositionChange: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CoordinatePanel', () => {
  test('shows placeholder when no performer is selected', () => {
    render(<CoordinatePanel {...baseProps} />);

    expect(screen.getByTestId('coordinate-panel-placeholder')).toBeInTheDocument();
    expect(screen.getByText('Select a performer to view coordinates')).toBeInTheDocument();
  });

  test('shows placeholder when performerId is set but position is null', () => {
    render(
      <CoordinatePanel
        {...baseProps}
        performerId="perf-1"
        performerName="Alice"
        position={null}
      />,
    );

    expect(screen.getByTestId('coordinate-panel-placeholder')).toBeInTheDocument();
  });

  test('renders performer name and coordinate display with position', () => {
    render(
      <CoordinatePanel
        {...baseProps}
        performerId="perf-1"
        performerName="Alice"
        position={{ x: 35, y: 50 }}
      />,
    );

    expect(screen.getByTestId('coordinate-panel')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();

    // Coordinate labels
    expect(screen.getByText('S/S')).toBeInTheDocument();
    expect(screen.getByText('F/B')).toBeInTheDocument();

    // Coordinate values from mock
    expect(screen.getByText('4 steps outside R35')).toBeInTheDocument();
    expect(screen.getByText('12 behind front hash')).toBeInTheDocument();
  });

  test('renders Copy button', () => {
    render(
      <CoordinatePanel
        {...baseProps}
        performerId="perf-1"
        performerName="Alice"
        position={{ x: 35, y: 50 }}
      />,
    );

    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  test('renders "To next set" step info section when nextPosition is provided', () => {
    render(
      <CoordinatePanel
        {...baseProps}
        performerId="perf-1"
        performerName="Alice"
        position={{ x: 35, y: 50 }}
        nextPosition={{ x: 45, y: 50 }}
        currentSetCounts={8}
      />,
    );

    expect(screen.getByText('To next set')).toBeInTheDocument();
    expect(screen.getByText('8 to 5')).toBeInTheDocument();
    expect(screen.getByText(/to the right/i)).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText(/8 counts/i)).toBeInTheDocument();
  });

  test('renders "From previous set" step info section when prevPosition is provided', () => {
    render(
      <CoordinatePanel
        {...baseProps}
        performerId="perf-1"
        performerName="Alice"
        position={{ x: 35, y: 50 }}
        prevPosition={{ x: 25, y: 50 }}
        prevSetCounts={16}
      />,
    );

    expect(screen.getByText('From previous set')).toBeInTheDocument();
  });

  test('does not render step info sections when there are no adjacent positions', () => {
    render(
      <CoordinatePanel
        {...baseProps}
        performerId="perf-1"
        performerName="Alice"
        position={{ x: 35, y: 50 }}
        nextPosition={null}
        prevPosition={null}
      />,
    );

    expect(screen.queryByText('To next set')).not.toBeInTheDocument();
    expect(screen.queryByText('From previous set')).not.toBeInTheDocument();
  });

  test('does not render step info when counts are zero', () => {
    render(
      <CoordinatePanel
        {...baseProps}
        performerId="perf-1"
        performerName="Alice"
        position={{ x: 35, y: 50 }}
        nextPosition={{ x: 45, y: 50 }}
        currentSetCounts={0}
        prevPosition={{ x: 25, y: 50 }}
        prevSetCounts={0}
      />,
    );

    expect(screen.queryByText('To next set')).not.toBeInTheDocument();
    expect(screen.queryByText('From previous set')).not.toBeInTheDocument();
  });

  test('displays distance in yards with correct unit label', () => {
    render(
      <CoordinatePanel
        {...baseProps}
        performerId="perf-1"
        performerName="Alice"
        position={{ x: 35, y: 50 }}
        nextPosition={{ x: 45, y: 50 }}
        currentSetCounts={8}
      />,
    );

    expect(screen.getByText(/5\.0 yards/)).toBeInTheDocument();
  });
});
