/**
 * FigmaIntegration Component
 * Figma-specific integration with file browsing
 */

import { useState } from 'react';
import { FileText, Folder, Loader2, RefreshCw } from 'lucide-react';
import { IntegrationCard } from './IntegrationCard';
import { Button } from '@/components/ui/button';
import type { Integration } from '@/types/integrations';
import { integrationService } from '@/services/integrationService';

interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
}

export function FigmaIntegration() {
  const [files, setFiles] = useState<FigmaFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);

  const loadFigmaFiles = async () => {
    setIsLoadingFiles(true);
    setFilesError(null);

    try {
      const figmaFiles = await integrationService.getFigmaFiles();
      setFiles(figmaFiles);
    } catch (error: any) {
      console.error('Failed to load Figma files:', error);
      setFilesError(error.message || 'Failed to load Figma files');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSuccess = (_integration: Integration) => {
    // Auto-load files when connected
    loadFigmaFiles();
  };

  const handleOpenFile = (fileKey: string) => {
    window.open(`https://figma.com/file/${fileKey}`, '_blank');
  };

  return (
    <IntegrationCard
      provider="figma"
      onSuccess={handleSuccess}
    >
      {/* Figma Files Section (only shown when connected) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Recent Files
          </h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadFigmaFiles}
            disabled={isLoadingFiles}
            icon={<RefreshCw className={`h-4 w-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />}
            aria-label="Refresh Figma files"
          >
            Refresh
          </Button>
        </div>

        {isLoadingFiles && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        )}

        {filesError && (
          <div className="p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded text-sm text-error-700 dark:text-error-300">
            {filesError}
          </div>
        )}

        {!isLoadingFiles && !filesError && files.length === 0 && (
          <div className="text-center py-8 text-sm text-neutral-500">
            <Folder className="h-12 w-12 mx-auto mb-2 text-neutral-400" />
            <p>No Figma files found</p>
            <p className="text-xs mt-1">Create a file in Figma to see it here</p>
          </div>
        )}

        {!isLoadingFiles && !filesError && files.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.slice(0, 5).map((file) => (
              <button
                key={file.key}
                onClick={() => handleOpenFile(file.key)}
                className="w-full flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-left"
              >
                {file.thumbnail_url ? (
                  <img
                    src={file.thumbnail_url}
                    alt={file.name}
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Modified {new Date(file.last_modified).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
            {files.length > 5 && (
              <p className="text-xs text-center text-neutral-500 pt-2">
                and {files.length - 5} more file{files.length - 5 !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
      </div>
    </IntegrationCard>
  );
}
