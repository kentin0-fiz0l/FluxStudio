/**
 * CommandGroupList Component Tests
 *
 * Tests: renders groups, items within groups, and empty state.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { CommandGroupList } from '../CommandGroupList';
import type { Command } from '../command-types';

vi.mock('../CommandItem', () => ({
  CommandItem: vi.fn(({ command }: { command: Command }) => (
    <div data-testid={`command-item-${command.id}`}>{command.label}</div>
  )),
}));

vi.mock('../command-constants', () => ({
  categoryLabels: {
    create: 'Create',
    actions: 'Actions',
    navigation: 'Navigation',
    recent: 'Recent',
  },
}));

const makeCommand = (id: string, label: string): Command => ({
  id,
  label,
  action: vi.fn(),
});

describe('CommandGroupList', () => {
  test('renders empty state when no commands are filtered', () => {
    render(
      <CommandGroupList
        groupedCommands={{ create: [], actions: [], navigation: [], recent: [] }}
        filteredCommands={[]}
        selectedIndex={0}
        onExecute={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('No commands found')).toBeTruthy();
  });

  test('renders category headers for non-empty groups', () => {
    const cmd1 = makeCommand('c1', 'New Project');
    const cmd2 = makeCommand('c2', 'Go to Dashboard');

    render(
      <CommandGroupList
        groupedCommands={{
          create: [cmd1],
          actions: [],
          navigation: [cmd2],
          recent: [],
        }}
        filteredCommands={[cmd1, cmd2]}
        selectedIndex={0}
        onExecute={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Create')).toBeTruthy();
    expect(screen.getByText('Navigation')).toBeTruthy();
    // Actions group is empty so should not render
    expect(screen.queryByText('Actions')).toBeNull();
  });

  test('renders command items within each group', () => {
    const cmd1 = makeCommand('c1', 'New Project');
    const cmd2 = makeCommand('c2', 'Upload File');

    render(
      <CommandGroupList
        groupedCommands={{
          create: [cmd1, cmd2],
          actions: [],
          navigation: [],
          recent: [],
        }}
        filteredCommands={[cmd1, cmd2]}
        selectedIndex={0}
        onExecute={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByTestId('command-item-c1')).toBeTruthy();
    expect(screen.getByTestId('command-item-c2')).toBeTruthy();
    expect(screen.getByText('New Project')).toBeTruthy();
    expect(screen.getByText('Upload File')).toBeTruthy();
  });

  test('does not render hidden groups with zero items', () => {
    const cmd1 = makeCommand('c1', 'Search');
    render(
      <CommandGroupList
        groupedCommands={{
          create: [],
          actions: [cmd1],
          navigation: [],
          recent: [],
        }}
        filteredCommands={[cmd1]}
        selectedIndex={0}
        onExecute={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    // Only "Actions" should appear
    expect(screen.queryByText('Create')).toBeNull();
    expect(screen.queryByText('Navigation')).toBeNull();
    expect(screen.queryByText('Recent')).toBeNull();
    expect(screen.getByText('Actions')).toBeTruthy();
  });
});
