/**
 * AICoPilotProvider Component Tests
 *
 * Tests context provision, children rendering, sub-component mounting.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

vi.mock('@/store', () => ({
  useAI: () => ({
    isProcessing: false,
    sendMessage: vi.fn(),
    createConversation: vi.fn(),
    preferences: { defaultModel: 'claude-3' },
    requestGeneration: vi.fn(),
    addSuggestion: vi.fn(),
  }),
  useActiveConversation: () => null,
  useAIUsage: () => ({ requestsRemaining: 10, tokensUsed: 0, tokensLimit: 10000 }),
  useProjectContext: () => ({ currentProject: null }),
  useAISuggestions: () => [],
}));

vi.mock('@/hooks/useAIContext', () => ({
  useAIContext: () => ({
    context: { page: '', recentActions: [], activeProject: null, activeEntity: null },
    addAction: vi.fn(),
    getContextSummary: () => 'test summary',
  }),
}));

vi.mock('@/hooks/useAIShortcuts', () => ({
  useAIShortcuts: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button', span: 'span' },
  AnimatePresence: ({ children }: any) => children,
}));

import { AICoPilotProvider, useAICoPilot } from '../AICoPilotProvider';

function TestConsumer() {
  const { isChatOpen, isCommandPaletteOpen } = useAICoPilot();
  return (
    <div>
      <span data-testid="chat-state">{String(isChatOpen)}</span>
      <span data-testid="palette-state">{String(isCommandPaletteOpen)}</span>
    </div>
  );
}

describe('AICoPilotProvider', () => {
  test('renders children', () => {
    render(
      <AICoPilotProvider>
        <div data-testid="child">Hello</div>
      </AICoPilotProvider>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  test('provides context with initial closed states', () => {
    render(
      <AICoPilotProvider>
        <TestConsumer />
      </AICoPilotProvider>
    );
    expect(screen.getByTestId('chat-state').textContent).toBe('false');
    expect(screen.getByTestId('palette-state').textContent).toBe('false');
  });

  test('throws error when useAICoPilot used outside provider', () => {
    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useAICoPilot must be used within AICoPilotProvider');
  });

  test('accepts showSuggestions prop', () => {
    render(
      <AICoPilotProvider showSuggestions={false}>
        <div data-testid="child">Hello</div>
      </AICoPilotProvider>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });
});
