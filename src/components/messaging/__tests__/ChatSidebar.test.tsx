/**
 * ChatSidebar Component Tests
 *
 * Tests heading, search input, filter buttons, loading skeletons,
 * conversation rendering, new conversation button.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

vi.mock('../ConversationSidebar', () => ({
  ConversationItem: ({ conversation, onClick }: any) => (
    <div data-testid={`conv-${conversation.id}`} onClick={onClick}>{conversation.title}</div>
  ),
}));

vi.mock('@/components/common/EmptyState', () => ({
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
  emptyStateConfigs: {
    messages: {
      title: 'No messages yet',
      description: 'Start a conversation',
      primaryCtaLabel: 'New Conversation',
      learnMoreItems: [],
    },
  },
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: any) => <div data-testid="skeleton" className={props.className} />,
}));

import { ChatSidebar } from '../ChatSidebar';

const mockConversation = (id: string, title: string, unread = 0) => ({
  id,
  title,
  type: 'direct' as const,
  unreadCount: unread,
  lastMessage: { content: 'Hello' } as any,
  participant: { id: 'u-1', name: title, initials: title.charAt(0) },
});

function defaultProps(overrides: Partial<Parameters<typeof ChatSidebar>[0]> = {}) {
  return {
    conversations: [mockConversation('c-1', 'Alice', 2), mockConversation('c-2', 'Bob')],
    filteredConversations: [mockConversation('c-1', 'Alice', 2), mockConversation('c-2', 'Bob')],
    selectedConversation: null,
    isLoading: false,
    searchTerm: '',
    onSearchChange: vi.fn(),
    filter: 'all' as const,
    onFilterChange: vi.fn(),
    onConversationClick: vi.fn(),
    onNewConversation: vi.fn(),
    onNavigateToProjects: vi.fn(),
    showMobileChat: false,
    onlineCount: 3,
    unreadCount: 5,
    ...overrides,
  };
}

describe('ChatSidebar', () => {
  test('renders Messages heading', () => {
    render(<ChatSidebar {...defaultProps()} />);
    expect(screen.getByText('Messages')).toBeTruthy();
  });

  test('renders online and unread stats', () => {
    render(<ChatSidebar {...defaultProps()} />);
    expect(screen.getByText('3 online · 5 unread')).toBeTruthy();
  });

  test('renders search input with placeholder', () => {
    render(<ChatSidebar {...defaultProps()} />);
    expect(screen.getByPlaceholderText('Search conversations...')).toBeTruthy();
  });

  test('renders filter buttons', () => {
    render(<ChatSidebar {...defaultProps()} />);
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Unread')).toBeTruthy();
    expect(screen.getByText('Starred')).toBeTruthy();
    expect(screen.getByText('Muted')).toBeTruthy();
  });

  test('renders conversation items', () => {
    render(<ChatSidebar {...defaultProps()} />);
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  test('shows loading skeletons when isLoading with no conversations', () => {
    render(<ChatSidebar {...defaultProps({ isLoading: true, conversations: [] })} />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  test('shows empty state when no filtered conversations and no search', () => {
    render(<ChatSidebar {...defaultProps({ filteredConversations: [] })} />);
    expect(screen.getByTestId('empty-state')).toBeTruthy();
  });

  test('shows no-match message when searching with no results', () => {
    render(<ChatSidebar {...defaultProps({ filteredConversations: [], searchTerm: 'xyz' })} />);
    expect(screen.getByText('No conversations match your search')).toBeTruthy();
  });
});
