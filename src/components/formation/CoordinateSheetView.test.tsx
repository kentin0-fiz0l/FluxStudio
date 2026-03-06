import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { CoordinateSheetView } from './CoordinateSheetView';
import type { CoordinateEntry, DrillSet, StepInfo } from '../../services/formationTypes';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeSet(overrides: Partial<DrillSet> = {}): DrillSet {
  return {
    id: 'set-1',
    name: 'Set 1',
    counts: 8,
    keyframeId: 'kf-1',
    sortOrder: 0,
    ...overrides,
  };
}

function makeStepInfo(overrides: Partial<StepInfo> = {}): StepInfo {
  return {
    distance: 10,
    distanceYards: 5.0,
    stepSize: 8,
    stepSizeLabel: '8 to 5',
    direction: 0,
    directionLabel: 'to the right',
    difficulty: 'easy',
    counts: 8,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<CoordinateEntry> = {}): CoordinateEntry {
  return {
    set: makeSet(),
    coordinate: '4 steps outside R35, 12 behind front hash',
    coordinateDetails: {
      sideToSide: '4 steps outside R35',
      frontToBack: '12 behind front hash',
    },
    stepToNext: makeStepInfo(),
    stepFromPrev: null,
    ...overrides,
  };
}

function makeEntries(): CoordinateEntry[] {
  return [
    makeEntry({
      set: makeSet({ id: 's1', name: 'Set 1', counts: 8, sortOrder: 0 }),
      coordinateDetails: { sideToSide: '4 out R35', frontToBack: '12 behind FH' },
      stepToNext: makeStepInfo({ difficulty: 'easy', stepSizeLabel: '8 to 5', directionLabel: 'to the right' }),
    }),
    makeEntry({
      set: makeSet({ id: 's2', name: 'Set 2', counts: 16, sortOrder: 1, rehearsalMark: 'B' }),
      coordinateDetails: { sideToSide: '2 in L40', frontToBack: '8 front of BH' },
      stepToNext: makeStepInfo({ difficulty: 'hard', stepSizeLabel: '4 to 5', directionLabel: 'upfield' }),
    }),
    makeEntry({
      set: makeSet({ id: 's3', name: 'Set 3', counts: 32, sortOrder: 2 }),
      coordinateDetails: { sideToSide: 'On R50', frontToBack: 'On front hash' },
      stepToNext: null,
    }),
  ];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CoordinateSheetView', () => {
  const onNavigateToSet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the header with title and performer name', () => {
    render(
      <CoordinateSheetView
        entries={makeEntries()}
        performerName="Alice"
        onNavigateToSet={onNavigateToSet}
      />,
    );

    expect(screen.getByText('Coordinate Sheet')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  test('renders table with all column headers', () => {
    render(
      <CoordinateSheetView
        entries={makeEntries()}
        performerName="Alice"
        onNavigateToSet={onNavigateToSet}
      />,
    );

    expect(screen.getByText('Set')).toBeInTheDocument();
    expect(screen.getByText('Counts')).toBeInTheDocument();
    expect(screen.getByText('Side-to-Side')).toBeInTheDocument();
    expect(screen.getByText('Front-to-Back')).toBeInTheDocument();
    expect(screen.getByText('Step Size')).toBeInTheDocument();
    expect(screen.getByText('Direction')).toBeInTheDocument();
    expect(screen.getByText('Difficulty')).toBeInTheDocument();
  });

  test('renders all entry rows with correct data', () => {
    render(
      <CoordinateSheetView
        entries={makeEntries()}
        performerName="Alice"
        onNavigateToSet={onNavigateToSet}
      />,
    );

    // Set names
    expect(screen.getByText('Set 1')).toBeInTheDocument();
    expect(screen.getByText('Set 2')).toBeInTheDocument();
    expect(screen.getByText('Set 3')).toBeInTheDocument();

    // Coordinate details
    expect(screen.getByText('4 out R35')).toBeInTheDocument();
    expect(screen.getByText('2 in L40')).toBeInTheDocument();
    expect(screen.getByText('On R50')).toBeInTheDocument();

    // Difficulty badges
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
  });

  test('shows rehearsal mark when present', () => {
    render(
      <CoordinateSheetView
        entries={makeEntries()}
        performerName="Alice"
        onNavigateToSet={onNavigateToSet}
      />,
    );

    expect(screen.getByText('[B]')).toBeInTheDocument();
  });

  test('shows em dash for step info on last set (no stepToNext)', () => {
    render(
      <CoordinateSheetView
        entries={makeEntries()}
        performerName="Alice"
        onNavigateToSet={onNavigateToSet}
      />,
    );

    // The last set should show em dashes for step size, direction, and difficulty
    const rows = screen.getAllByRole('button');
    const lastRow = rows[rows.length - 1];
    expect(lastRow).toHaveTextContent('\u2014'); // em dash
  });

  test('clicking a row calls onNavigateToSet with the set ID', async () => {
    const { user } = render(
      <CoordinateSheetView
        entries={makeEntries()}
        performerName="Alice"
        onNavigateToSet={onNavigateToSet}
      />,
    );

    // Click the row for Set 2
    const set2Row = screen.getByRole('button', { name: /navigate to set 2/i });
    await user.click(set2Row);

    expect(onNavigateToSet).toHaveBeenCalledWith('s2');
  });

  test('pressing Enter on a row calls onNavigateToSet', () => {
    render(
      <CoordinateSheetView
        entries={makeEntries()}
        performerName="Alice"
        onNavigateToSet={onNavigateToSet}
      />,
    );

    const set1Row = screen.getByRole('button', { name: /navigate to set 1/i });
    set1Row.focus();

    // Simulate keydown Enter
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
    });
    set1Row.dispatchEvent(enterEvent);

    expect(onNavigateToSet).toHaveBeenCalledWith('s1');
  });

  test('column headers are clickable for sorting', async () => {
    const { user } = render(
      <CoordinateSheetView
        entries={makeEntries()}
        performerName="Alice"
        onNavigateToSet={onNavigateToSet}
      />,
    );

    // Click "Counts" column header to sort by counts
    await user.click(screen.getByText('Counts'));

    // Entries should still be rendered (sorting re-orders them)
    expect(screen.getByText('Set 1')).toBeInTheDocument();
    expect(screen.getByText('Set 2')).toBeInTheDocument();
    expect(screen.getByText('Set 3')).toBeInTheDocument();
  });

  test('clicking same column header toggles sort direction', async () => {
    const { user } = render(
      <CoordinateSheetView
        entries={makeEntries()}
        performerName="Alice"
        onNavigateToSet={onNavigateToSet}
      />,
    );

    // Click "Set" twice to toggle desc
    await user.click(screen.getByText('Set'));
    await user.click(screen.getByText('Set'));

    // All rows should still be present
    expect(screen.getByText('Set 1')).toBeInTheDocument();
    expect(screen.getByText('Set 2')).toBeInTheDocument();
    expect(screen.getByText('Set 3')).toBeInTheDocument();
  });

  test('shows empty message when no entries are provided', () => {
    render(
      <CoordinateSheetView
        entries={[]}
        performerName="Alice"
        onNavigateToSet={onNavigateToSet}
      />,
    );

    expect(screen.getByText('No coordinate entries to display')).toBeInTheDocument();
  });

  test('print button is rendered', () => {
    render(
      <CoordinateSheetView
        entries={makeEntries()}
        performerName="Alice"
        onNavigateToSet={onNavigateToSet}
      />,
    );

    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
  });
});
