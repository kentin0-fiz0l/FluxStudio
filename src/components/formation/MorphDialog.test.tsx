import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { MorphDialog } from './MorphDialog';
import type { Position } from '../../services/formationTypes';
import type { MorphMapping } from '../../services/movementTools';

// ---------------------------------------------------------------------------
// Mock movement tools
// ---------------------------------------------------------------------------

vi.mock('../../services/movementTools', () => ({
  calculateMorphMapping: (
    from: Position[],
    to: Position[],
    _method: string,
  ): MorphMapping[] => {
    const count = Math.min(from.length, to.length);
    return Array.from({ length: count }, (_, i) => ({
      fromIndex: i,
      toIndex: i,
    }));
  },
}));

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const sourcePositions: Position[] = [
  { x: 20, y: 30 },
  { x: 40, y: 30 },
  { x: 60, y: 30 },
];

const targetPositions: Position[] = [
  { x: 25, y: 50 },
  { x: 45, y: 50 },
  { x: 65, y: 50 },
];

const performerIds = ['p1', 'p2', 'p3'];
const performerNames = ['Alice', 'Bob', 'Charlie'];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MorphDialog', () => {
  const onApply = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders dialog with header', () => {
    render(
      <MorphDialog
        sourcePositions={sourcePositions}
        targetPositions={targetPositions}
        performerIds={performerIds}
        performerNames={performerNames}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('dialog', { name: /formation morph/i })).toBeInTheDocument();
    expect(screen.getByText('Formation Morph')).toBeInTheDocument();
  });

  test('renders matching method tabs with correct labels', () => {
    render(
      <MorphDialog
        sourcePositions={sourcePositions}
        targetPositions={targetPositions}
        performerIds={performerIds}
        performerNames={performerNames}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Proximity (nearest)')).toBeInTheDocument();
    expect(screen.getByText('Index Order')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  test('Proximity tab is selected by default', () => {
    render(
      <MorphDialog
        sourcePositions={sourcePositions}
        targetPositions={targetPositions}
        performerIds={performerIds}
        performerNames={performerNames}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    const proximityButton = screen.getByText('Proximity (nearest)').closest('button')!;
    expect(proximityButton.className).toContain('bg-blue-500');
  });

  test('clicking a matching method tab selects it', async () => {
    const { user } = render(
      <MorphDialog
        sourcePositions={sourcePositions}
        targetPositions={targetPositions}
        performerIds={performerIds}
        performerNames={performerNames}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByText('Index Order'));

    const indexButton = screen.getByText('Index Order').closest('button')!;
    expect(indexButton.className).toContain('bg-blue-500');
  });

  test('Manual mode shows instruction text', async () => {
    const { user } = render(
      <MorphDialog
        sourcePositions={sourcePositions}
        targetPositions={targetPositions}
        performerIds={performerIds}
        performerNames={performerNames}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByText('Manual'));

    expect(screen.getByText(/click a source dot.*then click a target dot/i)).toBeInTheDocument();
  });

  test('renders Source and Target labels in the SVG', () => {
    render(
      <MorphDialog
        sourcePositions={sourcePositions}
        targetPositions={targetPositions}
        performerIds={performerIds}
        performerNames={performerNames}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
  });

  test('renders mapping summary with performer names', () => {
    render(
      <MorphDialog
        sourcePositions={sourcePositions}
        targetPositions={targetPositions}
        performerIds={performerIds}
        performerNames={performerNames}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Mapping Summary')).toBeInTheDocument();
    // Performer names appear both in SVG <title> tooltips and in the mapping summary.
    // Use getAllByText to verify they are present (at least once in the summary).
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Charlie').length).toBeGreaterThanOrEqual(1);
  });

  test('Apply button calls onApply with the active mapping', async () => {
    const { user } = render(
      <MorphDialog
        sourcePositions={sourcePositions}
        targetPositions={targetPositions}
        performerIds={performerIds}
        performerNames={performerNames}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /apply/i }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const mapping = onApply.mock.calls[0][0] as Map<number, number>;
    expect(mapping.size).toBe(3);
    expect(mapping.get(0)).toBe(0);
    expect(mapping.get(1)).toBe(1);
    expect(mapping.get(2)).toBe(2);
  });

  test('Cancel button calls onClose', async () => {
    const { user } = render(
      <MorphDialog
        sourcePositions={sourcePositions}
        targetPositions={targetPositions}
        performerIds={performerIds}
        performerNames={performerNames}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('close button in header calls onClose', async () => {
    const { user } = render(
      <MorphDialog
        sourcePositions={sourcePositions}
        targetPositions={targetPositions}
        performerIds={performerIds}
        performerNames={performerNames}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /close morph dialog/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Preview button is present and toggleable', () => {
    render(
      <MorphDialog
        sourcePositions={sourcePositions}
        targetPositions={targetPositions}
        performerIds={performerIds}
        performerNames={performerNames}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
  });

  test('Apply is disabled when there are no mappings (empty positions)', () => {
    render(
      <MorphDialog
        sourcePositions={[]}
        targetPositions={[]}
        performerIds={[]}
        performerNames={[]}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
    expect(screen.getByText('No mappings defined')).toBeInTheDocument();
  });
});
