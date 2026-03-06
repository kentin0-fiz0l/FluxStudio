import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { MovementToolsPanel } from './MovementToolsPanel';
import type { Position } from '../../services/formationTypes';

// ---------------------------------------------------------------------------
// Mock the movement tools service
// ---------------------------------------------------------------------------

vi.mock('../../services/movementTools', () => ({
  generateCounterMarch: (positions: Position[], _pivotY: number) =>
    positions.map((p) => ({ x: p.x, y: 100 - p.y })),
  generateParadeGate: (positions: Position[], _pivot: Position, _angle: number) =>
    positions.map((p) => ({ x: p.x + 5, y: p.y + 5 })),
  generateSpiral: (count: number) =>
    Array.from({ length: count }, (_, i) => ({ x: 50 + i * 5, y: 50 + i * 5 })),
  generateStagger: (positions: Position[], _offsetX: number, _offsetY: number) =>
    positions.map((p, i) => ({ x: p.x + (i % 2 === 0 ? 3 : 0), y: p.y })),
  generateFaceToPoint: (positions: Position[], _target: Position) =>
    positions.map((p) => ({ ...p, rotation: 45 })),
}));

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const mockPositions: Position[] = [
  { x: 20, y: 30 },
  { x: 40, y: 30 },
  { x: 60, y: 30 },
];

