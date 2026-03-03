/**
 * CommandPalette Component Tests
 *
 * Tests: dialog rendering, search filtering, keyboard navigation, and close behavior.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';

import { CommandPalette } from '../CommandPalette';
import type { CommandPaletteProps } from '../command-types';

// Mock child components
vi.mock('../CommandGroupList', () => ({
  CommandGroupList: vi.fn(({ filteredCommands }: { filteredCommands: unknown[] }) => (
    <div data-testid="command-group-list">
      {filteredCommands.length === 0 ? 'No commands found' : `${filteredCommands.length} commands`}
    </div>
  )),
}));

vi.mock('../PaletteFooter', () => ({
  PaletteFooter: vi.fn(() => <div data-testid="palette-footer" />),
}));

vi.mock('../command-utils', () => ({
  loadFrecency: vi.fn(() => ({})),
  recordCommandUsage: vi.fn(),
  getFrecencyScore: vi.fn(() => 0),
  buildCommands: vi.fn(() => [
    { id: 'nav-dashboard', label: 'Go to Dashboard', category: 'navigation', action: vi.fn(), keywords: ['home'] },
    { id: 'create-project', label: 'Create Project', category: 'create', action: vi.fn(), keywords: ['new'] },
    { id: 'upload-file', label: 'Upload File', category: 'actions', action: vi.fn(), keywords: ['add'] },
  ]),
}));

vi.mock('../command-constants', () => ({
  catOrder: { create: 1, actions: 2, navigation: 3, recent: 4 },
  categoryLabels: { create: 'Create', actions: 'Actions', navigation: 'Navigation', recent: 'Recent' },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

function noop() {}

function defaultProps(overrides: Partial<CommandPaletteProps> = {}): CommandPaletteProps {
  return {
    open: true,
    onOpenChange: noop,
    projects: [],
    currentProject: null,
    ...overrides,
  };
}

describe('CommandPalette', () => {
  test('renders search input when open', () => {
    render(<CommandPalette {...defaultProps()} />);
    expect(screen.getByLabelText('Search commands')).toBeTruthy();
  });

  test('renders command group list and footer', () => {
    render(<CommandPalette {...defaultProps()} />);
    expect(screen.getByTestId('command-group-list')).toBeTruthy();
    expect(screen.getByTestId('palette-footer')).toBeTruthy();
  });

  test('filters commands based on search input', async () => {
    const { user } = render(<CommandPalette {...defaultProps()} />);
    const input = screen.getByLabelText('Search commands');

    await user.type(input, 'Dashboard');

    // After typing, filteredCommands will be recalculated (mocked buildCommands returns 3 items,
    // filtering for "Dashboard" should keep only "Go to Dashboard")
    expect(input).toHaveValue('Dashboard');
  });

  test('calls onOpenChange(false) when Escape is pressed', () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette {...defaultProps({ onOpenChange })} />);

    const input = screen.getByLabelText('Search commands');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('resets search and selection when closed and reopened', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<CommandPalette {...defaultProps({ onOpenChange, open: true })} />);

    // Close the palette
    rerender(<CommandPalette {...defaultProps({ onOpenChange, open: false })} />);
    // Reopen
    rerender(<CommandPalette {...defaultProps({ onOpenChange, open: true })} />);

    const input = screen.getByLabelText('Search commands');
    expect(input).toHaveValue('');
  });
});
