/**
 * EditConflictDialog Component Tests
 *
 * Tests conflict header, local/server versions, resolve buttons, dismiss.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { EditConflictDialog } from '../EditConflictDialog';

const mockConflict = {
  id: 'conflict-1',
  entityType: 'document',
  entityId: 'doc-1',
  localData: { text: 'My local version' },
  serverData: { text: 'Server version' },
  localTimestamp: new Date().toISOString(),
  serverTimestamp: new Date().toISOString(),
  serverUser: 'Bob',
};

function defaultProps(overrides: Partial<Parameters<typeof EditConflictDialog>[0]> = {}) {
  return {
    conflict: mockConflict,
    onResolve: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };
}

describe('EditConflictDialog', () => {
  test('renders Edit Conflict heading', () => {
    render(<EditConflictDialog {...defaultProps()} />);
    expect(screen.getByText('Edit Conflict')).toBeTruthy();
  });

  test('shows server user name in description', () => {
    render(<EditConflictDialog {...defaultProps()} />);
    expect(screen.getByText('Bob also edited this document')).toBeTruthy();
  });

  test('shows Your Changes and server changes labels', () => {
    render(<EditConflictDialog {...defaultProps()} />);
    expect(screen.getByText('Your Changes')).toBeTruthy();
    expect(screen.getByText("Bob's Changes")).toBeTruthy();
  });

  test('renders all three resolution buttons', () => {
    render(<EditConflictDialog {...defaultProps()} />);
    expect(screen.getByText('Keep My Changes')).toBeTruthy();
    expect(screen.getByText('Accept Their Changes')).toBeTruthy();
    expect(screen.getByText('Merge Both')).toBeTruthy();
  });

  test('calls onResolve with local when Keep My Changes is clicked', async () => {
    const onResolve = vi.fn();
    const { user } = render(<EditConflictDialog {...defaultProps({ onResolve })} />);
    await user.click(screen.getByText('Keep My Changes'));
    expect(onResolve).toHaveBeenCalledWith('local');
  });

  test('calls onResolve with server when Accept Their Changes is clicked', async () => {
    const onResolve = vi.fn();
    const { user } = render(<EditConflictDialog {...defaultProps({ onResolve })} />);
    await user.click(screen.getByText('Accept Their Changes'));
    expect(onResolve).toHaveBeenCalledWith('server');
  });

  test('calls onResolve with merge when Merge Both is clicked', async () => {
    const onResolve = vi.fn();
    const { user } = render(<EditConflictDialog {...defaultProps({ onResolve })} />);
    await user.click(screen.getByText('Merge Both'));
    expect(onResolve).toHaveBeenCalledWith('merge');
  });

  test('shows fallback text when no serverUser', () => {
    const conflict = { ...mockConflict, serverUser: undefined };
    render(<EditConflictDialog {...defaultProps({ conflict })} />);
    expect(screen.getByText('This document was edited elsewhere')).toBeTruthy();
    expect(screen.getByText('Server Version')).toBeTruthy();
  });
});
