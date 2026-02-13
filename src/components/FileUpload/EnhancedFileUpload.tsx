import React, { useState, useRef, useCallback } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Upload, CheckCircle, AlertTriangle, Shield, FileIcon } from 'lucide-react';

interface UploadSession {
  uploadId: string;
  filename: string;
  progress: number;
  stage: string;
  status: string;
  securityStatus: string;
  errors: string[];
  filesize?: number;
}

interface ScanResult {
  fileId: string;
  uploadId: string;
  scanResult: {
    status: string;
    threats: string[];
    scanDuration: number;
  };
}

interface UploadResult {
  uploadId: string;
  original_name: string;
  file_size: number;
  securityStatus?: string;
  [key: string]: unknown;
}

interface EnhancedFileUploadProps {
  onUploadComplete?: (file: UploadResult) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSize?: number;
  projectId?: number;
  organizationId?: number;
  userId?: string;
}

export const EnhancedFileUpload: React.FC<EnhancedFileUploadProps> = ({
  onUploadComplete,
  onUploadError,
  accept = "*/*",
  maxSize = 50 * 1024 * 1024, // 50MB
  projectId,
  organizationId,
  userId
}) => {
  const [uploads, setUploads] = useState<Map<string, UploadSession>>(new Map());
  const [dragActive, setDragActive] = useState(false);
  const [completedUploads, setCompletedUploads] = useState<UploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { socket, connected } = useWebSocket('/files');

  // Listen for upload progress updates
  React.useEffect(() => {
    if (!socket) return;

    const handleUploadProgress = (session: UploadSession) => {
      setUploads(prev => new Map(prev.set(session.uploadId, session)));
    };

    const handleScanComplete = (scanResult: ScanResult) => {

      // Update upload session with scan results
      setUploads(prev => {
        const updated = new Map(prev);
        const session = updated.get(scanResult.uploadId);
        if (session) {
          session.stage = 'scan-complete';
          session.securityStatus = scanResult.scanResult.status;
          if (scanResult.scanResult.threats.length > 0) {
            session.errors.push(...scanResult.scanResult.threats);
          }
        }
        return updated;
      });
    };

    socket.on('upload_progress', handleUploadProgress);
    socket.on('file_scan_complete', handleScanComplete);

    return () => {
      socket.off('upload_progress', handleUploadProgress);
      socket.off('file_scan_complete', handleScanComplete);
    };
  }, [socket]);

  const uploadFile = useCallback(async (file: File) => {
    if (!connected) {
      onUploadError?.('Not connected to server');
      return;
    }

    // Client-side validation
    if (file.size > maxSize) {
      onUploadError?.(`File too large: ${Math.round(file.size / (1024 * 1024))}MB (max: ${Math.round(maxSize / (1024 * 1024))}MB)`);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (projectId) formData.append('projectId', projectId.toString());
      if (organizationId) formData.append('organizationId', organizationId.toString());
      if (userId) formData.append('userId', userId);

      // Send socket ID for progress tracking
      if (socket?.id) {
        formData.append('socketId', socket.id);
      }

      const response = await fetch('/api/files/upload-enhanced', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      // Add to completed uploads
      setCompletedUploads(prev => [...prev, result]);

      // Remove from active uploads after a delay
      setTimeout(() => {
        setUploads(prev => {
          const updated = new Map(prev);
          updated.delete(result.uploadId);
          return updated;
        });
      }, 5000);

      onUploadComplete?.(result);

    } catch (error) {
      console.error('Upload error:', error);
      onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
    }
  }, [connected, socket, maxSize, projectId, organizationId, userId, onUploadComplete, onUploadError]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      uploadFile(file);
    });
  }, [uploadFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const getStageIcon = (stage: string, securityStatus: string) => {
    switch (stage) {
      case 'validation':
        return <FileIcon className="w-4 h-4" />;
      case 'security-prescan':
      case 'security-scan':
        return <Shield className="w-4 h-4" />;
      case 'uploading':
        return <Upload className="w-4 h-4" />;
      case 'completed':
      case 'scan-complete':
        return securityStatus === 'infected' ?
          <AlertTriangle className="w-4 h-4 text-red-500" /> :
          <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <FileIcon className="w-4 h-4" />;
    }
  };

  const getStageText = (stage: string) => {
    switch (stage) {
      case 'validation':
        return 'Validating file...';
      case 'security-prescan':
        return 'Pre-security scan...';
      case 'uploading':
        return 'Uploading...';
      case 'security-scan':
        return 'Security scanning...';
      case 'completed':
        return 'Upload complete';
      case 'scan-complete':
        return 'Security scan complete';
      default:
        return 'Processing...';
    }
  };

  const getSecurityBadgeVariant = (status: string) => {
    switch (status) {
      case 'clean':
      case 'safe':
        return 'default';
      case 'suspicious':
        return 'secondary';
      case 'infected':
        return 'error';
      default:
        return 'outline';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <Card
        className={`cursor-pointer transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-300'
        }`}
        onDrag={handleDrag}
        onDragStart={handleDrag}
        onDragEnd={handleDrag}
        onDragOver={handleDrag}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="p-8 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-semibold mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-gray-500">
            Maximum file size: {formatFileSize(maxSize)}
          </p>
          {!connected && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Not connected to server. Progress tracking unavailable.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Active Uploads */}
      {uploads.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Uploads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from(uploads.values()).map((upload) => (
              <div key={upload.uploadId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStageIcon(upload.stage, upload.securityStatus)}
                    <span className="font-medium">{upload.filename}</span>
                    {upload.filesize && (
                      <span className="text-sm text-gray-500">
                        ({formatFileSize(upload.filesize)})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getSecurityBadgeVariant(upload.securityStatus)}>
                      {upload.securityStatus || 'pending'}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {upload.progress}%
                    </span>
                  </div>
                </div>

                <Progress value={upload.progress} className="w-full" />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {getStageText(upload.stage)}
                  </span>
                  <Badge variant="outline">
                    {upload.status}
                  </Badge>
                </div>

                {upload.errors.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {upload.errors.join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Completed Uploads */}
      {completedUploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedUploads.slice(-5).map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium">{file.original_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getSecurityBadgeVariant(file.securityStatus ?? 'clean')}>
                    {file.securityStatus || 'clean'}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {formatFileSize(file.file_size)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedFileUpload;