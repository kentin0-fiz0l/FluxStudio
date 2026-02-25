import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { MobileContextMenu } from '../MobileContextMenu';

const baseProps = {
  isOpen: true,
  position: { x: 100, y: 200 },
  performer: { id: 'p-1', name: 'Alice' },
  onEdit: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
  onClose: vi.fn(),
};

describe('MobileContextMenu', () => {
  test('renders performer name and all actions when open', () => {
    render(<MobileContextMenu {...baseProps} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /duplicate/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
  });

  test('does not render when isOpen is false', () => {
    render(<MobileContextMenu {...baseProps} isOpen={false} />);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('does not render when performer is null', () => {
    render(<MobileContextMenu {...baseProps} performer={null} />);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('calls onEdit with performer id and closes on Edit click', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onClose = vi.fn();
    render(<MobileContextMenu {...baseProps} onEdit={onEdit} onClose={onClose} />);

    await user.click(screen.getByRole('menuitem', { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledWith('p-1');
    expect(onClose).toHaveBeenCalled();
  });

  test('calls onDuplicate with performer id and closes on Duplicate click', async () => {
    const user = userEvent.setup();
    const onDuplicate = vi.fn();
    const onClose = vi.fn();
    render(<MobileContextMenu {...baseProps} onDuplicate={onDuplicate} onClose={onClose} />);

    await user.click(screen.getByRole('menuitem', { name: /duplicate/i }));

    expect(onDuplicate).toHaveBeenCalledWith('p-1');
    expect(onClose).toHaveBeenCalled();
  });

  test('calls onDelete with performer id and closes on Delete click', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onClose = vi.fn();
    render(<MobileContextMenu {...baseProps} onDelete={onDelete} onClose={onClose} />);

    await user.click(screen.getByRole('menuitem', { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledWith('p-1');
    expect(onClose).toHaveBeenCalled();
  });

  test('is positioned at the given coordinates', () => {
    render(<MobileContextMenu {...baseProps} position={{ x: 150, y: 300 }} />);

    const menu = screen.getByRole('menu');
    expect(menu.style.left).toBe('150px');
    expect(menu.style.top).toBe('300px');
  });

  test('closes when clicking outside the menu', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <div>
        <div data-testid="outside">outside area</div>
        <MobileContextMenu {...baseProps} onClose={onClose} />
      </div>
    );

    // The menu uses a setTimeout(0) before registering outside-click listeners,
    // so we need to wait a tick
    await new Promise(r => setTimeout(r, 10));
    await user.click(screen.getByTestId('outside'));

    expect(onClose).toHaveBeenCalled();
  });
});