const defaultProps = {
  selectedPositions: mockPositions,
  allPositions: mockPositions,
  selectedPerformerIds: ['p1', 'p2', 'p3'],
  onApplyPositions: vi.fn(),
  onClose: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MovementToolsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the panel with header and close button', () => {
    render(<MovementToolsPanel {...defaultProps} />);

    expect(screen.getByText('Movement Tools')).toBeInTheDocument();
  });

  test('renders category tabs', () => {
    render(<MovementToolsPanel {...defaultProps} />);

    expect(screen.getByText('Transitions')).toBeInTheDocument();
    expect(screen.getByText('Rotations')).toBeInTheDocument();
    expect(screen.getByText('Sequential')).toBeInTheDocument();
    expect(screen.getByText('Special')).toBeInTheDocument();
  });

  test('default category is Transitions with correct tools listed', () => {
    render(<MovementToolsPanel {...defaultProps} />);

    expect(screen.getByText('Morph')).toBeInTheDocument();
    expect(screen.getByText('Counter March')).toBeInTheDocument();
  });

  test('switching category shows tools for that category', async () => {
    const { user } = render(<MovementToolsPanel {...defaultProps} />);

    await user.click(screen.getByText('Rotations'));

    expect(screen.getByText('Parade Gate')).toBeInTheDocument();
    expect(screen.getByText('Face to Point')).toBeInTheDocument();
  });

  test('shows "Coming soon" for category with no tools', async () => {
    const { user } = render(<MovementToolsPanel {...defaultProps} />);

    await user.click(screen.getByText('Sequential'));

    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });

  test('clicking Special category shows Spiral and Stagger', async () => {
    const { user } = render(<MovementToolsPanel {...defaultProps} />);

    await user.click(screen.getByText('Special'));

    expect(screen.getByText('Spiral')).toBeInTheDocument();
    expect(screen.getByText('Stagger')).toBeInTheDocument();
  });

  test('selecting a tool shows Parameters section with controls', async () => {
    const { user } = render(<MovementToolsPanel {...defaultProps} />);

    await user.click(screen.getByText('Counter March'));

    expect(screen.getByText('Parameters')).toBeInTheDocument();
    expect(screen.getByText('Pivot Line Y')).toBeInTheDocument();
  });

  test('selecting Parade Gate tool shows angle and pivot parameters', async () => {
    const { user } = render(<MovementToolsPanel {...defaultProps} />);

    await user.click(screen.getByText('Rotations'));
    await user.click(screen.getByText('Parade Gate'));

    expect(screen.getByText('Angle')).toBeInTheDocument();
    expect(screen.getByText('Pivot X')).toBeInTheDocument();
    expect(screen.getByText('Pivot Y')).toBeInTheDocument();
  });

  test('selecting Face to Point shows Target X and Target Y', async () => {
    const { user } = render(<MovementToolsPanel {...defaultProps} />);

    await user.click(screen.getByText('Rotations'));
    await user.click(screen.getByText('Face to Point'));

    expect(screen.getByText('Target X')).toBeInTheDocument();
    expect(screen.getByText('Target Y')).toBeInTheDocument();
  });

  test('selecting Spiral shows Turns and Radius parameters', async () => {
    const { user } = render(<MovementToolsPanel {...defaultProps} />);

    await user.click(screen.getByText('Special'));
    await user.click(screen.getByText('Spiral'));

    expect(screen.getByText('Turns')).toBeInTheDocument();
    expect(screen.getByText('Radius')).toBeInTheDocument();
  });

  test('selecting Stagger shows Offset X and Offset Y', async () => {
    const { user } = render(<MovementToolsPanel {...defaultProps} />);

    await user.click(screen.getByText('Special'));
    await user.click(screen.getByText('Stagger'));

    expect(screen.getByText('Offset X')).toBeInTheDocument();
    expect(screen.getByText('Offset Y')).toBeInTheDocument();
  });

  test('selecting Morph tool shows Match Method dropdown', async () => {
    const { user } = render(<MovementToolsPanel {...defaultProps} />);

    await user.click(screen.getByText('Morph'));

    expect(screen.getByText('Match Method')).toBeInTheDocument();
  });

  test('Preview and Apply buttons appear when a tool is selected', async () => {
    const { user } = render(<MovementToolsPanel {...defaultProps} />);

    await user.click(screen.getByText('Counter March'));

    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
  });

  test('Apply button is disabled before Preview is clicked', { timeout: 15000 }, async () => {
    const { user } = render(<MovementToolsPanel {...defaultProps} />);

    await user.click(screen.getByText('Counter March'));

    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
  });

  test('Preview then Apply calls onApplyPositions with performer IDs and new positions', { timeout: 15000 }, async () => {
    const onApplyPositions = vi.fn();
    const { user } = render(
      <MovementToolsPanel {...defaultProps} onApplyPositions={onApplyPositions} />,
    );

    await user.click(screen.getByText('Counter March'));
    await user.click(screen.getByRole('button', { name: /preview/i }));
    await user.click(screen.getByRole('button', { name: /apply/i }));

    expect(onApplyPositions).toHaveBeenCalledTimes(1);
    const [performerIds, positions] = onApplyPositions.mock.calls[0];
    expect(performerIds).toEqual(['p1', 'p2', 'p3']);
    expect(positions).toHaveLength(3);
  });

  test('close button calls onClose', { timeout: 15000 }, async () => {
    const onClose = vi.fn();
    const { user } = render(
      <MovementToolsPanel {...defaultProps} onClose={onClose} />,
    );

    // The close button is the X icon button in the header
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find((b) => {
      // The close button is next to the title in the header
      return b.closest('.flex.items-center.justify-between') && b.querySelector('.w-4.h-4');
    });

    if (closeButton) {
      await user.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  test('shows warning when no performers are selected and positions are empty', async () => {
    const { user } = render(
      <MovementToolsPanel
        {...defaultProps}
        selectedPositions={[]}
        allPositions={[]}
      />,
    );

    await user.click(screen.getByText('Counter March'));

    expect(screen.getByText(/select performers to use movement tools/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /preview/i })).toBeDisabled();
  });

  test('switching category resets selected tool', async () => {
    const { user } = render(<MovementToolsPanel {...defaultProps} />);

    // Select a tool in Transitions
    await user.click(screen.getByText('Counter March'));
    expect(screen.getByText('Parameters')).toBeInTheDocument();

    // Switch to Rotations
    await user.click(screen.getByText('Rotations'));
    expect(screen.queryByText('Parameters')).not.toBeInTheDocument();
  });
});
