/**
 * ViewToggle Component Tests
 *
 * Tests 2D/3D/Split toggle, active state, change event.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { ViewToggle } from '../ViewToggle';

function defaultProps(overrides: Partial<Parameters<typeof ViewToggle>[0]> = {}) {
  return {
    mode: '2d' as const,
    onChange: vi.fn(),
    ...overrides,
  };
}

describe('ViewToggle', () => {
  test('renders all three mode buttons', () => {
    render(<ViewToggle {...defaultProps()} />);
    expect(screen.getByLabelText('2D View')).toBeTruthy();
    expect(screen.getByLabelText('3D View')).toBeTruthy();
    expect(screen.getByLabelText('Split View')).toBeTruthy();
  });

  test('marks current mode as pressed', () => {
    render(<ViewToggle {...defaultProps({ mode: '3d' })} />);
    expect(screen.getByLabelText('3D View').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('2D View').getAttribute('aria-pressed')).toBe('false');
  });

  test('calls onChange with new mode when button is clicked', async () => {
    const onChange = vi.fn();
    const { user } = render(<ViewToggle {...defaultProps({ onChange })} />);
    await user.click(screen.getByLabelText('3D View'));
    expect(onChange).toHaveBeenCalledWith('3d');
  });

  test('calls onChange with split when split button is clicked', async () => {
    const onChange = vi.fn();
    const { user } = render(<ViewToggle {...defaultProps({ onChange })} />);
    await user.click(screen.getByLabelText('Split View'));
    expect(onChange).toHaveBeenCalledWith('split');
  });
});
