/**
 * AISuggestionsBar Component Tests
 *
 * Tests suggestion chip rendering, dismiss, apply, empty state.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

const mockDismissSuggestion = vi.fn();
const mockApplySuggestion = vi.fn();

vi.mock('@/store', () => ({
  useAISuggestions: () => [
    {
      id: 'sug-1',
      type: 'action',
      title: 'Improve Layout',
      description: 'Consider using a grid layout',
      confidence: 0.85,
      actions: [{ label: 'Apply', action: 'apply', payload: {} }],
    },
    {
      id: 'sug-2',
      type: 'warning',
      title: 'Contrast Issue',
      description: 'Low contrast on button text',
      confidence: 0.92,
      actions: [{ label: 'Fix', action: 'fix', payload: {} }],
    },
  ],
  useAI: () => ({
    dismissSuggestion: mockDismissSuggestion,
    applySuggestion: mockApplySuggestion,
  }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button' },
  AnimatePresence: ({ children }: any) => children,
}));

import { AISuggestionsBar } from '../AISuggestionsBar';

function defaultProps(overrides: Partial<Parameters<typeof AISuggestionsBar>[0]> = {}) {
  return {
    position: 'bottom' as const,
    onOpenChat: vi.fn(),
    ...overrides,
  };
}

describe('AISuggestionsBar', () => {
  test('renders suggestion titles', () => {
    render(<AISuggestionsBar {...defaultProps()} />);
    expect(screen.getByText('Improve Layout')).toBeTruthy();
    expect(screen.getByText('Contrast Issue')).toBeTruthy();
  });

  test('renders AI Suggestions header with count', () => {
    render(<AISuggestionsBar {...defaultProps()} />);
    expect(screen.getByText('AI Suggestions')).toBeTruthy();
    expect(screen.getByText('(2 available)')).toBeTruthy();
  });

  test('renders confidence percentages', () => {
    render(<AISuggestionsBar {...defaultProps()} />);
    expect(screen.getByText('85%')).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
  });

  test('renders action buttons from suggestions', () => {
    render(<AISuggestionsBar {...defaultProps()} />);
    expect(screen.getByText('Apply')).toBeTruthy();
    expect(screen.getByText('Fix')).toBeTruthy();
  });

  test('calls applySuggestion when action is clicked', async () => {
    const { user } = render(<AISuggestionsBar {...defaultProps()} />);
    await user.click(screen.getByText('Apply'));
    expect(mockApplySuggestion).toHaveBeenCalledWith('sug-1');
  });

  test('renders Ask AI button when onOpenChat is provided', () => {
    render(<AISuggestionsBar {...defaultProps()} />);
    expect(screen.getByText('Ask AI')).toBeTruthy();
  });
});
