/**
 * ExportDialog Component Tests
 *
 * Tests open/close, format selection, options display, export callback.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback: string) => fallback || key }),
}));

import { ExportDialog } from '../ExportDialog';

function defaultProps(overrides: Partial<Parameters<typeof ExportDialog>[0]> = {}) {
  return {
    isOpen: true,
    formationName: 'My Show',
    onClose: vi.fn(),
    onExport: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('ExportDialog', () => {
  test('renders nothing when isOpen is false', () => {
    const { container } = render(<ExportDialog {...defaultProps({ isOpen: false })} />);
    expect(container.innerHTML).toBe('');
  });

  test('renders dialog with title', () => {
    render(<ExportDialog {...defaultProps()} />);
    expect(screen.getByText('Export Formation')).toBeTruthy();
  });

  test('shows formation name', () => {
    render(<ExportDialog {...defaultProps()} />);
    expect(screen.getByText('My Show')).toBeTruthy();
  });

  test('renders all format options', () => {
    render(<ExportDialog {...defaultProps()} />);
    expect(screen.getByText('PDF Document')).toBeTruthy();
    expect(screen.getByText('PNG Image')).toBeTruthy();
    expect(screen.getByText('JPEG Image')).toBeTruthy();
    expect(screen.getByText('SVG Vector')).toBeTruthy();
    expect(screen.getByText('Animated GIF')).toBeTruthy();
    expect(screen.getByText('Video')).toBeTruthy();
  });

  test('selects format when clicked', async () => {
    const { user } = render(<ExportDialog {...defaultProps()} />);
    await user.click(screen.getByText('PNG Image'));
    const pngRadio = screen.getByText('PNG Image').closest('button');
    expect(pngRadio?.getAttribute('aria-checked')).toBe('true');
  });

  test('calls onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<ExportDialog {...defaultProps({ onClose })} />);
    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close X button is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<ExportDialog {...defaultProps({ onClose })} />);
    await user.click(screen.getByLabelText('Close export dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('renders export button', () => {
    render(<ExportDialog {...defaultProps()} />);
    expect(screen.getByText('Export')).toBeTruthy();
  });
});
