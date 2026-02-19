/**
 * MessagesNew Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  })),
}));

vi.mock('@/hooks/useMessagesPageState', () => ({
  useMessagesPageState: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    logout: vi.fn(),
    conversations: [],
    filteredConversations: [],
    selectedConversation: null,
    selectedConversationId: null,
    isLoadingConversations: false,
    searchTerm: '',
    setSearchTerm: vi.fn(),
    filter: 'all',
    setFilter: vi.fn(),
    handleConversationClick: vi.fn(),
    setShowNewConversation: vi.fn(),
    showMobileChat: false,
    setShowMobileChat: vi.fn(),
    onlineCount: 0,
    unreadCount: 0,
    showNewConversation: false,
    selectedUsers: [],
    toggleUserSelection: vi.fn(),
    userSearchTerm: '',
    setUserSearchTerm: vi.fn(),
    newConversationName: '',
    setNewConversationName: vi.fn(),
    availableUsers: [],
    loadingUsers: false,
    handleCreateConversation: vi.fn(),
    resetNewConversationDialog: vi.fn(),
    isForwardModalOpen: false,
    setIsForwardModalOpen: vi.fn(),
    forwardSourceMessage: null,
    forwardTargetConversationId: null,
    setForwardTargetConversationId: vi.fn(),
    handleCancelForward: vi.fn(),
    handleConfirmForward: vi.fn(),
    conversationError: null,
    setConversationError: vi.fn(),
    isRetrying: false,
    loadConversations: vi.fn(),
    realtime: { isConnected: true, typingUsers: [], pinnedMessageIds: new Set() },
    messages: [],
    messageById: new Map(),
    pinnedMessages: [],
    showPinnedMessages: false,
    setShowPinnedMessages: vi.fn(),
    showMessageSearch: false,
    setShowMessageSearch: vi.fn(),
    isSummaryPanelOpen: false,
    setIsSummaryPanelOpen: vi.fn(),
    showThreadHint: false,
    dismissThreadHint: vi.fn(),
    highlightedMessageId: null,
    threadHighlightId: null,
    editingMessageId: null,
    editingDraft: '',
    setEditingDraft: vi.fn(),
    handleReply: vi.fn(),
    handleStartEdit: vi.fn(),
    handleDeleteMessage: vi.fn(),
    handlePinMessage: vi.fn(),
    handleCopyMessage: vi.fn(),
    handleJumpToMessage: vi.fn(),
    handleStartForward: vi.fn(),
    handleReact: vi.fn(),
    handleOpenThread: vi.fn(),
    handleSubmitEdit: vi.fn(),
    handleCancelEdit: vi.fn(),
    handleSearchResultClick: vi.fn(),
    newMessage: '',
    handleInputChange: vi.fn(),
    handleSendMessage: vi.fn(),
    handleAttach: vi.fn(),
    handleFileDrop: vi.fn(),
    replyTo: undefined,
    setReplyTo: vi.fn(),
    isSending: false,
    pendingAttachments: [],
    handleRemoveAttachment: vi.fn(),
    handleFileSelect: vi.fn(),
    fileInputRef: { current: null },
    messageListRef: { current: null },
    composerRef: { current: null },
    isThreadPanelOpen: false,
    activeThreadRootId: null,
    threadMessages: [],
    isLoadingThread: false,
    handleCloseThread: vi.fn(),
    handleThreadReply: vi.fn(),
  })),
}));

// Mock DashboardLayout
vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

// Mock messaging components
vi.mock('@/components/messaging', () => ({
  MessageComposer: () => <div data-testid="message-composer" />,
  EmptyMessagesState: ({ onStartConversation }: any) => (
    <div data-testid="empty-messages">
      <button onClick={onStartConversation}>Start a conversation</button>
    </div>
  ),
  PinnedMessagesPanel: () => <div data-testid="pinned-messages" />,
  NewConversationDialog: ({ open }: any) => open ? <div data-testid="new-conversation-dialog" /> : null,
  ForwardMessageDialog: ({ open }: any) => open ? <div data-testid="forward-dialog" /> : null,
  ChatSidebar: () => <div data-testid="chat-sidebar" />,
  ChatHeader: () => <div data-testid="chat-header" />,
  MessageListView: React.forwardRef(() => <div data-testid="message-list" />),
}));

vi.mock('@/components/messaging/MessageSearchPanel', () => ({
  MessageSearchPanel: () => <div data-testid="message-search" />,
}));

vi.mock('@/components/messaging/ThreadPanel', () => ({
  ThreadPanel: () => <div data-testid="thread-panel" />,
}));

vi.mock('@/components/messaging/ConversationSummary', () => ({
  ConversationSummary: () => <div data-testid="conversation-summary" />,
}));

import React from 'react';
import { MessagesNew } from '../MessagesNew';

describe('MessagesNew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderMessagesNew = () => {
    return render(
      <MemoryRouter>
        <MessagesNew />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderMessagesNew();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('renders chat sidebar', () => {
    renderMessagesNew();
    expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument();
  });

  test('displays empty state when no conversation is selected', () => {
    renderMessagesNew();
    expect(screen.getByTestId('empty-messages')).toBeInTheDocument();
  });

  test('displays start conversation button in empty state', () => {
    renderMessagesNew();
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
  });

  test('returns null when user is not authenticated', async () => {
    const { useMessagesPageState } = await import('@/hooks/useMessagesPageState');
    vi.mocked(useMessagesPageState).mockReturnValue({
      user: null,
    } as any);

    const { container } = renderMessagesNew();
    expect(container.innerHTML).toBe('');
  });
});
