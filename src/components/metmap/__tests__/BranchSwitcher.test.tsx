import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';
import { BranchSwitcher } from '../BranchSwitcher';
import type { MetMapBranch } from '../../../hooks/metmap/useMetMapBranches';
import type { MetMapSnapshot } from '../../../hooks/collaboration/useMetMapSnapshots';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));

vi.mock('lucide-react', () => ({
  GitBranch: (props: Record<string, unknown>) => <svg data-testid="git-branch-icon" {...props} />,
  Plus: (props: Record<string, unknown>) => <svg data-testid="plus-icon" {...props} />,
  Merge: (props: Record<string, unknown>) => <svg data-testid="merge-icon" {...props} />,
  Trash2: (props: Record<string, unknown>) => <svg data-testid="trash-icon" {...props} />,
  ChevronDown: (props: Record<string, unknown>) => <svg data-testid="chevron-icon" {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg data-testid="loader-icon" {...props} />,
}));

function makeBranch(overrides: Partial<MetMapBranch> = {}): MetMapBranch {
  return {
    id: 'branch-1',
    songId: 'song-1',
    userId: 'user-1',
    name: 'feature-branch',
    description: null,
    sourceSnapshotId: null,
    sourceSnapshotName: null,
    isMain: false,
    mergedAt: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

const defaultProps = {
  branches: [
    makeBranch({ id: 'b1', name: 'feature-A', userId: 'user-1' }),
    makeBranch({ id: 'b2', name: 'feature-B', userId: 'user-2' }),
  ],
  snapshots: [] as MetMapSnapshot[],
  activeBranchId: null as string | null,
  currentUserId: 'user-1',
  onSwitchBranch: vi.fn(),
  onCreateBranch: vi.fn().mockResolvedValue(undefined),
  onDeleteBranch: vi.fn().mockResolvedValue(undefined),
  onMergeBranch: vi.fn().mockResolvedValue(undefined),
  isCreating: false,
  isMerging: false,
};

describe('BranchSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows current branch name in trigger button', () => {
    render(<BranchSwitcher {...defaultProps} />);
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('shows active branch name in trigger when a branch is active', () => {
    render(<BranchSwitcher {...defaultProps} activeBranchId="b1" />);
    expect(screen.getByText('feature-A')).toBeInTheDocument();
  });

  it('opens dropdown on trigger click', async () => {
    const { user } = render(<BranchSwitcher {...defaultProps} />);
    await user.click(screen.getByLabelText('Branch: main'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Branches')).toBeInTheDocument();
  });

  it('lists main + feature branches', async () => {
    const { user } = render(<BranchSwitcher {...defaultProps} />);
    await user.click(screen.getByLabelText('Branch: main'));
    // main is always shown
    expect(screen.getAllByText('main').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('feature-A')).toBeInTheDocument();
    expect(screen.getByText('feature-B')).toBeInTheDocument();
  });

  it('highlights active branch with (current) label', async () => {
    const { user } = render(<BranchSwitcher {...defaultProps} activeBranchId="b1" />);
    await user.click(screen.getByLabelText('Branch: feature-A'));
    expect(screen.getByText('(current)')).toBeInTheDocument();
  });

  it('calls onSwitchBranch when a branch is selected', async () => {
    const onSwitchBranch = vi.fn();
    const { user } = render(
      <BranchSwitcher {...defaultProps} onSwitchBranch={onSwitchBranch} />
    );
    await user.click(screen.getByLabelText('Branch: main'));
    await user.click(screen.getByLabelText('Switch to branch feature-A'));
    expect(onSwitchBranch).toHaveBeenCalledWith('b1');
  });

  it('calls onSwitchBranch(null) when main is selected', async () => {
    const onSwitchBranch = vi.fn();
    const { user } = render(
      <BranchSwitcher {...defaultProps} activeBranchId="b1" onSwitchBranch={onSwitchBranch} />
    );
    await user.click(screen.getByLabelText('Branch: feature-A'));
    // Click the main branch option
    const mainOptions = screen.getAllByText('main');
    // Find the one inside the listbox
    const mainButton = mainOptions.find(el => el.closest('[role="option"]'));
    await user.click(mainButton!.closest('[role="option"]') as HTMLElement);
    expect(onSwitchBranch).toHaveBeenCalledWith(null);
  });

  it('shows New Branch button in dropdown', async () => {
    const { user } = render(<BranchSwitcher {...defaultProps} />);
    await user.click(screen.getByLabelText('Branch: main'));
    expect(screen.getByText('New Branch')).toBeInTheDocument();
  });

  it('shows create form when New Branch is clicked', async () => {
    const { user } = render(<BranchSwitcher {...defaultProps} />);
    await user.click(screen.getByLabelText('Branch: main'));
    await user.click(screen.getByText('New Branch'));
    expect(screen.getByLabelText('Branch name')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('calls onCreateBranch with name on submit', async () => {
    const onCreateBranch = vi.fn().mockResolvedValue({ id: 'new-b' });
    const { user } = render(
      <BranchSwitcher {...defaultProps} onCreateBranch={onCreateBranch} />
    );
    await user.click(screen.getByLabelText('Branch: main'));
    await user.click(screen.getByText('New Branch'));
    await user.type(screen.getByLabelText('Branch name'), 'my-branch');
    await user.click(screen.getByText('Create'));
    expect(onCreateBranch).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'my-branch' })
    );
  });

  it('shows delete button only for branches owned by current user', async () => {
    const { user } = render(<BranchSwitcher {...defaultProps} />);
    await user.click(screen.getByLabelText('Branch: main'));
    // feature-A is owned by user-1 (currentUserId), feature-B by user-2
    expect(screen.getByLabelText('Delete branch feature-A')).toBeInTheDocument();
    expect(screen.queryByLabelText('Delete branch feature-B')).not.toBeInTheDocument();
  });

  it('shows merge confirmation when merge button clicked', async () => {
    const { user } = render(<BranchSwitcher {...defaultProps} />);
    await user.click(screen.getByLabelText('Branch: main'));
    await user.click(screen.getByLabelText('Merge branch feature-A'));
    expect(screen.getByText('Merge to main?')).toBeInTheDocument();
  });

  it('calls onMergeBranch on merge confirmation', async () => {
    const onMergeBranch = vi.fn().mockResolvedValue(undefined);
    const { user } = render(
      <BranchSwitcher {...defaultProps} onMergeBranch={onMergeBranch} />
    );
    await user.click(screen.getByLabelText('Branch: main'));
    await user.click(screen.getByLabelText('Merge branch feature-A'));
    await user.click(screen.getByText('Yes'));
    expect(onMergeBranch).toHaveBeenCalledWith('b1');
  });

  it('disables create button when name is empty', async () => {
    const { user } = render(<BranchSwitcher {...defaultProps} />);
    await user.click(screen.getByLabelText('Branch: main'));
    await user.click(screen.getByText('New Branch'));
    expect(screen.getByText('Create')).toBeDisabled();
  });
});
