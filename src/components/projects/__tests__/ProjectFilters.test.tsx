import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { ProjectFilters } from '../ProjectFilters';

const defaultProps = {
  statusOptions: [
    { value: 'all', label: 'All Projects', count: 5 },
    { value: 'active', label: 'Active', count: 3 },
  ],
  statusFilter: 'all',
  onStatusFilterChange: vi.fn(),
  viewMode: 'grid' as const,
  onViewModeChange: vi.fn(),
  selectionMode: false,
  onToggleSelectionMode: vi.fn(),
  filteredCount: 5,
  selectedCount: 0,
  onSelectAll: vi.fn(),
  onDeselectAll: vi.fn(),
};

describe('ProjectFilters', () => {
  test('renders status filter buttons', () => {
    render(<ProjectFilters {...defaultProps} />);
    expect(screen.getByText('All Projects')).toBeDefined();
    expect(screen.getByText('Active')).toBeDefined();
  });

  test('calls onStatusFilterChange when status button clicked', async () => {
    const onStatusFilterChange = vi.fn();
    const { userEvent } = await import('@/test/utils');
    const user = userEvent.setup();
    render(<ProjectFilters {...defaultProps} onStatusFilterChange={onStatusFilterChange} />);
    await user.click(screen.getByText('Active'));
    expect(onStatusFilterChange).toHaveBeenCalledWith('active');
  });

  test('renders view mode toggle', () => {
    render(<ProjectFilters {...defaultProps} />);
    expect(screen.getByLabelText('Grid view')).toBeDefined();
    expect(screen.getByLabelText('List view')).toBeDefined();
  });

  test('renders select/cancel button based on selectionMode', () => {
    const { rerender } = render(<ProjectFilters {...defaultProps} selectionMode={false} />);
    expect(screen.getByText('Select')).toBeDefined();
    rerender(<ProjectFilters {...defaultProps} selectionMode={true} />);
    expect(screen.getByText('Cancel')).toBeDefined();
  });
});
