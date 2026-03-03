/**
 * PerformerMarker Component Tests
 *
 * Tests position rendering, label display, selected state, locked state.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback: string, opts?: any) => {
    if (opts?.user) return fallback.replace('{{user}}', opts.user);
    return fallback || key;
  }}),
}));

import { PerformerMarker } from '../PerformerMarker';

function defaultProps(overrides: Partial<Parameters<typeof PerformerMarker>[0]> = {}) {
  return {
    performer: {
      id: 'p-1',
      name: 'Alice',
      label: 'A',
      color: '#ff0000',
    },
    position: { x: 50, y: 50, rotation: 0 },
    isSelected: false,
    showLabel: true,
    ...overrides,
  };
}

describe('PerformerMarker', () => {
  test('renders performer label', () => {
    render(<PerformerMarker {...defaultProps()} />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  test('renders performer name below marker', () => {
    render(<PerformerMarker {...defaultProps()} />);
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  test('hides label when showLabel is false', () => {
    render(<PerformerMarker {...defaultProps({ showLabel: false })} />);
    expect(screen.queryByText('A')).toBeNull();
    expect(screen.queryByText('Alice')).toBeNull();
  });

  test('has correct aria-label with selection state', () => {
    render(<PerformerMarker {...defaultProps({ isSelected: true })} />);
    expect(screen.getByLabelText('Alice (selected)')).toBeTruthy();
  });

  test('has aria-pressed matching isSelected', () => {
    render(<PerformerMarker {...defaultProps({ isSelected: true })} />);
    const marker = screen.getByRole('button');
    expect(marker.getAttribute('aria-pressed')).toBe('true');
  });

  test('shows group badge when performer has a group', () => {
    render(<PerformerMarker {...defaultProps({ performer: { id: 'p-1', name: 'Alice', label: 'A', color: '#ff0000', group: 'G1' } })} />);
    expect(screen.getByText('G1')).toBeTruthy();
  });

  test('shows locked user indicator when lockedByUser is set', () => {
    render(<PerformerMarker {...defaultProps({ lockedByUser: 'Bob' })} />);
    expect(screen.getByText('Editing: Bob')).toBeTruthy();
  });
});
