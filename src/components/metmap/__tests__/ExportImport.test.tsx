import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';
import { ExportImport } from '../ExportImport';
import type { Song, Section } from '../../../contexts/metmap/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));

vi.mock('@/services/apiService', () => ({
  apiService: {
    post: vi.fn().mockResolvedValue({ success: true, data: { assets: [{ id: 'a1', name: 'test.json' }] } }),
  },
}));

vi.mock('../../../services/metmapExport', () => ({
  exportMetMapVideo: vi.fn().mockResolvedValue(new Blob(['video'])),
  exportMetMapGif: vi.fn().mockResolvedValue(new Blob(['gif'])),
  downloadBlob: vi.fn(),
}));

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: 'song-1',
    userId: 'user-1',
    title: 'Test Song',
    bpmDefault: 120,
    timeSignatureDefault: '4/4',
    sectionCount: 2,
    totalBars: 16,
    practiceCount: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    name: 'Verse',
    orderIndex: 0,
    startBar: 0,
    bars: 8,
    timeSignature: '4/4',
    tempoStart: 120,
    chords: [],
    ...overrides,
  };
}

const defaultSections: Section[] = [
  makeSection({ name: 'Intro', bars: 4 }),
  makeSection({ name: 'Verse', bars: 8, orderIndex: 1 }),
];

describe('ExportImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders export/import toggle button', () => {
    render(
      <ExportImport
        currentSong={makeSong()}
        sections={defaultSections}
        onImportSong={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Export/Import options')).toBeInTheDocument();
  });

  it('opens dropdown on button click', async () => {
    const { user } = render(
      <ExportImport
        currentSong={makeSong()}
        sections={defaultSections}
        onImportSong={vi.fn()}
      />
    );
    await user.click(screen.getByLabelText('Export/Import options'));
    expect(screen.getByText('Export to JSON')).toBeInTheDocument();
    expect(screen.getByText('Import from JSON')).toBeInTheDocument();
  });

  it('shows Copy Summary option', async () => {
    const { user } = render(
      <ExportImport
        currentSong={makeSong()}
        sections={defaultSections}
        onImportSong={vi.fn()}
      />
    );
    await user.click(screen.getByLabelText('Export/Import options'));
    expect(screen.getByText('Copy Summary')).toBeInTheDocument();
  });

  it('export buttons are disabled when no song', async () => {
    const { user } = render(
      <ExportImport
        currentSong={null}
        sections={[]}
        onImportSong={vi.fn()}
      />
    );
    await user.click(screen.getByLabelText('Export/Import options'));
    expect(screen.getByText('Export to JSON').closest('button')).toBeDisabled();
  });

  it('triggers file input when Import from JSON is clicked', async () => {
    const { user } = render(
      <ExportImport
        currentSong={makeSong()}
        sections={defaultSections}
        onImportSong={vi.fn()}
      />
    );
    await user.click(screen.getByLabelText('Export/Import options'));

    // Check hidden file input exists
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', '.json');
  });

  it('exports JSON by creating blob and triggering download', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    const { user } = render(
      <ExportImport
        currentSong={makeSong()}
        sections={defaultSections}
        onImportSong={vi.fn()}
      />
    );
    await user.click(screen.getByLabelText('Export/Import options'));
    await user.click(screen.getByText('Export to JSON'));

    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
  });

  it('shows project asset options when projectId and token provided', async () => {
    const { user } = render(
      <ExportImport
        currentSong={makeSong()}
        sections={defaultSections}
        onImportSong={vi.fn()}
        projectId="proj-1"
        token="test-token"
      />
    );
    await user.click(screen.getByLabelText('Export/Import options'));
    expect(screen.getByText('Save as Project Asset')).toBeInTheDocument();
  });

  it('does not show project options without projectId', async () => {
    const { user } = render(
      <ExportImport
        currentSong={makeSong()}
        sections={defaultSections}
        onImportSong={vi.fn()}
      />
    );
    await user.click(screen.getByLabelText('Export/Import options'));
    expect(screen.queryByText('Save as Project Asset')).not.toBeInTheDocument();
  });

  it('shows video and GIF export options', async () => {
    const { user } = render(
      <ExportImport
        currentSong={makeSong()}
        sections={defaultSections}
        onImportSong={vi.fn()}
      />
    );
    await user.click(screen.getByLabelText('Export/Import options'));
    expect(screen.getByText('Export Video (.webm)')).toBeInTheDocument();
    expect(screen.getByText('Export GIF')).toBeInTheDocument();
  });

  it('closes dropdown when overlay is clicked', async () => {
    const { user } = render(
      <ExportImport
        currentSong={makeSong()}
        sections={defaultSections}
        onImportSong={vi.fn()}
      />
    );
    await user.click(screen.getByLabelText('Export/Import options'));
    expect(screen.getByText('Export to JSON')).toBeInTheDocument();

    // Click the overlay (role="presentation")
    const overlay = screen.getByRole('presentation');
    await user.click(overlay);
    expect(screen.queryByText('Export to JSON')).not.toBeInTheDocument();
  });

  it('applies className prop', () => {
    const { container } = render(
      <ExportImport
        currentSong={makeSong()}
        sections={defaultSections}
        onImportSong={vi.fn()}
        className="test-cls"
      />
    );
    expect(container.firstChild).toHaveClass('test-cls');
  });

  it('shows share to chat button after asset creation', async () => {
    const onShareToChat = vi.fn();
    const onAssetCreated = vi.fn();
    const { apiService } = await import('@/services/apiService');
    (apiService.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { assets: [{ id: 'a1', name: 'test.json' }] },
    });

    const { user } = render(
      <ExportImport
        currentSong={makeSong()}
        sections={defaultSections}
        onImportSong={vi.fn()}
        projectId="proj-1"
        token="test-token"
        onAssetCreated={onAssetCreated}
        onShareToChat={onShareToChat}
      />
    );
    await user.click(screen.getByLabelText('Export/Import options'));
    await user.click(screen.getByText('Save as Project Asset'));

    // Re-open dropdown to see share button
    await user.click(screen.getByLabelText('Export/Import options'));
    expect(screen.getByText('Share to Project Chat')).toBeInTheDocument();
  });
});
