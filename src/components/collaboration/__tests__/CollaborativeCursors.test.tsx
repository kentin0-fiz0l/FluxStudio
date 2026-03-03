/**
 * CollaborativeCursors Component Tests
 *
 * Tests cursor rendering, pointer-events-none overlay, user name labels.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import React from 'react';

vi.mock('@/store', () => ({
  useCollaborators: () => [
    {
      userId: 'u-1',
      userName: 'Alice',
      color: '#3B82F6',
      isActive: true,
      cursor: { x: 100, y: 200 },
    },
    {
      userId: 'u-2',
      userName: 'Bob',
      color: '#EF4444',
      isActive: true,
      cursor: { x: 300, y: 150 },
    },
  ],
  useCollaboration: () => ({
    updateLocalCursor: vi.fn(),
  }),
}));

vi.mock('@/services/realtime', () => ({
  realtime: {
    channels: {
      collaboration: {
        updateCursor: vi.fn(),
        onCursorMove: vi.fn(() => ({ unsubscribe: vi.fn() })),
      },
    },
  },
}));

import { CollaborativeCursors } from '../CollaborativeCursors';

function defaultProps() {
  const ref = React.createRef<HTMLDivElement>();
  return {
    canvasRef: ref as React.RefObject<HTMLElement | null>,
    sessionId: 'board:board-1',
  };
}

describe('CollaborativeCursors', () => {
  test('renders cursor overlay with pointer-events-none', () => {
    const { container } = render(<CollaborativeCursors {...defaultProps()} />);
    const overlay = container.firstElementChild;
    expect(overlay?.className).toContain('pointer-events-none');
  });

  test('renders cursor for each collaborator', () => {
    render(<CollaborativeCursors {...defaultProps()} />);
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  test('renders SVG cursor arrows', () => {
    const { container } = render(<CollaborativeCursors {...defaultProps()} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });
});
