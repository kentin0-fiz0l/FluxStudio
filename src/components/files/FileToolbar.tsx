import { Button } from '../ui';
import { FolderOpen, RefreshCw, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FileToolbarProps {
  loading: boolean;
  onRefresh: () => void;
  onUpload: () => void;
}

export function FileToolbar({ loading, onRefresh, onUpload }: FileToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-3">
          <FolderOpen className="w-7 h-7 text-primary-600" aria-hidden="true" />
          Files
        </h1>
        <p className="text-neutral-600 mt-1">
          Uploads, imports, and generated assets in one place.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />}
          onClick={onRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
        <Button
          icon={<Upload className="h-4 w-4" />}
          onClick={onUpload}
        >
          Upload Files
        </Button>
      </div>
    </div>
  );
}
