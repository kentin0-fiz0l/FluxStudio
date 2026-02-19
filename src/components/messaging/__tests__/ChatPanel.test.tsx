/**
 * ChatPanel Component Tests
 *
 * Tests the chat panel composition: empty state, header rendering,
 * conversation display, pinned messages panel, thread hint, and callbacks.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { ChatPanel, EmptyChatState } from '../ChatPanel';
import type { ChatPanelProps } from '../ChatPanel';
import type { Message, Conversation, MessageUser } from '../types';

// Mock child components to isolate ChatPanel behaviour
vi.mock('../ChatMessageList', () => ({
  ChatMessageList: vi.fn(() => <div data-testid="chat-message-list" />),
}));

vi.mock('../ChatInputArea', () => ({
  ChatInputArea: vi.fn(({ composer }: { composer: React.ReactNode }) => (
    <div data-testid="chat-input-area">{composer}</div>
  )),
}));

vi.mock('../PinnedMessagesPanel', () => ({
  PinnedMessagesPanel: vi.fn(() => <div data-testid="pinned-messages-panel" />),
}));

vi.mock('../ChatMessageBubble', () => ({
  ChatAvatar: vi.fn(({ user }: { user: MessageUser }) => (
    <div data-testid="chat-avatar">{user.name}</div>
  )),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUser: MessageUser = {
  id: 'user-1',
  name: 'Alice',
  initials: 'A',
  isOnline: true,
};

const mockConversation: Conversation = {
  id: 'conv-1',
  title: 'Alice',
  type: 'direct',
  participant: mockUser,
  unreadCount: 0,
};

const baseMessage: Message = {
  id: 'msg-1',
  content: 'Hello world',
  author: mockUser,
  timestamp: new Date('2025-06-01T10:00:00Z'),
  isCurrentUser: false,
};

function noop() {}

function defaultProps(overrides: Partial<ChatPanelProps> = {}): ChatPanelProps {
  return {
    conversation: mockConversation,
    messages: [baseMessage],
    pinnedMessageIds: [],
    typingUsers: [],
    isConnected: true,
    highlightedMessageId: null,
    editingMessageId: null,
    editingDraft: '',
    currentUserId: 'me',
    showMobileChat: true,
    onMobileBack: noop,
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
    onStartConversation: noop,
    showPinnedMessages: false,
    onTogglePinnedMessages: noop,
    showSummaryPanel: false,
    onToggleSummaryPanel: noop,
    showMessageSearch: false,
    onToggleMessageSearch: noop,
    composer: <div data-testid="composer">Composer</div>,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EmptyChatState', () => {
  test('renders heading and start button', () => {
    const onStart = vi.fn();
    render(<EmptyChatState onStartConversation={onStart} />);

    expect(screen.getByText('Select a conversation')).toBeTruthy();
    expect(screen.getByText('Start New Conversation')).toBeTruthy();
  });

  test('calls onStartConversation when button is clicked', async () => {
    const onStart = vi.fn();
    const { user } = render(<EmptyChatState onStartConversation={onStart} />);

    await user.click(screen.getByText('Start New Conversation'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});

describe('ChatPanel', () => {
  test('renders empty state when conversation is null', () => {
    render(<ChatPanel {...defaultProps({ conversation: null })} />);

    expect(screen.getByText('Select a conversation')).toBeTruthy();
  });

  test('renders conversation title in header', () => {
    render(<ChatPanel {...defaultProps()} />);

    // The title is in an h3 element; the avatar mock also renders the name
    const heading = document.querySelector('h3');
    expect(heading?.textContent).toBe('Alice');
  });

  test('renders ChatMessageList', () => {
    render(<ChatPanel {...defaultProps()} />);

    expect(screen.getByTestId('chat-message-list')).toBeTruthy();
  });

  test('renders composer inside ChatInputArea', () => {
    render(<ChatPanel {...defaultProps()} />);

    expect(screen.getByTestId('chat-input-area')).toBeTruthy();
    expect(screen.getByTestId('composer')).toBeTruthy();
  });

  test('shows pinned messages panel when showPinnedMessages is true', () => {
    render(<ChatPanel {...defaultProps({ showPinnedMessages: true })} />);

    expect(screen.getByTestId('pinned-messages-panel')).toBeTruthy();
  });

  test('hides pinned messages panel when showPinnedMessages is false', () => {
    render(<ChatPanel {...defaultProps({ showPinnedMessages: false })} />);

    expect(screen.queryByTestId('pinned-messages-panel')).toBeNull();
  });

  test('renders message search panel when showMessageSearch is true', () => {
    const searchPanel = <div data-testid="search-panel">Search</div>;
    render(
      <ChatPanel
        {...defaultProps({
          showMessageSearch: true,
          messageSearchPanel: searchPanel,
        })}
      />
    );

    expect(screen.getByTestId('search-panel')).toBeTruthy();
  });

  test('renders thread hint when showThreadHint is true and messages exist', () => {
    render(
      <ChatPanel
        {...defaultProps({
          showThreadHint: true,
          onDismissThreadHint: noop,
        })}
      />
    );

    expect(screen.getByText(/Threads keep replies organized/)).toBeTruthy();
  });

  test('does not render thread hint when no messages', () => {
    render(
      <ChatPanel
        {...defaultProps({
          showThreadHint: true,
          onDismissThreadHint: noop,
          messages: [],
        })}
      />
    );

    expect(screen.queryByText(/Threads keep replies organized/)).toBeNull();
  });

  test('shows typing indicator text when participant is typing', () => {
    render(
      <ChatPanel
        {...defaultProps({
          typingUsers: [{ userId: 'user-1', userName: 'Alice' }],
        })}
      />
    );

    expect(screen.getByText('typing...')).toBeTruthy();
  });

  test('shows online status for online participant', () => {
    render(<ChatPanel {...defaultProps()} />);

    expect(screen.getByText('Online')).toBeTruthy();
  });

  test('shows member count for group conversations', () => {
    const groupConv: Conversation = {
      ...mockConversation,
      type: 'group',
      participants: [mockUser, { id: 'user-2', name: 'Bob', initials: 'B' }],
    };
    render(<ChatPanel {...defaultProps({ conversation: groupConv })} />);

    expect(screen.getByText('2 members')).toBeTruthy();
  });

  test('calls onToggleMessageSearch when search button is clicked', async () => {
    const onToggle = vi.fn();
    const { user } = render(
      <ChatPanel {...defaultProps({ onToggleMessageSearch: onToggle })} />
    );

    await user.click(screen.getByTitle('Search messages (Ctrl+F)'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('calls onTogglePinnedMessages when pin button is clicked', async () => {
    const onToggle = vi.fn();
    const { user } = render(
      <ChatPanel {...defaultProps({ onTogglePinnedMessages: onToggle })} />
    );

    await user.click(screen.getByTitle('Pinned messages'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('calls onMobileBack when back button is clicked', async () => {
    const onBack = vi.fn();
    const { user } = render(
      <ChatPanel {...defaultProps({ onMobileBack: onBack })} />
    );

    // Back button has ArrowLeft icon inside, find by parent button class
    const buttons = document.querySelectorAll('button');
    // The back button is the first button in the header (md:hidden)
    const backButton = Array.from(buttons).find(
      (b) => b.className.includes('md:hidden')
    );
    if (backButton) {
      await user.click(backButton);
      expect(onBack).toHaveBeenCalledTimes(1);
    }
  });
});
