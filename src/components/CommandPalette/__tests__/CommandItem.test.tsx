/**
 * CommandItem Component Tests
 *
 * Tests: renders label/icon/shortcut, highlights when active, fires onClick.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { CommandItem } from '../CommandItem';
import type { Command } from '../command-types';
import { FileText } from 'lucide-react';

function makeCommand(overrides: Partial<Command> = {}): Command {
  return {
    id: 'test-cmd',
    label: 'Test Command',
    action: vi.fn(),
    ...overrides,
  };
}

describe('CommandItem', () => {
  test('renders command label', () => {
    render(
      <CommandItem
        command={makeCommand()}
        isSelected={false}
        onExecute={vi.fn()}
        onHover={vi.fn()}
      />
    );

    expect(screen.getByText('Test Command')).toBeTruthy();
  });

  test('renders description when provided', () => {
    render(
      <CommandItem
        command={makeCommand({ description: 'A helpful description' })}
        isSelected={false}
        onExecute={vi.fn()}
        onHover={vi.fn()}
      />
    );

    expect(screen.getByText('A helpful description')).toBeTruthy();
  });

  test('renders keyboard shortcut keys', () => {
    render(
      <CommandItem
        command={makeCommand({ shortcut: ['Ctrl', 'K'] })}
        isSelected={false}
        onExecute={vi.fn()}
        onHover={vi.fn()}
      />
    );

    expect(screen.getByText('Ctrl')).toBeTruthy();
    expect(screen.getByText('K')).toBeTruthy();
  });

  test('renders icon when provided', () => {
    render(
      <CommandItem
        command={makeCommand({ icon: FileText })}
        isSelected={false}
        onExecute={vi.fn()}
        onHover={vi.fn()}
      />
    );

    // Lucide icons render as SVG
    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  test('applies selected styling when isSelected is true', () => {
    const { container } = render(
      <CommandItem
        command={makeCommand()}
        isSelected={true}
        onExecute={vi.fn()}
        onHover={vi.fn()}
      />
    );

    const button = container.querySelector('button');
    expect(button?.className).toContain('bg-primary-50');
  });

  test('calls onExecute with command when clicked', async () => {
    const onExecute = vi.fn();
    const command = makeCommand();
    const { user } = render(
      <CommandItem
        command={command}
        isSelected={false}
        onExecute={onExecute}
        onHover={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button'));
    expect(onExecute).toHaveBeenCalledWith(command);
  });

  test('calls onHover when mouse enters', async () => {
    const onHover = vi.fn();
    const { user } = render(
      <CommandItem
        command={makeCommand()}
        isSelected={false}
        onExecute={vi.fn()}
        onHover={onHover}
      />
    );

    await user.hover(screen.getByRole('button'));
    expect(onHover).toHaveBeenCalled();
  });
});
