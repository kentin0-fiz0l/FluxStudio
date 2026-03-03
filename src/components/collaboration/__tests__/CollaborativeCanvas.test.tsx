/**
 * CollaborativeCanvas Component Tests
 *
 * Tests children rendering, presence indicator, cursors, selection highlights.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

vi.mock('@/store', () => ({
  useCollaboration: () => ({
    joinSession: vi.fn(),
    leaveSession: vi.fn(),
    updateCollaborator: vi.fn(),
    removeCollaborator: vi.fn(),
    addEdit: vi.fn(),
  }),
  useActiveSession: () => ({
    collaborators: [{ userId: 'u-1', userName: 'Alice' }],
  }),
  useIsEntityLocked: () => ({ locked: false, byMe: false }),
}));

vi.mock('@/services/realtime', () => ({
  realtime: {
    channels: {
      collaboration: {
        joinBoard: vi.fn(),
        leaveBoard: vi.fn(),
        onUserJoined: vi.fn(() => ({ unsubscribe: vi.fn() })),
        onUserLeft: vi.fn(() => ({ unsubscribe: vi.fn() })),
        onEdit: vi.fn(() => ({ unsubscribe: vi.fn() })),
      },
    },
  },
}));

vi.mock('../CollaborativeCursors', () => ({
  CollaborativeCursors: () => <div data-testid="cursors" />,
}));

vi.mock('../PresenceIndicator', () => ({
  PresenceIndicator: () => <div data-testid="presence" />,
}));

vi.mock('../SelectionHighlights', () => ({
  SelectionHighlights: () => <div data-testid="selections" />,
}));

import { CollaborativeCanvas } from '../CollaborativeCanvas';

function defaultProps(overrides: Partial<Parameters<typeof CollaborativeCanvas>[0]> = {}) {
  return {
    entityType: 'board' as const,
    entityId: 'board-1',
    children: <div data-testid="canvas-content">Canvas Content</div>,
    ...overrides,
  };
}

describe('CollaborativeCanvas', () => {
  test('renders children content', () => {
    render(<CollaborativeCanvas {...defaultProps()} />);
    expect(screen.getByTestId('canvas-content')).toBeTruthy();
    expect(screen.getByText('Canvas Content')).toBeTruthy();
  });

  test('renders presence indicator when showPresence is true', () => {
    render(<CollaborativeCanvas {...defaultProps()} />);
    expect(screen.getByTestId('presence')).toBeTruthy();
  });

  test('renders collaborative cursors when showCursors is true', () => {
    render(<CollaborativeCanvas {...defaultProps()} />);
    expect(screen.getByTestId('cursors')).toBeTruthy();
  });

  test('renders selection highlights when showSelections is true', () => {
    render(<CollaborativeCanvas {...defaultProps()} />);
    expect(screen.getByTestId('selections')).toBeTruthy();
  });

  test('shows viewer count', () => {
    render(<CollaborativeCanvas {...defaultProps()} />);
    expect(screen.getByText('1 viewer')).toBeTruthy();
  });

  test('hides cursors when showCursors is false', () => {
    render(<CollaborativeCanvas {...defaultProps({ showCursors: false })} />);
    expect(screen.queryByTestId('cursors')).toBeNull();
  });
});
