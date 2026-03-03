/**
 * ThreadPanel Component Tests
 *
 * Tests header, root message, reply count, empty state, composer.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock('../MarkdownMessage', () => ({
  MarkdownMessage: ({ text }: any) => <span>{text}</span>,
}));

import { ThreadPanel } from '../ThreadPanel';

const rootMessage = {
  id: 'msg-root',
  userId: 'user-1',
  conversationId: 'conv-1',
  text: 'This is the root message',
  userName: 'Alice',
  createdAt: new Date().toISOString(),
};

const reply = {
  id: 'msg-reply-1',
  userId: 'user-2',
  conversationId: 'conv-1',
  text: 'This is a reply',
  userName: 'Bob',
  createdAt: new Date().toISOString(),
  threadRootMessageId: 'msg-root',
};

function defaultProps(overrides: Partial<Parameters<typeof ThreadPanel>[0]> = {}) {
  return {
    conversationId: 'conv-1',
    rootMessage,
    messages: [reply],
    isLoading: false,
    onClose: vi.fn(),
    onReply: vi.fn(() => Promise.resolve()),
    currentUserId: 'user-1',
    ...overrides,
  };
}

describe('ThreadPanel', () => {
  test('renders Thread heading', () => {
    render(<ThreadPanel {...defaultProps()} />);
    expect(screen.getByText('Thread')).toBeTruthy();
  });

  test('renders root message text', () => {
    render(<ThreadPanel {...defaultProps()} />);
    expect(screen.getByText('This is the root message')).toBeTruthy();
  });

  test('renders reply messages', () => {
    render(<ThreadPanel {...defaultProps()} />);
    expect(screen.getByText('This is a reply')).toBeTruthy();
  });

  test('shows reply count', () => {
    render(<ThreadPanel {...defaultProps()} />);
    expect(screen.getByText('1 reply')).toBeTruthy();
  });

  test('shows empty state when no replies', () => {
    render(<ThreadPanel {...defaultProps({ messages: [] })} />);
    expect(screen.getByText('No replies yet')).toBeTruthy();
  });

  test('renders composer placeholder', () => {
    render(<ThreadPanel {...defaultProps()} />);
    expect(screen.getByPlaceholderText('Reply to thread...')).toBeTruthy();
  });

  test('shows user names', () => {
    render(<ThreadPanel {...defaultProps()} />);
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });
});
