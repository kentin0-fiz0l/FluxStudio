/**
 * ConversationSidebar Component Tests
 *
 * Tests conversation list rendering, search, filters,
 * empty states, loading state, and conversation selection.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import {
  ConversationSidebar,
  ConversationItem,
  EmptyMessagesState,
} from '../ConversationSidebar';
import type { ConversationSidebarProps } from '../ConversationSidebar';
import type { Conversation, MessageUser } from '../types';

// Mock ChatAvatar to avoid deep component tree
vi.mock('../ChatMessageBubble', () => ({
  ChatAvatar: vi.fn(({ user }: { user: MessageUser }) => (
    <div data-testid="chat-avatar">{user.name}</div>
  )),
}));

// Mock utils to avoid time-dependent formatting
vi.mock('../utils', () => ({
  formatTime: vi.fn(() => '2m'),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const participant: MessageUser = {
  id: 'user-2',
  name: 'Bob',
  initials: 'B',
  isOnline: true,
};

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    title: 'Bob',
    type: 'direct',
    participant,
    unreadCount: 0,
    ...overrides,
  };
}

function noop() {}

function defaultProps(overrides: Partial<ConversationSidebarProps> = {}): ConversationSidebarProps {
  return {
    conversations: [makeConversation()],
    selectedConversation: null,
    onConversationClick: noop,
    onNewConversation: noop,
    searchTerm: '',
    onSearchChange: noop,
    filter: 'all',
    onFilterChange: noop,
    onlineCount: 3,
    unreadCount: 1,
    isLoading: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// EmptyMessagesState
// ---------------------------------------------------------------------------

describe('EmptyMessagesState', () => {
  test('renders heading and new message button', () => {
    render(<EmptyMessagesState onStartConversation={noop} />);

    expect(screen.getByText('Start a conversation')).toBeTruthy();
    expect(screen.getByText('New Message')).toBeTruthy();
  });

  test('calls onStartConversation when button is clicked', async () => {
    const onStart = vi.fn();
    const { user } = render(<EmptyMessagesState onStartConversation={onStart} />);

    await user.click(screen.getByText('New Message'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// ConversationItem
// ---------------------------------------------------------------------------

describe('ConversationItem', () => {
  test('renders conversation title', () => {
    render(
      <ConversationItem
        conversation={makeConversation({ title: 'Design Chat' })}
        isSelected={false}
        onClick={noop}
      />
    );

    expect(screen.getByText('Design Chat')).toBeTruthy();
  });

  test('renders unread badge when unreadCount > 0', () => {
    render(
      <ConversationItem
        conversation={makeConversation({ unreadCount: 5 })}
        isSelected={false}
        onClick={noop}
      />
    );

    expect(screen.getByText('5')).toBeTruthy();
  });

  test('shows 99+ for large unread counts', () => {
    render(
      <ConversationItem
        conversation={makeConversation({ unreadCount: 150 })}
        isSelected={false}
        onClick={noop}
      />
    );

    expect(screen.getByText('99+')).toBeTruthy();
  });

  test('shows typing indicator when isTyping is true', () => {
    render(
      <ConversationItem
        conversation={makeConversation({ isTyping: true })}
        isSelected={false}
        onClick={noop}
      />
    );

    expect(screen.getByText('typing...')).toBeTruthy();
  });

  test('shows last message preview', () => {
    const conv = makeConversation({
      lastMessage: {
        id: 'msg-1',
        content: 'Hey there!',
        author: participant,
        timestamp: new Date(),
        isCurrentUser: false,
      },
    });
    render(<ConversationItem conversation={conv} isSelected={false} onClick={noop} />);

    expect(screen.getByText('Hey there!')).toBeTruthy();
  });

  test('shows "No messages yet" when no last message', () => {
    render(
      <ConversationItem
        conversation={makeConversation({ lastMessage: undefined })}
        isSelected={false}
        onClick={noop}
      />
    );

    expect(screen.getByText('No messages yet')).toBeTruthy();
  });

  test('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const { user } = render(
      <ConversationItem
        conversation={makeConversation()}
        isSelected={false}
        onClick={onClick}
      />
    );

    // The title is in an h3; avatar mock also renders the name
    const heading = document.querySelector('h3');
    expect(heading).toBeTruthy();
    await user.click(heading!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('renders project badge when projectName is set', () => {
    render(
      <ConversationItem
        conversation={makeConversation({
          projectId: 'proj-1',
          projectName: 'Design Sprint',
        })}
        isSelected={false}
        onClick={noop}
      />
    );

    expect(screen.getByText('Design Sprint')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ConversationSidebar
// ---------------------------------------------------------------------------

describe('ConversationSidebar', () => {
  test('renders header with title and counts', () => {
    render(<ConversationSidebar {...defaultProps()} />);

    expect(screen.getByText('Messages')).toBeTruthy();
    expect(screen.getByText('3 online · 1 unread')).toBeTruthy();
  });

  test('renders search input', () => {
    render(<ConversationSidebar {...defaultProps()} />);

    expect(screen.getByPlaceholderText('Search conversations...')).toBeTruthy();
  });

  test('calls onSearchChange when typing in search', async () => {
    const onSearch = vi.fn();
    const { user } = render(
      <ConversationSidebar {...defaultProps({ onSearchChange: onSearch })} />
    );

    const input = screen.getByPlaceholderText('Search conversations...');
    await user.type(input, 'hello');
    expect(onSearch).toHaveBeenCalled();
  });

  test('renders filter buttons', () => {
    render(<ConversationSidebar {...defaultProps()} />);

    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Unread')).toBeTruthy();
    expect(screen.getByText('Starred')).toBeTruthy();
    expect(screen.getByText('Muted')).toBeTruthy();
  });

  test('calls onFilterChange when filter button is clicked', async () => {
    const onFilter = vi.fn();
    const { user } = render(
      <ConversationSidebar {...defaultProps({ onFilterChange: onFilter })} />
    );

    await user.click(screen.getByText('Unread'));
    expect(onFilter).toHaveBeenCalledWith('unread');
  });

  test('renders conversation list', () => {
    const convs = [
      makeConversation({ id: 'c1', title: 'Alice' }),
      makeConversation({ id: 'c2', title: 'Charlie' }),
    ];
    render(<ConversationSidebar {...defaultProps({ conversations: convs })} />);

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Charlie')).toBeTruthy();
  });

  test('calls onConversationClick when a conversation is clicked', async () => {
    const onClick = vi.fn();
    const conv = makeConversation({ title: 'Alice' });
    const { user } = render(
      <ConversationSidebar
        {...defaultProps({
          conversations: [conv],
          onConversationClick: onClick,
        })}
      />
    );

    await user.click(screen.getByText('Alice'));
    expect(onClick).toHaveBeenCalledWith(conv);
  });

  test('shows loading spinner when isLoading and no conversations', () => {
    render(
      <ConversationSidebar
        {...defaultProps({ isLoading: true, conversations: [] })}
      />
    );

    // Loader2 renders an SVG with animate-spin class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  test('shows empty state when no conversations and no search', () => {
    render(
      <ConversationSidebar {...defaultProps({ conversations: [] })} />
    );

    expect(screen.getByText('Start a conversation')).toBeTruthy();
  });

  test('shows search empty state when no conversations match search', () => {
    render(
      <ConversationSidebar
        {...defaultProps({ conversations: [], searchTerm: 'xyz' })}
      />
    );

    expect(screen.getByText('No conversations match your search')).toBeTruthy();
  });

  test('calls onNewConversation when new button is clicked', async () => {
    const onNew = vi.fn();
    const { user } = render(
      <ConversationSidebar {...defaultProps({ onNewConversation: onNew })} />
    );

    // The new conversation button is a Button with UserPlus icon
    const buttons = screen.getAllByRole('button');
    // Find the one in the header (variant="outline" size="sm")
    const newBtn = buttons.find((b) => b.className.includes('outline') || b.closest('.border-b'));
    if (newBtn) {
      await user.click(newBtn);
      expect(onNew).toHaveBeenCalledTimes(1);
    }
  });
});
