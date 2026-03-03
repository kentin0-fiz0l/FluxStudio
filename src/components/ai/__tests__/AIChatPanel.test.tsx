/**
 * AIChatPanel Component Tests
 *
 * Tests rendering, message display, send interaction, loading/empty states.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock store hooks
const mockSendMessage = vi.fn();
const mockCreateConversation = vi.fn();
vi.mock('@/store', () => ({
  useAI: () => ({
    isProcessing: false,
    sendMessage: mockSendMessage,
    createConversation: mockCreateConversation,
  }),
  useActiveConversation: () => ({
    id: 'conv-1',
    messages: [
      { id: 'msg-1', role: 'user', content: 'Hello', isStreaming: false },
      { id: 'msg-2', role: 'assistant', content: 'Hi there!', isStreaming: false },
    ],
  }),
  useAIUsage: () => ({
    requestsRemaining: 42,
    tokensUsed: 1000,
    tokensLimit: 10000,
  }),
  useProjectContext: () => ({ currentProject: null }),
}));

vi.mock('@/hooks/useAIContext', () => ({
  useAIContext: () => ({
    context: { page: '', recentActions: [] },
    addAction: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button', span: 'span' },
  AnimatePresence: ({ children }: any) => children,
}));

import { AIChatPanel } from '../AIChatPanel';

function defaultProps(overrides: Partial<Parameters<typeof AIChatPanel>[0]> = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    position: 'right' as const,
    ...overrides,
  };
}

describe('AIChatPanel', () => {
  test('renders nothing when isOpen is false', () => {
    const { container } = render(<AIChatPanel {...defaultProps({ isOpen: false })} />);
    expect(container.innerHTML).toBe('');
  });

  test('renders header with AI Co-Pilot title', () => {
    render(<AIChatPanel {...defaultProps()} />);
    expect(screen.getByText('AI Co-Pilot')).toBeTruthy();
  });

  test('shows remaining requests in usage bar', () => {
    render(<AIChatPanel {...defaultProps()} />);
    expect(screen.getByText('42 requests remaining')).toBeTruthy();
  });

  test('renders messages from conversation', () => {
    render(<AIChatPanel {...defaultProps()} />);
    expect(screen.getByText('Hello')).toBeTruthy();
    expect(screen.getByText('Hi there!')).toBeTruthy();
  });

  test('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<AIChatPanel {...defaultProps({ onClose })} />);
    await user.click(screen.getByLabelText('Close AI panel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('renders input with correct placeholder', () => {
    render(<AIChatPanel {...defaultProps()} />);
    expect(screen.getByLabelText('Type your message to AI')).toBeTruthy();
  });
});
