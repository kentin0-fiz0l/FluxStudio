import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { SetNavigator } from './SetNavigator';
import type { DrillSet } from '../../services/formationTypes';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeSets(count = 3): DrillSet[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `set-${i + 1}`,
    name: `Set ${i + 1}`,
    label: `S${i + 1}`,
    counts: 8 * (i + 1),
    keyframeId: `kf-${i + 1}`,
    sortOrder: i,
    rehearsalMark: i === 0 ? 'A' : undefined,
    notes: i === 1 ? 'Hold position' : undefined,
  }));
}

const defaultProps = {
  sets: makeSets(),
  currentSetId: 'set-1',
  onSetSelect: vi.fn(),
  onSetUpdate: vi.fn(),
  onSetAdd: vi.fn(),
  onSetRemove: vi.fn(),
  onSetsReorder: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SetNavigator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders all set buttons with names and count durations', () => {
    render(<SetNavigator {...defaultProps} />);

    expect(screen.getByText('S1')).toBeInTheDocument();
    expect(screen.getByText('S2')).toBeInTheDocument();
    expect(screen.getByText('S3')).toBeInTheDocument();

    expect(screen.getByText('8 cts')).toBeInTheDocument();
    expect(screen.getByText('16 cts')).toBeInTheDocument();
    expect(screen.getByText('24 cts')).toBeInTheDocument();
  });

  test('displays rehearsal mark for sets that have one', () => {
    render(<SetNavigator {...defaultProps} />);

    expect(screen.getByText('A')).toBeInTheDocument();
  });

  test('highlights the current set', () => {
    render(<SetNavigator {...defaultProps} currentSetId="set-2" />);

    const set2Button = screen.getByText('S2').closest('button');
    expect(set2Button?.className).toContain('bg-blue-500');
  });

  test('calls onSetSelect when a set is clicked', async () => {
    const onSetSelect = vi.fn();
    const { user } = render(
      <SetNavigator {...defaultProps} onSetSelect={onSetSelect} />,
    );

    await user.click(screen.getByText('S2'));

    expect(onSetSelect).toHaveBeenCalledWith('set-2');
  });

  test('calls onSetAdd when the add button is clicked', async () => {
    const onSetAdd = vi.fn();
    const { user } = render(
      <SetNavigator {...defaultProps} onSetAdd={onSetAdd} />,
    );

    await user.click(screen.getByRole('button', { name: /add set/i }));

    expect(onSetAdd).toHaveBeenCalledWith();
  });

  test('shows context menu on right-click with Edit Properties, Insert, Delete options', () => {
    render(<SetNavigator {...defaultProps} />);

    const set2Button = screen.getByText('S2').closest('button')!;
    fireEvent.contextMenu(set2Button);

    expect(screen.getByText('Edit Properties')).toBeInTheDocument();
    expect(screen.getByText('Insert Set Before')).toBeInTheDocument();
    expect(screen.getByText('Insert Set After')).toBeInTheDocument();
    expect(screen.getByText('Delete Set')).toBeInTheDocument();
  });

  test('context menu "Delete Set" calls onSetRemove', async () => {
    const onSetRemove = vi.fn();
    const { user } = render(
      <SetNavigator {...defaultProps} onSetRemove={onSetRemove} />,
    );

    const set2Button = screen.getByText('S2').closest('button')!;
    fireEvent.contextMenu(set2Button);

    await user.click(screen.getByText('Delete Set'));

    expect(onSetRemove).toHaveBeenCalledWith('set-2');
  });

  test('context menu "Insert Set After" calls onSetAdd with set index', async () => {
    const onSetAdd = vi.fn();
    const { user } = render(
      <SetNavigator {...defaultProps} onSetAdd={onSetAdd} />,
    );

    const set2Button = screen.getByText('S2').closest('button')!;
    fireEvent.contextMenu(set2Button);

    await user.click(screen.getByText('Insert Set After'));

    expect(onSetAdd).toHaveBeenCalledWith(1); // index 1
  });

  test('context menu "Edit Properties" calls onEditProperties with the set id', async () => {
    const onEditProperties = vi.fn();
    const { user } = render(
      <SetNavigator {...defaultProps} onEditProperties={onEditProperties} />,
    );

    const set1Button = screen.getByText('S1').closest('button')!;
    fireEvent.contextMenu(set1Button);

    await user.click(screen.getByText('Edit Properties'));

    expect(onEditProperties).toHaveBeenCalledWith('set-1');
  });

  test('context menu "Edit Properties" falls back to onSetSelect when onEditProperties is not provided', async () => {
    const onSetSelect = vi.fn();
    const { user } = render(
      <SetNavigator {...defaultProps} onSetSelect={onSetSelect} />,
    );

    const set1Button = screen.getByText('S1').closest('button')!;
    fireEvent.contextMenu(set1Button);

    await user.click(screen.getByText('Edit Properties'));

    expect(onSetSelect).toHaveBeenCalledWith('set-1');
  });

  test('sets are sorted by sortOrder', () => {
    const unsortedSets: DrillSet[] = [
      { id: 's3', name: 'Set 3', label: 'Third', counts: 8, keyframeId: 'k3', sortOrder: 2 },
      { id: 's1', name: 'Set 1', label: 'First', counts: 8, keyframeId: 'k1', sortOrder: 0 },
      { id: 's2', name: 'Set 2', label: 'Second', counts: 8, keyframeId: 'k2', sortOrder: 1 },
    ];

    render(<SetNavigator {...defaultProps} sets={unsortedSets} />);

    const buttons = screen.getAllByRole('button');
    // Filter out the "Add set" button
    const setButtons = buttons.filter(
      (b) => !b.getAttribute('aria-label')?.includes('Add set'),
    );

    expect(setButtons[0]).toHaveTextContent('First');
    expect(setButtons[1]).toHaveTextContent('Second');
    expect(setButtons[2]).toHaveTextContent('Third');
  });
});
