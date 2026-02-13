/**
 * Integration Tests - File Upload Flow
 *
 * Tests file upload with progress tracking, validation,
 * drag-and-drop, and error handling.
 */

import React, { useState, useCallback } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/utils';

// Simple file upload component for integration testing
interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

function FileUploadWidget({
  onUpload,
  maxSize = 10, // MB
  maxFiles = 5,
  acceptedTypes = ['image/*', 'application/pdf', 'text/*'],
}: {
  onUpload: (files: File[]) => Promise<void>;
  maxSize?: number;
  maxFiles?: number;
  acceptedTypes?: string[];
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const addFiles = useCallback((newFiles: File[]) => {
    setUploadError(null);

    // Validate file count
    if (files.length + newFiles.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file sizes
    const oversized = newFiles.filter(f => f.size > maxSize * 1024 * 1024);
    if (oversized.length > 0) {
      setUploadError(`File "${oversized[0].name}" exceeds ${maxSize}MB limit`);
      return;
    }

    const uploadFiles: UploadedFile[] = newFiles.map((file, i) => ({
      id: `file-${Date.now()}-${i}`,
      file,
      progress: 0,
      status: 'pending' as const,
    }));

    setFiles(prev => [...prev, ...uploadFiles]);
  }, [files.length, maxFiles, maxSize]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    // Set all files to uploading
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const, progress: 0 })));

    try {
      // Simulate progress
      for (let progress = 25; progress <= 100; progress += 25) {
        setFiles(prev => prev.map(f => ({ ...f, progress })));
      }

      await onUpload(files.map(f => f.file));
      setFiles(prev => prev.map(f => ({ ...f, status: 'success' as const, progress: 100 })));
    } catch {
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const, error: 'Upload failed' })));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        data-testid="drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ border: isDragOver ? '2px dashed blue' : '2px dashed gray', padding: 20 }}
      >
        {isDragOver ? (
          <p>Drop files here</p>
        ) : (
          <p>Drag files here or click to browse</p>
        )}
        <input
          type="file"
          multiple
          data-testid="file-input"
          accept={acceptedTypes.join(',')}
          onChange={(e) => {
            if (e.target.files) addFiles(Array.from(e.target.files));
          }}
        />
      </div>

      {/* Error */}
      {uploadError && <div role="alert">{uploadError}</div>}

      {/* File list */}
      {files.length > 0 && (
        <div data-testid="file-list">
          <p>{files.length} file(s) selected ({formatSize(totalSize)})</p>
          <ul>
            {files.map((f) => (
              <li key={f.id} data-testid={`file-item-${f.id}`}>
                <span>{f.file.name}</span>
                <span> ({formatSize(f.file.size)})</span>
                {f.status === 'uploading' && (
                  <progress value={f.progress} max={100} aria-label={`${f.file.name} upload progress`}>
                    {f.progress}%
                  </progress>
                )}
                {f.status === 'success' && <span data-testid="upload-success">Uploaded</span>}
                {f.status === 'error' && <span role="alert">{f.error}</span>}
                <button onClick={() => removeFile(f.id)} aria-label={`Remove ${f.file.name}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <button onClick={handleUpload} disabled={files.length === 0}>
        Upload {files.length > 0 ? `(${files.length})` : ''}
      </button>
      <button onClick={() => setFiles([])}>Clear All</button>
    </div>
  );
}

describe('File Upload Integration', () => {
  const mockUpload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue(undefined);
  });

  describe('File selection', () => {
    it('should add files via file input', async () => {
      render(<FileUploadWidget onUpload={mockUpload} />);

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const file = new File(['content'], 'test.png', { type: 'image/png' });

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
        expect(screen.getByText(/1 file\(s\) selected/)).toBeInTheDocument();
      });
    });

    it('should add multiple files at once', async () => {
      render(<FileUploadWidget onUpload={mockUpload} />);

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const file1 = new File(['a'], 'file1.png', { type: 'image/png' });
      const file2 = new File(['b'], 'file2.pdf', { type: 'application/pdf' });

      await userEvent.upload(input, [file1, file2]);

      await waitFor(() => {
        expect(screen.getByText('file1.png')).toBeInTheDocument();
        expect(screen.getByText('file2.pdf')).toBeInTheDocument();
        expect(screen.getByText(/2 file\(s\) selected/)).toBeInTheDocument();
      });
    });

    it('should render initial state correctly', () => {
      render(<FileUploadWidget onUpload={mockUpload} />);

      expect(screen.getByText('Drag files here or click to browse')).toBeInTheDocument();
      expect(screen.getByTestId('file-input')).toBeInTheDocument();
      expect(screen.getByText(/Upload/)).toBeDisabled();
    });
  });

  describe('File validation', () => {
    it('should reject when exceeding max file count', async () => {
      render(<FileUploadWidget onUpload={mockUpload} maxFiles={2} />);

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const files = [
        new File(['a'], 'f1.png', { type: 'image/png' }),
        new File(['b'], 'f2.png', { type: 'image/png' }),
        new File(['c'], 'f3.png', { type: 'image/png' }),
      ];

      await userEvent.upload(input, files);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Maximum 2 files allowed');
      });
    });

    it('should reject oversized files', async () => {
      render(<FileUploadWidget onUpload={mockUpload} maxSize={1} />);

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      // Create a file larger than 1MB
      const largeContent = new ArrayBuffer(1.5 * 1024 * 1024);
      const file = new File([largeContent], 'huge.png', { type: 'image/png' });

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('exceeds 1MB limit');
      });
    });
  });

  describe('File removal', () => {
    it('should remove a specific file from the list', async () => {
      render(<FileUploadWidget onUpload={mockUpload} />);

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const file1 = new File(['a'], 'keep.png', { type: 'image/png' });
      const file2 = new File(['b'], 'remove.png', { type: 'image/png' });

      await userEvent.upload(input, [file1, file2]);

      await waitFor(() => {
        expect(screen.getByText('remove.png')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByLabelText('Remove remove.png'));

      await waitFor(() => {
        expect(screen.queryByText('remove.png')).not.toBeInTheDocument();
        expect(screen.getByText('keep.png')).toBeInTheDocument();
      });
    });

    it('should clear all files', async () => {
      render(<FileUploadWidget onUpload={mockUpload} />);

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      await userEvent.upload(input, [
        new File(['a'], 'f1.png', { type: 'image/png' }),
        new File(['b'], 'f2.png', { type: 'image/png' }),
      ]);

      await waitFor(() => {
        expect(screen.getByText('f1.png')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Clear All'));

      await waitFor(() => {
        expect(screen.queryByText('f1.png')).not.toBeInTheDocument();
        expect(screen.queryByText('f2.png')).not.toBeInTheDocument();
      });
    });
  });

  describe('Upload flow', () => {
    it('should upload files and show success status', async () => {
      render(<FileUploadWidget onUpload={mockUpload} />);

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const file = new File(['content'], 'upload.png', { type: 'image/png' });

      await userEvent.upload(input, file);
      await userEvent.click(screen.getByText(/Upload/));

      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith([file]);
        expect(screen.getByTestId('upload-success')).toHaveTextContent('Uploaded');
      });
    });

    it('should show error status on upload failure', async () => {
      mockUpload.mockRejectedValue(new Error('Network error'));

      render(<FileUploadWidget onUpload={mockUpload} />);

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      await userEvent.upload(input, new File(['x'], 'fail.png', { type: 'image/png' }));
      await userEvent.click(screen.getByText(/Upload/));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Upload failed');
      });
    });

    it('should disable upload button when no files selected', () => {
      render(<FileUploadWidget onUpload={mockUpload} />);

      expect(screen.getByText(/Upload/)).toBeDisabled();
    });

    it('should show file count in upload button', async () => {
      render(<FileUploadWidget onUpload={mockUpload} />);

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      await userEvent.upload(input, [
        new File(['a'], 'f1.png', { type: 'image/png' }),
        new File(['b'], 'f2.png', { type: 'image/png' }),
      ]);

      await waitFor(() => {
        expect(screen.getByText(/Upload \(2\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Drag and drop', () => {
    it('should show drag-over indicator', () => {
      render(<FileUploadWidget onUpload={mockUpload} />);

      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.dragOver(dropZone, {
        dataTransfer: { files: [] },
      });

      expect(screen.getByText('Drop files here')).toBeInTheDocument();
    });

    it('should reset drag state on drag leave', () => {
      render(<FileUploadWidget onUpload={mockUpload} />);

      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.dragOver(dropZone, { dataTransfer: { files: [] } });
      expect(screen.getByText('Drop files here')).toBeInTheDocument();

      fireEvent.dragLeave(dropZone);
      expect(screen.getByText('Drag files here or click to browse')).toBeInTheDocument();
    });

    it('should accept dropped files', async () => {
      render(<FileUploadWidget onUpload={mockUpload} />);

      const dropZone = screen.getByTestId('drop-zone');
      const file = new File(['dropped'], 'dropped.png', { type: 'image/png' });

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(screen.getByText('dropped.png')).toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle files with special characters in name', async () => {
      render(<FileUploadWidget onUpload={mockUpload} />);

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const file = new File(['content'], 'my file (1).png', { type: 'image/png' });

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('my file (1).png')).toBeInTheDocument();
      });
    });

    it('should handle upload button text with zero files', () => {
      render(<FileUploadWidget onUpload={mockUpload} />);

      // Upload button should just say "Upload" with no count
      const uploadButton = screen.getByText(/Upload/);
      expect(uploadButton).toBeDisabled();
    });
  });
});
