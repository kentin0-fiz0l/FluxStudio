import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { DrillAnalysisPanel } from './DrillAnalysisPanel';
import type { Formation, DrillSet } from '../../services/formationTypes';
import type { AnalysisResult, DrillIssue } from '../../services/drillAnalysis';

// ---------------------------------------------------------------------------
// Mock the drill analysis service
// ---------------------------------------------------------------------------
const mockFullDrillAnalysis = vi.fn<() => AnalysisResult>();

vi.mock('../../services/drillAnalysis', () => ({
  fullDrillAnalysis: (...args: unknown[]) => mockFullDrillAnalysis(...(args as [])),
  DEFAULT_ANALYSIS_CONFIG: {
    collision: { minDistance: 1.5, sampleInterval: 1 },
    stride: { maxStepSize: 4, warningStepSize: 6 },
    direction: { maxAngle: 135 },
  },
}));

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeFormation(overrides: Partial<Formation> = {}): Formation {
  return {
    id: 'f1',
    name: 'Test Formation',
    projectId: 'p1',
    stageWidth: 100,
    stageHeight: 100,
    gridSize: 5,
    performers: [
      { id: 'perf-1', name: 'Alice', label: 'A', color: '#ff0000' },
      { id: 'perf-2', name: 'Bob', label: 'B', color: '#0000ff' },
    ],
    keyframes: [
      {
        id: 'kf-1',
        timestamp: 0,
        positions: new Map([
          ['perf-1', { x: 20, y: 30 }],
          ['perf-2', { x: 25, y: 30 }],
        ]),
      },
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    createdBy: 'user-1',
    ...overrides,
  };
}

function makeSets(count = 2): DrillSet[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `set-${i + 1}`,
    name: `Set ${i + 1}`,
    counts: 8,
    keyframeId: `kf-${i + 1}`,
    sortOrder: i,
  }));
}

function makeAnalysisResult(issues: DrillIssue[]): AnalysisResult {
  return {
    issues,
    summary: {
      totalIssues: issues.length,
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      info: issues.filter((i) => i.severity === 'info').length,
      collisionCount: issues.filter((i) => i.type === 'collision').length,
      worstStride: issues.length > 0
        ? { performerName: 'Alice', stepSize: 3.5, setName: 'Set 1' }
        : null,
      performersWithIssues: 1,
    },
    analyzedAt: Date.now(),
  };
}

