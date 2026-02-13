import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { FileViewer } from '../FileViewer';

const mockFile = {
  id: '1',
  name: 'test-image.png',
  size: 1024,
  mimeType: 'image/png',
  fileType: 'image',
  source: 'upload',
  provider: null,
  isImage: true,
  fileUrl: '/files/test.png',
  projectName: 'My Project',
  createdAt: new Date().toISOString(),
} as any;

describe('FileViewer', () => {
  test('renders file name when open', () => {
    render(
      <FileViewer
        open={true}
        onOpenChange={vi.fn()}
        file={mockFile}
        onDownload={vi.fn()}
        onLinkProject={vi.fn()}
      />
    );
    expect(screen.getByText('test-image.png')).toBeDefined();
  });

  test('renders nothing when file is null', () => {
    render(
      <FileViewer
        open={true}
        onOpenChange={vi.fn()}
        file={null}
        onDownload={vi.fn()}
        onLinkProject={vi.fn()}
      />
    );
    // Dialog still renders but no file content
    expect(screen.queryByText('Download')).toBeNull();
  });

  test('shows download and link buttons', () => {
    render(
      <FileViewer
        open={true}
        onOpenChange={vi.fn()}
        file={mockFile}
        onDownload={vi.fn()}
        onLinkProject={vi.fn()}
      />
    );
    expect(screen.getByText('Download')).toBeDefined();
    expect(screen.getByText('Link to Project')).toBeDefined();
  });
});
