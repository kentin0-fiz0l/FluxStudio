/**
 * PresenceIndicator (Collaboration) Component Tests
 *
 * Tests avatar rendering, Live badge, overflow count, showDetails text.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

vi.mock('framer-motion', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('../../ui/avatar', () => ({
  Avatar: ({ children, className }: any) => <div className={className}>{children}</div>,
  AvatarFallback: ({ children }: any) => <span data-testid="avatar-fallback">{children}</span>,
  AvatarImage: ({ src }: any) => src ? <img src={src} alt="" /> : null,
}));

vi.mock('../../ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
}));

vi.mock('../../ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

const mockCollaborators = [
  { userId: 'u-1', name: 'Alice Smith', email: 'alice@test.com', avatar: '', status: 'online', currentPage: '/dashboard' },
  { userId: 'u-2', name: 'Bob Jones', email: 'bob@test.com', avatar: '', status: 'online', currentPage: '/editor' },
  { userId: 'u-3', name: 'Charlie Brown', email: 'charlie@test.com', avatar: '', status: 'online', currentPage: null },
];

vi.mock('../../../services/collaborationService', () => ({
  collaborationService: {
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    onPresenceChanged: vi.fn((cb: any) => {
      const map = new Map(mockCollaborators.map(c => [c.userId, c]));
      cb(map);
    }),
    onTypingChanged: vi.fn(),
  },
  CollaboratorPresence: {},
}));

import { PresenceIndicator } from '../PresenceIndicator';

function defaultProps(overrides: Partial<Parameters<typeof PresenceIndicator>[0]> = {}) {
  return {
    roomId: 'room-1',
    roomType: 'project' as const,
    maxDisplay: 5,
    ...overrides,
  };
}

describe('PresenceIndicator (Collaboration)', () => {
  test('renders avatar fallbacks for collaborators', () => {
    render(<PresenceIndicator {...defaultProps()} />);
    expect(screen.getByText('AS')).toBeTruthy();
    expect(screen.getByText('BJ')).toBeTruthy();
    expect(screen.getByText('CB')).toBeTruthy();
  });

  test('renders Live badge', () => {
    render(<PresenceIndicator {...defaultProps()} />);
    expect(screen.getByText('Live')).toBeTruthy();
  });

  test('shows active user count when showDetails is true', () => {
    render(<PresenceIndicator {...defaultProps({ showDetails: true })} />);
    expect(screen.getByText('3 active users')).toBeTruthy();
  });

  test('shows overflow count when collaborators exceed maxDisplay', () => {
    render(<PresenceIndicator {...defaultProps({ maxDisplay: 2 })} />);
    expect(screen.getByText('+1')).toBeTruthy();
  });

  test('renders nothing when roomId is not provided', () => {
    const { container } = render(<PresenceIndicator {...defaultProps({ roomId: undefined })} />);
    // Without roomId, useEffect doesn't run, collaborators stays empty, returns null
    expect(container.querySelector('[data-testid="badge"]')).toBeNull();
  });

  test('shows collaborator names in tooltips', () => {
    render(<PresenceIndicator {...defaultProps()} />);
    expect(screen.getByText('Alice Smith')).toBeTruthy();
    expect(screen.getByText('Bob Jones')).toBeTruthy();
  });
});
