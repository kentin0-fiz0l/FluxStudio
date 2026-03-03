/**
 * ForwardMessageDialog Component Tests
 *
 * Tests dialog rendering, conversation list, selection, cancel/forward buttons.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

vi.mock('@/components/ui', () => ({
  Dialog: ({ open, children }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

import { ForwardMessageDialog } from '../ForwardMessageDialog';

const mockConversations = [
  { id: 'c-1', title: 'Alice', type: 'direct' as const, unreadCount: 0, lastMessage: { content: 'Hi' } as any, participant: { id: 'u-1', name: 'Alice', initials: 'A' } },
  { id: 'c-2', title: 'Team Chat', type: 'group' as const, unreadCount: 0, lastMessage: { content: 'Hey' } as any, participant: { id: 'u-2', name: 'Team Chat', initials: 'TC' } },
  { id: 'c-3', title: 'Current', type: 'direct' as const, unreadCount: 0, lastMessage: undefined, participant: { id: 'u-3', name: 'Current', initials: 'C' } },
];

function defaultProps(overrides: Partial<Parameters<typeof ForwardMessageDialog>[0]> = {}) {
  return {
    open: true,
    onOpenChange: vi.fn(),
    sourceMessage: { id: 'msg-1', content: 'Hello world', userId: 'u-1' } as any,
    conversations: mockConversations,
    currentConversationId: 'c-3',
    targetConversationId: null,
    onSelectTarget: vi.fn(),
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
}

describe('ForwardMessageDialog', () => {
  test('renders nothing when closed', () => {
    const { container } = render(<ForwardMessageDialog {...defaultProps({ open: false })} />);
    expect(container.querySelector('[data-testid="dialog"]')).toBeNull();
  });

  test('renders dialog title', () => {
    render(<ForwardMessageDialog {...defaultProps()} />);
    expect(screen.getByText('Forward message')).toBeTruthy();
  });

  test('shows message preview', () => {
    render(<ForwardMessageDialog {...defaultProps()} />);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  test('renders available conversations excluding current', () => {
    render(<ForwardMessageDialog {...defaultProps()} />);
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Team Chat')).toBeTruthy();
    expect(screen.queryByText('Current')).toBeNull();
  });

  test('calls onSelectTarget when conversation is clicked', async () => {
    const onSelectTarget = vi.fn();
    const { user } = render(<ForwardMessageDialog {...defaultProps({ onSelectTarget })} />);
    await user.click(screen.getByText('Alice'));
    expect(onSelectTarget).toHaveBeenCalledWith('c-1');
  });

  test('renders Cancel and Forward buttons', () => {
    render(<ForwardMessageDialog {...defaultProps()} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Forward')).toBeTruthy();
  });

  test('Forward button is disabled when no target selected', () => {
    render(<ForwardMessageDialog {...defaultProps()} />);
    const forwardBtn = screen.getByText('Forward');
    expect(forwardBtn.hasAttribute('disabled')).toBe(true);
  });
});
