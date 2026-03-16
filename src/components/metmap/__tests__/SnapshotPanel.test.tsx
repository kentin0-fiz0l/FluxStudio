import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';
import { SnapshotPanel } from '../SnapshotPanel';
import type { MetMapSnapshot } from '../../../hooks/collaboration/useMetMapSnapshots';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));

vi.mock('lucide-react', () => ({
  Camera: (props: Record<string, unknown>) => <svg data-testid="camera-icon" {...props} />,
  RotateCcw: (props: Record<string, unknown>) => <svg data-testid="rotate-icon" {...props} />,
  Trash2: (props: Record<string, unknown>) => <svg data-testid="trash-icon" {...props} />,
  ChevronDown: (props: Record<string, unknown>) => <svg data-testid="chevron-down" {...props} />,
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="chevron-right" {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg data-testid="loader-icon" {...props} />,
}));

function makeSnapshot(overrides: Partial<MetMapSnapshot> = {}): MetMapSnapshot {
  return {
    id: 'snap-1',
    songId: 'song-1',
    userId: 'user-1',
    name: 'Checkpoint 1',
    description: null,
    sectionCount: 4,
    totalBars: 32,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const defaultProps = {
  snapshots: [] as MetMapSnapshot[],
  isLoading: false,
  currentUserId: 'user-1',
  sectionCount: 4,
  totalBars: 32,
  onCreateSnapshot: vi.fn().mockResolvedValue(undefined),
  onDeleteSnapshot: vi.fn().mockResolvedValue(undefined),
  onRestoreSnapshot: vi.fn().mockResolvedValue(undefined),
  isCreating: false,
  isRestoring: false,
};

describe('SnapshotPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders collapsed panel with Snapshots label', () => {
    render(<SnapshotPanel {...defaultProps} />);
    expect(screen.getByText('Snapshots')).toBeInTheDocument();
  });

  it('shows snapshot count badge when snapshots exist', () => {
    render(
      <SnapshotPanel {...defaultProps} snapshots={[makeSnapshot(), makeSnapshot({ id: 'snap-2' })]} />
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('expands panel on toggle click', async () => {
    const { user } = render(<SnapshotPanel {...defaultProps} />);
    await user.click(screen.getByLabelText('Toggle snapshots panel'));
    expect(screen.getByText('Save Checkpoint')).toBeInTheDocument();
  });

  it('shows empty state when no snapshots', async () => {
    const { user } = render(<SnapshotPanel {...defaultProps} />);
    await user.click(screen.getByLabelText('Toggle snapshots panel'));
    expect(screen.getByText('No snapshots yet')).toBeInTheDocument();
  });

  it('shows loading state', async () => {
    const { user } = render(<SnapshotPanel {...defaultProps} isLoading />);
    await user.click(screen.getByLabelText('Toggle snapshots panel'));
    expect(screen.getByText('Loading snapshots...')).toBeInTheDocument();
  });

  it('renders snapshot list', async () => {
    const snapshots = [
      makeSnapshot({ id: 's1', name: 'Draft 1', sectionCount: 3, totalBars: 24 }),
      makeSnapshot({ id: 's2', name: 'Draft 2', sectionCount: 5, totalBars: 40 }),
    ];
    const { user } = render(<SnapshotPanel {...defaultProps} snapshots={snapshots} />);
    await user.click(screen.getByLabelText('Toggle snapshots panel'));
    expect(screen.getByText('Draft 1')).toBeInTheDocument();
    expect(screen.getByText('Draft 2')).toBeInTheDocument();
  });

  it('shows metadata for snapshots', async () => {
    const snapshots = [makeSnapshot({ sectionCount: 3, totalBars: 24 })];
    const { user } = render(<SnapshotPanel {...defaultProps} snapshots={snapshots} />);
    await user.click(screen.getByLabelText('Toggle snapshots panel'));
    expect(screen.getByText(/3 sections/)).toBeInTheDocument();
    expect(screen.getByText(/24 bars/)).toBeInTheDocument();
  });

  it('shows create form when Save Checkpoint is clicked', async () => {
    const { user } = render(<SnapshotPanel {...defaultProps} />);
    await user.click(screen.getByLabelText('Toggle snapshots panel'));
    await user.click(screen.getByText('Save Checkpoint'));
    expect(screen.getByPlaceholderText('Checkpoint name...')).toBeInTheDocument();
  });

  it('calls onCreateSnapshot on save', async () => {
    const onCreateSnapshot = vi.fn().mockResolvedValue(undefined);
    const { user } = render(
      <SnapshotPanel {...defaultProps} onCreateSnapshot={onCreateSnapshot} />
    );
    await user.click(screen.getByLabelText('Toggle snapshots panel'));
    await user.click(screen.getByText('Save Checkpoint'));
    await user.type(screen.getByPlaceholderText('Checkpoint name...'), 'My Checkpoint');
    await user.click(screen.getByText('Save'));
    expect(onCreateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My Checkpoint' })
    );
  });

  it('shows restore confirmation on restore click', async () => {
    const snapshots = [makeSnapshot()];
    const { user } = render(<SnapshotPanel {...defaultProps} snapshots={snapshots} />);
    await user.click(screen.getByLabelText('Toggle snapshots panel'));
    await user.click(screen.getByLabelText('Restore snapshot Checkpoint 1'));
    expect(screen.getByText('Restore this checkpoint?')).toBeInTheDocument();
  });

  it('calls onRestoreSnapshot on confirmation', async () => {
    const onRestoreSnapshot = vi.fn().mockResolvedValue(undefined);
    const snapshots = [makeSnapshot()];
    const { user } = render(
      <SnapshotPanel {...defaultProps} snapshots={snapshots} onRestoreSnapshot={onRestoreSnapshot} />
    );
    await user.click(screen.getByLabelText('Toggle snapshots panel'));
    await user.click(screen.getByLabelText('Restore snapshot Checkpoint 1'));
    await user.click(screen.getByText('Yes'));
    expect(onRestoreSnapshot).toHaveBeenCalledWith('snap-1');
  });

  it('shows delete button only for own snapshots', async () => {
    const snapshots = [
      makeSnapshot({ id: 's1', name: 'Mine', userId: 'user-1' }),
      makeSnapshot({ id: 's2', name: 'Theirs', userId: 'user-2' }),
    ];
    const { user } = render(<SnapshotPanel {...defaultProps} snapshots={snapshots} />);
    await user.click(screen.getByLabelText('Toggle snapshots panel'));
    expect(screen.getByLabelText('Delete snapshot Mine')).toBeInTheDocument();
    expect(screen.queryByLabelText('Delete snapshot Theirs')).not.toBeInTheDocument();
  });

  it('calls onDeleteSnapshot when delete clicked', async () => {
    const onDeleteSnapshot = vi.fn().mockResolvedValue(undefined);
    const snapshots = [makeSnapshot()];
    const { user } = render(
      <SnapshotPanel {...defaultProps} snapshots={snapshots} onDeleteSnapshot={onDeleteSnapshot} />
    );
    await user.click(screen.getByLabelText('Toggle snapshots panel'));
    await user.click(screen.getByLabelText('Delete snapshot Checkpoint 1'));
    expect(onDeleteSnapshot).toHaveBeenCalledWith('snap-1');
  });
});