function makeIssue(overrides: Partial<DrillIssue> = {}): DrillIssue {
  return {
    id: 'issue-1',
    severity: 'error',
    type: 'collision',
    message: 'Alice and Bob are too close',
    setId: 'set-1',
    setName: 'Set 1',
    performerIds: ['perf-1', 'perf-2'],
    performerNames: ['Alice', 'Bob'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DrillAnalysisPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders the header and Run Analysis button', () => {
    render(
      <DrillAnalysisPanel
        formation={makeFormation()}
        sets={makeSets()}
      />,
    );

    expect(screen.getByText('Drill Analysis')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run analysis/i })).toBeInTheDocument();
  });

  test('shows placeholder text when analysis has not been run', () => {
    render(
      <DrillAnalysisPanel
        formation={makeFormation()}
        sets={makeSets()}
      />,
    );

    expect(screen.getByText(/click "run analysis" to check your drill/i)).toBeInTheDocument();
  });

  test('disables Run Analysis button when sets are empty', () => {
    render(
      <DrillAnalysisPanel
        formation={makeFormation()}
        sets={[]}
      />,
    );

    expect(screen.getByRole('button', { name: /run analysis/i })).toBeDisabled();
  });

  test('runs analysis and displays summary cards with issue counts', async () => {
    const issues = [
      makeIssue({ id: 'i1', severity: 'error', type: 'collision' }),
      makeIssue({ id: 'i2', severity: 'warning', type: 'stride', message: 'Big steps' }),
    ];
    mockFullDrillAnalysis.mockReturnValue(makeAnalysisResult(issues));

    const { user } = render(
      <DrillAnalysisPanel
        formation={makeFormation()}
        sets={makeSets()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /run analysis/i }));

    // Let the setTimeout(fn, 0) fire
    await vi.advanceTimersByTimeAsync(10);

    // Summary cards - check the labels appear inside the summary card grid
    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('Warnings')).toBeInTheDocument();
    // "Collisions" appears both as a summary card label and a filter tab button.
    // Verify at least one exists using getAllByText.
    expect(screen.getAllByText('Collisions').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  test('displays issues grouped by severity with correct text', async () => {
    const issues = [
      makeIssue({
        id: 'i1',
        severity: 'error',
        type: 'collision',
        message: 'Collision between Alice and Bob',
        setName: 'Set 1',
      }),
      makeIssue({
        id: 'i2',
        severity: 'warning',
        type: 'stride',
        message: 'Large step size for Alice',
        setName: 'Set 2',
        stepInfo: {
          distance: 10,
          distanceYards: 5.5,
          stepSize: 4,
          stepSizeLabel: '4 to 5',
          direction: 90,
          directionLabel: 'downfield',
          difficulty: 'hard',
          counts: 8,
        },
      }),
      makeIssue({
        id: 'i3',
        severity: 'info',
        type: 'direction_change',
        message: 'Sharp direction change',
      }),
    ];
    mockFullDrillAnalysis.mockReturnValue(makeAnalysisResult(issues));

    const { user } = render(
      <DrillAnalysisPanel
        formation={makeFormation()}
        sets={makeSets()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /run analysis/i }));
    await vi.advanceTimersByTimeAsync(10);

    expect(screen.getByText('Collision between Alice and Bob')).toBeInTheDocument();
    expect(screen.getByText('Large step size for Alice')).toBeInTheDocument();
    expect(screen.getByText('Sharp direction change')).toBeInTheDocument();

    // Step info details should be visible for the stride issue
    expect(screen.getByText(/4 to 5/)).toBeInTheDocument();
    expect(screen.getByText(/5\.5 yards/)).toBeInTheDocument();
  });

  test('clicking an issue calls onNavigateToSet with the set and performer IDs', async () => {
    const onNavigateToSet = vi.fn();
    const issues = [
      makeIssue({
        id: 'i1',
        severity: 'error',
        type: 'collision',
        message: 'Collision at Set 1',
        setId: 'set-1',
        performerIds: ['perf-1', 'perf-2'],
      }),
    ];
    mockFullDrillAnalysis.mockReturnValue(makeAnalysisResult(issues));

    const { user } = render(
      <DrillAnalysisPanel
        formation={makeFormation()}
        sets={makeSets()}
        onNavigateToSet={onNavigateToSet}
      />,
    );

    await user.click(screen.getByRole('button', { name: /run analysis/i }));
    await vi.advanceTimersByTimeAsync(10);

    await user.click(screen.getByText('Collision at Set 1'));

    expect(onNavigateToSet).toHaveBeenCalledWith('set-1', ['perf-1', 'perf-2']);
  });

  test('filter tabs filter issues by type', async () => {
    const issues = [
      makeIssue({ id: 'i1', type: 'collision', message: 'Collision issue' }),
      makeIssue({ id: 'i2', type: 'stride', message: 'Stride issue', severity: 'warning' }),
      makeIssue({ id: 'i3', type: 'direction_change', message: 'Direction issue', severity: 'info' }),
    ];
    mockFullDrillAnalysis.mockReturnValue(makeAnalysisResult(issues));

    const { user } = render(
      <DrillAnalysisPanel
        formation={makeFormation()}
        sets={makeSets()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /run analysis/i }));
    await vi.advanceTimersByTimeAsync(10);

    // All issues visible by default
    expect(screen.getByText('Collision issue')).toBeInTheDocument();
    expect(screen.getByText('Stride issue')).toBeInTheDocument();
    expect(screen.getByText('Direction issue')).toBeInTheDocument();

    // The filter tab "Collisions" vs the summary card label "Collisions" can collide.
    // Target the filter tab buttons specifically (they are in a flex container with gap-1).
    const filterTabs = screen.getAllByText('Collisions');
    // The filter tab button is the one with smaller px-2 py-1 text-xs styling
    const collisionsTab = filterTabs.find(
      (el) => el.tagName === 'BUTTON' && el.classList.contains('text-xs'),
    )!;
    await user.click(collisionsTab);

    expect(screen.getByText('Collision issue')).toBeInTheDocument();
    expect(screen.queryByText('Stride issue')).not.toBeInTheDocument();
    expect(screen.queryByText('Direction issue')).not.toBeInTheDocument();

    // Click "Strides" tab
    await user.click(screen.getByText('Strides'));
    expect(screen.queryByText('Collision issue')).not.toBeInTheDocument();
    expect(screen.getByText('Stride issue')).toBeInTheDocument();

    // Click "All" tab
    await user.click(screen.getByText('All'));
    expect(screen.getByText('Collision issue')).toBeInTheDocument();
    expect(screen.getByText('Stride issue')).toBeInTheDocument();
    expect(screen.getByText('Direction issue')).toBeInTheDocument();
  });

  test('shows "No issues found!" when analysis returns empty issues', async () => {
    mockFullDrillAnalysis.mockReturnValue(makeAnalysisResult([]));

    const { user } = render(
      <DrillAnalysisPanel
        formation={makeFormation()}
        sets={makeSets()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /run analysis/i }));
    await vi.advanceTimersByTimeAsync(10);

    expect(screen.getByText('No issues found!')).toBeInTheDocument();
  });

  test('displays worst stride information when present', async () => {
    const issues = [
      makeIssue({ id: 'i1', type: 'stride', severity: 'error', message: 'Large stride' }),
    ];
    mockFullDrillAnalysis.mockReturnValue(makeAnalysisResult(issues));

    const { user } = render(
      <DrillAnalysisPanel
        formation={makeFormation()}
        sets={makeSets()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /run analysis/i }));
    await vi.advanceTimersByTimeAsync(10);

    expect(screen.getByText(/worst stride.*alice.*set 1.*3\.5-to-5/i)).toBeInTheDocument();
  });
});
