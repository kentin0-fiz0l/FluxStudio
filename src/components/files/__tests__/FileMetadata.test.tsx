import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { FileFilters, FileStatsBar, FileErrorBar, FileUploadProgress } from '../FileMetadata';

describe('FileFilters', () => {
  test('renders search input and filter selects', () => {
    render(
      <FileFilters
        localSearch=""
        onSearchChange={vi.fn()}
        typeFilter="all"
        onTypeFilterChange={vi.fn()}
        sourceFilter="all"
        onSourceFilterChange={vi.fn()}
        viewMode="grid"
        onViewModeChange={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText('Search files...')).toBeDefined();
    expect(screen.getByLabelText('Filter by type')).toBeDefined();
    expect(screen.getByLabelText('Filter by source')).toBeDefined();
  });
});

describe('FileStatsBar', () => {
  test('renders file count', () => {
    render(<FileStatsBar total={42} search="" typeFilter="all" sourceFilter="all" />);
    expect(screen.getByText('42 file(s)')).toBeDefined();
  });

  test('shows active filters', () => {
    render(<FileStatsBar total={10} search="foo" typeFilter="image" sourceFilter="upload" />);
    expect(screen.getByText(/foo/)).toBeDefined();
    expect(screen.getByText(/image/)).toBeDefined();
    expect(screen.getByText(/upload/)).toBeDefined();
  });
});

describe('FileErrorBar', () => {
  test('renders error and retry button', () => {
    render(<FileErrorBar error="Something went wrong" onRetry={vi.fn()} />);
    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText('Retry')).toBeDefined();
  });
});

describe('FileUploadProgress', () => {
  test('renders nothing when no uploads', () => {
    const { container } = render(<FileUploadProgress uploadProgress={{}} />);
    expect(container.innerHTML).toBe('');
  });

  test('renders upload progress', () => {
    render(<FileUploadProgress uploadProgress={{ 'photo.jpg': 50 }} />);
    expect(screen.getByText('Uploading 1 file(s)...')).toBeDefined();
    expect(screen.getByText('photo.jpg')).toBeDefined();
    expect(screen.getByText('50%')).toBeDefined();
  });
});
