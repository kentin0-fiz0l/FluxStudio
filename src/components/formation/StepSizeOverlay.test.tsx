import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { StepSizeOverlay } from './StepSizeOverlay';
import type { FieldConfig, Position } from '../../services/formationTypes';

// ---------------------------------------------------------------------------
// Mock drill coordinate utilities
// ---------------------------------------------------------------------------

vi.mock('../../utils/drillCoordinates', () => ({
  calculateStepInfo: (
    from: Position,
    to: Position,
    counts: number,
    _config: FieldConfig,
  ) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Simulate no movement
    if (dist < 0.01) {
      return {
        stepSize: 0,
        stepSizeLabel: 'Mark Time',
        difficulty: 'easy' as const,
        distanceYards: 0,
        direction: 0,
        directionLabel: 'stationary',
        counts,
        distance: 0,
      };
    }

    // Determine difficulty by distance
    const difficulty = dist < 15 ? 'easy' : dist < 30 ? 'moderate' : 'hard';
    const stepSize = difficulty === 'easy' ? 8 : difficulty === 'moderate' ? 6 : 4;

    return {
      stepSize,
      stepSizeLabel: `${stepSize} to 5`,
      difficulty,
      distanceYards: dist * 0.53,
      direction: Math.atan2(dy, dx) * (180 / Math.PI),
      directionLabel: 'to the right',
      counts,
      distance: dist,
    };
  },
}));

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const mockFieldConfig: FieldConfig = {
  type: 'ncaa_football',
  name: 'NCAA Football',
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

describe('StepSizeOverlay', () => {
  test('returns null when nextPositions is null', () => {
    const { container } = render(
      <StepSizeOverlay
        positions={new Map([['p1', { x: 20, y: 30 }]])}
        nextPositions={null}
        fieldConfig={mockFieldConfig}
        counts={8}
        canvasWidth={800}
        canvasHeight={400}
      />,
    );

    expect(container.querySelector('[data-testid="step-size-overlay"]')).not.toBeInTheDocument();
  });

  test('returns null when all performers are mark time (no movement)', () => {
    const positions = new Map<string, Position>([
      ['p1', { x: 50, y: 50 }],
    ]);
    const nextPositions = new Map<string, Position>([
      ['p1', { x: 50, y: 50 }], // same position = mark time
    ]);

    const { container } = render(
      <StepSizeOverlay
        positions={positions}
        nextPositions={nextPositions}
        fieldConfig={mockFieldConfig}
        counts={8}
        canvasWidth={800}
        canvasHeight={400}
      />,
    );

    expect(container.querySelector('[data-testid="step-size-overlay"]')).not.toBeInTheDocument();
  });

  test('renders SVG overlay with step data when performers move', () => {
    const positions = new Map<string, Position>([
      ['p1', { x: 20, y: 30 }],
      ['p2', { x: 60, y: 40 }],
    ]);
    const nextPositions = new Map<string, Position>([
      ['p1', { x: 40, y: 30 }], // moves right
      ['p2', { x: 80, y: 40 }], // moves right
    ]);

    render(
      <StepSizeOverlay
        positions={positions}
        nextPositions={nextPositions}
        fieldConfig={mockFieldConfig}
        counts={8}
        canvasWidth={800}
        canvasHeight={400}
      />,
    );

    const svg = screen.getByTestId('step-size-overlay');
    expect(svg).toBeInTheDocument();
    expect(svg.tagName.toLowerCase()).toBe('svg');

    // Should have lines and labels for both performers
    const lines = svg.querySelectorAll('line');
    expect(lines.length).toBeGreaterThanOrEqual(2);

    // Should have text labels with step size
    const texts = svg.querySelectorAll('text');
    expect(texts.length).toBeGreaterThanOrEqual(2);
  });

  test('renders correct color coding for easy (green) difficulty', () => {
    const positions = new Map<string, Position>([
      ['p1', { x: 50, y: 50 }],
    ]);
    const nextPositions = new Map<string, Position>([
      ['p1', { x: 55, y: 50 }], // small move = easy
    ]);

    render(
      <StepSizeOverlay
        positions={positions}
        nextPositions={nextPositions}
        fieldConfig={mockFieldConfig}
        counts={8}
        canvasWidth={800}
        canvasHeight={400}
      />,
    );

    const svg = screen.getByTestId('step-size-overlay');
    const lines = svg.querySelectorAll('line');

    // The line stroke should use the green color for easy
    const stepLine = Array.from(lines).find(
      (l) => l.getAttribute('stroke-dasharray') === '4 3',
    );
    expect(stepLine).toBeTruthy();
    expect(stepLine!.getAttribute('stroke')).toBe('#22c55e'); // green-500
  });

  test('renders correct color coding for hard (red) difficulty', () => {
    const positions = new Map<string, Position>([
      ['p1', { x: 10, y: 10 }],
    ]);
    const nextPositions = new Map<string, Position>([
      ['p1', { x: 80, y: 80 }], // large move = hard
    ]);

    render(
      <StepSizeOverlay
        positions={positions}
        nextPositions={nextPositions}
        fieldConfig={mockFieldConfig}
        counts={8}
        canvasWidth={800}
        canvasHeight={400}
      />,
    );

    const svg = screen.getByTestId('step-size-overlay');
    const stepLine = Array.from(svg.querySelectorAll('line')).find(
      (l) => l.getAttribute('stroke-dasharray') === '4 3',
    );
    expect(stepLine).toBeTruthy();
    expect(stepLine!.getAttribute('stroke')).toBe('#ef4444'); // red-500
  });

  test('only renders performers that exist in both sets', () => {
    const positions = new Map<string, Position>([
      ['p1', { x: 20, y: 30 }],
      ['p2', { x: 60, y: 40 }],
    ]);
    const nextPositions = new Map<string, Position>([
      ['p1', { x: 40, y: 30 }],
      // p2 is missing from the next set
    ]);

    render(
      <StepSizeOverlay
        positions={positions}
        nextPositions={nextPositions}
        fieldConfig={mockFieldConfig}
        counts={8}
        canvasWidth={800}
        canvasHeight={400}
      />,
    );

    const svg = screen.getByTestId('step-size-overlay');
    // Should only render one group (for p1)
    const groups = svg.querySelectorAll('g');
    expect(groups.length).toBe(1);
  });

  test('returns null when counts is zero', () => {
    const positions = new Map<string, Position>([
      ['p1', { x: 20, y: 30 }],
    ]);
    const nextPositions = new Map<string, Position>([
      ['p1', { x: 40, y: 30 }],
    ]);

    const { container } = render(
      <StepSizeOverlay
        positions={positions}
        nextPositions={nextPositions}
        fieldConfig={mockFieldConfig}
        counts={0}
        canvasWidth={800}
        canvasHeight={400}
      />,
    );

    expect(container.querySelector('[data-testid="step-size-overlay"]')).not.toBeInTheDocument();
  });
});
