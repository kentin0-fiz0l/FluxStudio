import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { FileToolbar } from '../FileToolbar';

describe('FileToolbar', () => {
  test('renders title and action buttons', () => {
    render(<FileToolbar loading={false} onRefresh={vi.fn()} onUpload={vi.fn()} />);
    expect(screen.getByText('Files')).toBeDefined();
    expect(screen.getByText('Refresh')).toBeDefined();
    expect(screen.getByText('Upload Files')).toBeDefined();
  });

  test('calls onUpload when upload button clicked', async () => {
    const onUpload = vi.fn();
    const { userEvent } = await import('@/test/utils');
    const user = userEvent.setup();
    render(<FileToolbar loading={false} onRefresh={vi.fn()} onUpload={onUpload} />);
    await user.click(screen.getByText('Upload Files'));
    expect(onUpload).toHaveBeenCalledOnce();
  });

  test('disables refresh button when loading', () => {
    render(<FileToolbar loading={true} onRefresh={vi.fn()} onUpload={vi.fn()} />);
    expect(screen.getByText('Refresh').closest('button')?.disabled).toBe(true);
  });
});
