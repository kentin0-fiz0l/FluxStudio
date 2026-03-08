/**
 * ConflictResolutionDialog - Conflict resolution UI
 *
 * Shows unresolved sync conflicts one at a time with a side-by-side
 * comparison of local vs server data. Users can choose to keep their
 * local version or accept the server version.
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useOffline } from '@/store';
import { AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';

function formatData(data: unknown): string {
  if (data === null || data === undefined) return 'No data available';
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export function ConflictResolutionDialog() {
  const { conflicts, resolveConflict } = useOffline();
  const unresolvedConflicts = conflicts.filter((c) => !c.resolved);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const isOpen = unresolvedConflicts.length > 0;
  const current = unresolvedConflicts[currentIndex] ?? null;
  const total = unresolvedConflicts.length;

  // Reset index if it goes out of bounds
  React.useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setCurrentIndex(total - 1);
    }
  }, [currentIndex, total]);

  if (!isOpen || !current) return null;

  const handleResolve = (resolution: 'local' | 'server') => {
    resolveConflict(current.id, resolution);
    // Index auto-adjusts via the effect above
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" aria-hidden="true" />
            Sync Conflict Detected
          </DialogTitle>
          <DialogDescription>
            {total > 1
              ? `Conflict ${currentIndex + 1} of ${total} — Choose which version to keep.`
              : 'A conflict was detected during sync. Choose which version to keep.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Local data */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Your Version (Local)
            </h3>
            <pre className="p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-xs overflow-auto max-h-64 whitespace-pre-wrap break-words">
              {formatData(current.localData)}
            </pre>
          </div>

          {/* Server data */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Server Version
            </h3>
            <pre className="p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-xs overflow-auto max-h-64 whitespace-pre-wrap break-words">
              {formatData(current.serverData)}
            </pre>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-0">
          <div className="flex items-center gap-2">
            {total > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => i - 1)}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentIndex >= total - 1}
                  onClick={() => setCurrentIndex((i) => i + 1)}
                  iconRight={<ArrowRight className="w-4 h-4" />}
                >
                  Next
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolve('server')}
            >
              Keep Theirs
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleResolve('local')}
            >
              Keep Mine
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConflictResolutionDialog;
