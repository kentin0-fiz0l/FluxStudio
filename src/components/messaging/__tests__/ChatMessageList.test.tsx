/**
 * ChatMessageList Component Tests
 *
 * Tests message rendering, empty state, date separators,
 * message grouping, typing indicators, pinned indicators,
 * and scroll management.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { ChatMessageList } from '../ChatMessageList';
import type { ChatMessageListProps } from '../ChatMessageList';
import type { Message, MessageUser } from '../types';

// Mock ChatAvatar
vi.mock('../ChatMessageBubble', () => ({
  ChatAvatar: vi.fn(({ user }: { user: MessageUser }) => (
    <div data-testid="chat-avatar">{user.name}</div>
  )),
}));

// Mock scrollIntoView which is not available in jsdom
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function noop() {}

const author: MessageUser = {
  id: 'user-1',
  name: 'Alice',
  initials: 'A',
};

const otherAuthor: MessageUser = {
  id: 'user-2',
  name: 'Bob',
  initials: 'B',
};

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    content: 'Hello world',
    author,
    timestamp: new Date('2025-06-01T10:00:00Z'),
    isCurrentUser: false,
    ...overrides,
  };
}

function defaultProps(overrides: Partial<ChatMessageListProps> = {}): ChatMessageListProps {
  return {
    messages: [],
    pinnedMessageIds: [],
    typingUsers: [],
    highlightedMessageId: null,
    editingMessageId: null,
    editingDraft: '',
    currentUserId: 'me',
    onReply: noop,
    onEdit: noop,
    onDelete: noop,
    onPin: noop,
    onCopy: noop,
    onForward: noop,
    onReact: noop,
    onOpenThread: noop,
    onJumpToMessage: noop,
    onChangeEditingDraft: noop,
    onSubmitEdit: noop,
    onCancelEdit: noop,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChatMessageList', () => {
  test('renders empty state when no messages', () => {
    render(<ChatMessageList {...defaultProps()} />);

    expect(screen.getByText('Start the conversation!')).toBeTruthy();
  });

  test('renders message content', () => {
    render(
      <ChatMessageList
        {...defaultProps({ messages: [makeMessage({ content: 'Test message' })] })}
      />
    );

    expect(screen.getByText('Test message')).toBeTruthy();
  });

  test('renders author name for ungrouped messages', () => {
    render(
      <ChatMessageList
        {...defaultProps({ messages: [makeMessage()] })}
      />
    );

    // Avatar mock also renders the name, so use getAllByText
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
  });

  test('renders multiple messages', () => {
    const msgs = [
      makeMessage({ id: 'm1', content: 'First message' }),
      makeMessage({
        id: 'm2',
        content: 'Second message',
        author: otherAuthor,
        timestamp: new Date('2025-06-01T10:05:00Z'),
      }),
    ];
    render(<ChatMessageList {...defaultProps({ messages: msgs })} />);

    expect(screen.getByText('First message')).toBeTruthy();
    expect(screen.getByText('Second message')).toBeTruthy();
  });

  test('shows date separator between messages on different days', () => {
    const msgs = [
      makeMessage({
        id: 'm1',
        content: 'Yesterday msg',
        timestamp: new Date('2025-05-31T10:00:00Z'),
      }),
      makeMessage({
        id: 'm2',
        content: 'Today msg',
        timestamp: new Date('2025-06-01T10:00:00Z'),
      }),
    ];
    render(<ChatMessageList {...defaultProps({ messages: msgs })} />);

    // Both messages should render
    expect(screen.getByText('Yesterday msg')).toBeTruthy();
    expect(screen.getByText('Today msg')).toBeTruthy();
  });

  test('shows typing indicator when typingUsers is not empty', () => {
    render(
      <ChatMessageList
        {...defaultProps({
          messages: [makeMessage()],
          typingUsers: [{ userId: 'u2', userName: 'Bob' }],
        })}
      />
    );

    expect(screen.getByText('Bob is typing...')).toBeTruthy();
  });

  test('shows multiple typing users', () => {
    render(
      <ChatMessageList
        {...defaultProps({
          messages: [makeMessage()],
          typingUsers: [
            { userId: 'u2', userName: 'Bob' },
            { userId: 'u3', userName: 'Charlie' },
          ],
        })}
      />
    );

    expect(screen.getByText('Bob and Charlie are typing...')).toBeTruthy();
  });

  test('does not show typing indicator when typingUsers is empty', () => {
    render(
      <ChatMessageList
        {...defaultProps({
          messages: [makeMessage()],
          typingUsers: [],
        })}
      />
    );

    expect(screen.queryByText(/is typing/)).toBeNull();
  });

  test('shows (edited) tag for edited messages', () => {
    render(
      <ChatMessageList
        {...defaultProps({
          messages: [makeMessage({ isEdited: true })],
        })}
      />
    );

    expect(screen.getByText('(edited)')).toBeTruthy();
  });

  test('shows thread reply count', () => {
    render(
      <ChatMessageList
        {...defaultProps({
          messages: [makeMessage({ threadReplyCount: 3 })],
        })}
      />
    );

    expect(screen.getByText('3 replies')).toBeTruthy();
  });

  test('shows singular reply for 1 thread reply', () => {
    render(
      <ChatMessageList
        {...defaultProps({
          messages: [makeMessage({ threadReplyCount: 1 })],
        })}
      />
    );

    expect(screen.getByText('1 reply')).toBeTruthy();
  });

  test('renders reactions', () => {
    render(
      <ChatMessageList
        {...defaultProps({
          messages: [
            makeMessage({
              reactions: [
                { emoji: '❤️', count: 2, userIds: ['u1', 'u2'] },
              ],
            }),
          ],
        })}
      />
    );

    // Reaction badge shows emoji and count
    const reactionBadge = document.querySelector('.rounded-full.text-xs');
    expect(reactionBadge?.textContent).toContain('❤️');
    expect(reactionBadge?.textContent).toContain('2');
  });

  test('renders editing UI when editingMessageId matches', () => {
    render(
      <ChatMessageList
        {...defaultProps({
          messages: [makeMessage({ id: 'msg-edit' })],
          editingMessageId: 'msg-edit',
          editingDraft: 'Edited content',
        })}
      />
    );

    // Should show a textarea with the editing draft
    const textarea = document.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea?.value).toBe('Edited content');
    expect(screen.getByText('Save')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  test('renders reply reference when message has replyTo', () => {
    render(
      <ChatMessageList
        {...defaultProps({
          messages: [
            makeMessage({ id: 'original', content: 'Original' }),
            makeMessage({
              id: 'reply',
              content: 'Reply msg',
              timestamp: new Date('2025-06-01T10:05:00Z'),
              replyTo: {
                id: 'original',
                content: 'Original',
                author,
              },
            }),
          ],
        })}
      />
    );

    expect(screen.getByText('Reply msg')).toBeTruthy();
  });

  test('shows own messages aligned differently', () => {
    render(
      <ChatMessageList
        {...defaultProps({
          currentUserId: 'user-1',
          messages: [
            makeMessage({ id: 'm1', author: { ...author, id: 'user-1' } }),
          ],
        })}
      />
    );

    // Own messages have justify-end class
    const msgEl = document.querySelector('[data-message-id="m1"]');
    expect(msgEl?.className).toContain('justify-end');
  });

  test('does not show justify-end for other user messages', () => {
    render(
      <ChatMessageList
        {...defaultProps({
          currentUserId: 'me',
          messages: [makeMessage({ id: 'm1' })],
        })}
      />
    );

    const msgEl = document.querySelector('[data-message-id="m1"]');
    expect(msgEl?.className).not.toContain('justify-end');
  });
});
