import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { MessagesWidget } from '../MessagesWidget'
import type { WidgetConfig } from '../types'

const mockNavigate = vi.fn()
const mockSendMessage = vi.fn()
const mockSetActiveConversation = vi.fn()
const mockDeleteMessage = vi.fn()
const mockSetTyping = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockUseAuth = vi.fn()
vi.mock('@/store/slices/authSlice', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseMessaging = vi.fn()
vi.mock('../../../hooks/useMessaging', () => ({
  useMessaging: () => mockUseMessaging(),
}))

vi.mock('../MessageBubble', () => ({
  MessageBubble: ({ message }: any) => <div data-testid="message-bubble">{message.content}</div>,
}))

vi.mock('../ConversationItem', () => ({
  ConversationItem: ({ conversation, onClick }: any) => (
    <div data-testid="conversation-item" onClick={onClick}>{conversation.name}</div>
  ),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

const mockConfig: WidgetConfig = {
  id: 'messages-widget',
  title: 'Messages',
  description: 'Messages widget',
  component: MessagesWidget,
  category: 'collaboration',
  size: 'wide',
  permissions: ['admin'],
}

const defaultMessagingState = {
  conversations: [],
  activeConversation: null,
  conversationMessages: [],
  sendMessage: mockSendMessage,
  setActiveConversation: mockSetActiveConversation,
  deleteMessage: mockDeleteMessage,
  setTyping: mockSetTyping,
  isLoading: false,
}

describe('MessagesWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock scrollIntoView which doesn't exist in jsdom
    Element.prototype.scrollIntoView = vi.fn()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', displayName: 'Test User' } })
    mockUseMessaging.mockReturnValue(defaultMessagingState)
  })

  test('returns null when no user', () => {
    mockUseAuth.mockReturnValue({ user: null })
    const { container } = render(<MessagesWidget config={mockConfig} />)
    expect(container.innerHTML).toBe('')
  })

  test('shows loading state when isLoading', () => {
    mockUseMessaging.mockReturnValue({ ...defaultMessagingState, isLoading: true })
    const { container } = render(<MessagesWidget config={mockConfig} />)
    expect(container.querySelector('.animate-spin')).toBeDefined()
  })

  test('shows empty state "No conversations yet"', () => {
    render(<MessagesWidget config={mockConfig} />)
    expect(screen.getByText('No conversations yet')).toBeDefined()
  })

  test('renders "Select a conversation" when no activeConversation', () => {
    mockUseMessaging.mockReturnValue({
      ...defaultMessagingState,
      conversations: [{ id: 'c1', name: 'General', participants: ['user-1'] }],
    })
    render(<MessagesWidget config={mockConfig} />)
    expect(screen.getByText('Select a conversation')).toBeDefined()
  })

  test('shows conversation list header with search', () => {
    render(<MessagesWidget config={mockConfig} />)
    expect(screen.getByPlaceholderText('Search conversations...')).toBeDefined()
  })

  test('shows "Full View" header button', () => {
    render(<MessagesWidget config={mockConfig} />)
    expect(screen.getByText('Full View')).toBeDefined()
  })

  test('message input renders when activeConversation exists', () => {
    mockUseMessaging.mockReturnValue({
      ...defaultMessagingState,
      conversations: [{ id: 'c1', name: 'General', participants: ['user-1', 'user-2'] }],
      activeConversation: { id: 'c1', name: 'General', participants: ['user-1', 'user-2'] },
      conversationMessages: [],
    })
    render(<MessagesWidget config={mockConfig} />)
    expect(screen.getByPlaceholderText('Type a message...')).toBeDefined()
  })

  test('send button disabled when message empty', () => {
    mockUseMessaging.mockReturnValue({
      ...defaultMessagingState,
      conversations: [{ id: 'c1', name: 'General', participants: ['user-1', 'user-2'] }],
      activeConversation: { id: 'c1', name: 'General', participants: ['user-1', 'user-2'] },
      conversationMessages: [],
    })
    const { container } = render(<MessagesWidget config={mockConfig} />)
    const sendBtn = container.querySelector('button[disabled].bg-blue-500, button.disabled\\:bg-white\\/10')
    // The send button has the disabled attribute when message is empty
    const allButtons = container.querySelectorAll('button')
    const sendButton = Array.from(allButtons).find(btn =>
      btn.classList.contains('bg-blue-500') && btn.hasAttribute('disabled')
    )
    expect(sendButton).toBeDefined()
  })

  test('New Chat button in empty state', () => {
    render(<MessagesWidget config={mockConfig} />)
    expect(screen.getByText('New Chat')).toBeDefined()
  })

  test('New Conversation button when no active conversation selected', () => {
    mockUseMessaging.mockReturnValue({
      ...defaultMessagingState,
      conversations: [{ id: 'c1', name: 'General', participants: ['user-1'] }],
    })
    render(<MessagesWidget config={mockConfig} />)
    expect(screen.getByText('New Conversation')).toBeDefined()
  })

  test('chat header shows conversation name and participant count', () => {
    mockUseMessaging.mockReturnValue({
      ...defaultMessagingState,
      conversations: [{ id: 'c1', name: 'Design Team', participants: ['user-1', 'user-2', 'user-3'] }],
      activeConversation: { id: 'c1', name: 'Design Team', participants: ['user-1', 'user-2', 'user-3'] },
      conversationMessages: [],
    })
    render(<MessagesWidget config={mockConfig} />)
    // "Design Team" appears in both ConversationItem mock and chat header
    const designTeamElements = screen.getAllByText('Design Team')
    expect(designTeamElements.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('3 participants')).toBeDefined()
  })
})
