import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { PresenceAvatars } from '../PresenceAvatars';
import type { MetMapPresence } from '../../../services/metmapCollaboration';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));

// Mock isPeerIdle to control idle state in tests
const mockIsPeerIdle = vi.fn().mockReturnValue(false);
vi.mock('../../../hooks/useMetMapPresence', () => ({
  isPeerIdle: (...args: unknown[]) => mockIsPeerIdle(...args),
}));

function makePeer(overrides: Partial<MetMapPresence> = {}): MetMapPresence {
  return {
    userId: 'user-1',
    username: 'Alice',
    color: '#ff0000',
    avatar: undefined,
    editingSection: null,
    selectedKeyframe: null,
    cursorBar: null,
    lastActive: Date.now(),
    ...overrides,
  };
}

describe('PresenceAvatars', () => {
  it('returns null for empty peers', () => {
    const { container } = render(
      <PresenceAvatars peers={[]} currentUserId="user-1" />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders avatars for peers', () => {
    const peers = [
      makePeer({ userId: 'user-1', username: 'Alice Smith' }),
      makePeer({ userId: 'user-2', username: 'Bob Jones' }),
    ];
    render(<PresenceAvatars peers={peers} currentUserId="user-1" />);
    // getInitials splits on whitespace, takes first char of each word
    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.getByText('BJ')).toBeInTheDocument();
  });

  it('renders initials fallback from username', () => {
    const peers = [makePeer({ userId: 'u1', username: 'John Doe' })];
    render(<PresenceAvatars peers={peers} currentUserId="u1" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('marks current user with (you) in title', () => {
    const peers = [makePeer({ userId: 'me', username: 'Alice Smith' })];
    render(<PresenceAvatars peers={peers} currentUserId="me" />);
    expect(screen.getByTitle('Alice Smith (you)')).toBeInTheDocument();
  });

  it('sorts current user first', () => {
    const peers = [
      makePeer({ userId: 'other', username: 'Bob Jones' }),
      makePeer({ userId: 'me', username: 'Alice Smith' }),
    ];
    const { container } = render(<PresenceAvatars peers={peers} currentUserId="me" />);
    const avatarDivs = container.querySelectorAll('.relative.group');
    expect(avatarDivs[0]).toHaveAttribute('title', 'Alice Smith (you)');
    expect(avatarDivs[1]).toHaveAttribute('title', 'Bob Jones');
  });

  it('sorts idle users last', () => {
    mockIsPeerIdle.mockImplementation((peer: MetMapPresence) => peer.userId === 'idle-user');

    const peers = [
      makePeer({ userId: 'idle-user', username: 'Idle' }),
      makePeer({ userId: 'active-user', username: 'Active' }),
    ];
    const { container } = render(<PresenceAvatars peers={peers} currentUserId="other" />);
    const avatarDivs = container.querySelectorAll('.relative.group');
    expect(avatarDivs[0]).toHaveAttribute('title', 'Active');
    expect(avatarDivs[1]).toHaveAttribute('title', 'Idle');

    mockIsPeerIdle.mockReturnValue(false);
  });

  it('shows overflow count when peers exceed maxVisible', () => {
    const peers = Array.from({ length: 7 }, (_, i) =>
      makePeer({ userId: `u-${i}`, username: `User ${i}` })
    );
    render(<PresenceAvatars peers={peers} currentUserId="u-0" />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('respects maxVisible default of 5', () => {
    const peers = Array.from({ length: 6 }, (_, i) =>
      makePeer({ userId: `u-${i}`, username: `User ${i}` })
    );
    render(<PresenceAvatars peers={peers} currentUserId="u-0" />);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('does not show overflow when within maxVisible', () => {
    const peers = Array.from({ length: 3 }, (_, i) =>
      makePeer({ userId: `u-${i}`, username: `User ${i}` })
    );
    render(<PresenceAvatars peers={peers} currentUserId="u-0" />);
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  it('applies opacity for idle peers', () => {
    mockIsPeerIdle.mockReturnValue(true);
    const peers = [makePeer({ userId: 'u1', username: 'Idle User' })];
    const { container } = render(<PresenceAvatars peers={peers} currentUserId="other" />);
    const avatarCircle = container.querySelector('.opacity-40');
    expect(avatarCircle).toBeInTheDocument();
    mockIsPeerIdle.mockReturnValue(false);
  });

  it('renders img when avatar URL is provided', () => {
    const peers = [makePeer({ userId: 'u1', username: 'Alice', avatar: 'https://example.com/a.png' })];
    render(<PresenceAvatars peers={peers} currentUserId="u1" />);
    const img = screen.getByAltText('Alice');
    expect(img).toHaveAttribute('src', 'https://example.com/a.png');
  });

  it('applies className prop', () => {
    const peers = [makePeer({ userId: 'u1', username: 'Alice' })];
    const { container } = render(
      <PresenceAvatars peers={peers} currentUserId="u1" className="test-cls" />
    );
    expect(container.firstChild).toHaveClass('test-cls');
  });
});
