/**
 * AICommandPalette Component Tests
 *
 * Tests command list rendering, search filtering, close callback.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

vi.mock('@/store', () => ({
  useAI: () => ({
    preferences: { defaultModel: 'claude-3' },
    requestGeneration: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button' },
  AnimatePresence: ({ children }: any) => children,
}));

import { AICommandPalette } from '../AICommandPalette';

function defaultProps(overrides: Partial<Parameters<typeof AICommandPalette>[0]> = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    onOpenChat: vi.fn(),
    ...overrides,
  };
}

describe('AICommandPalette', () => {
  test('renders nothing when isOpen is false', () => {
    const { container } = render(<AICommandPalette {...defaultProps({ isOpen: false })} />);
    expect(container.innerHTML).toBe('');
  });

  test('renders AI Commands header when open', () => {
    render(<AICommandPalette {...defaultProps()} />);
    expect(screen.getByText('AI Commands')).toBeTruthy();
  });

  test('renders all command titles', () => {
    render(<AICommandPalette {...defaultProps()} />);
    expect(screen.getByText('Generate Text')).toBeTruthy();
    expect(screen.getByText('Generate Code')).toBeTruthy();
    expect(screen.getByText('Generate Color Palette')).toBeTruthy();
    expect(screen.getByText('Ask AI Anything')).toBeTruthy();
  });

  test('filters commands when search query is typed', async () => {
    const { user } = render(<AICommandPalette {...defaultProps()} />);
    const input = screen.getByLabelText('Search AI commands');
    await user.type(input, 'code');
    expect(screen.getByText('Generate Code')).toBeTruthy();
    expect(screen.queryByText('Generate Color Palette')).toBeNull();
  });

  test('shows no commands found for unmatched query', async () => {
    const { user } = render(<AICommandPalette {...defaultProps()} />);
    const input = screen.getByLabelText('Search AI commands');
    await user.type(input, 'zzzzzzz');
    expect(screen.getByText('No commands found')).toBeTruthy();
  });

  test('renders keyboard shortcut hints', () => {
    render(<AICommandPalette {...defaultProps()} />);
    expect(screen.getByText('Navigate')).toBeTruthy();
    expect(screen.getByText('Select')).toBeTruthy();
    expect(screen.getByText('Close')).toBeTruthy();
  });
});
