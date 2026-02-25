/**
 * DesignQAPanel - Compare a live page against a baseline design asset
 *
 * Allows users to enter a baseline asset ID and live URL, trigger a
 * pixel-level diff via the browser worker, and view the results
 * (diff percentage, side-by-side images).
 */

import { useState } from 'react';
import { Eye, Play, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useBrowserJob } from '../../hooks/useBrowserJob';

export function DesignQAPanel() {
  const [baselineAssetId, setBaselineAssetId] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);

  const { data: job, status: queryStatus, error } = useBrowserJob(jobId);

  const isRunning = queryStatus === 'pending' || (job?.status === 'pending' || job?.status === 'processing');
  const isCompleted = job?.status === 'completed';
  const output = job?.output as {
    diffPercentage: number;
    diffImageUrl: string;
    currentImageUrl: string;
    matchScore: number;
  } | null;

  async function handleRunComparison() {
    if (!baselineAssetId.trim() || !liveUrl.trim()) return;

    try {
      const { apiService } = await import('../../services/api');
      const result = await apiService.runDesignQa(
        liveUrl.trim(),
        baselineAssetId.trim(),
      ) as { data?: { jobId: string } };
      setJobId(result.data?.jobId ?? null);
    } catch {
      // Error will be surfaced via the hook
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
          <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Design QA</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Compare a live page against a baseline design asset
          </p>
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-3">
        <div>
          <label
            htmlFor="baseline-asset-id"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Baseline Asset ID
          </label>
          <input
            id="baseline-asset-id"
            type="text"
            value={baselineAssetId}
            onChange={(e) => setBaselineAssetId(e.target.value)}
            placeholder="e.g. asset-uuid-here"
            disabled={isRunning}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       disabled:opacity-50 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="live-url"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Live URL
          </label>
          <input
            id="live-url"
            type="url"
            value={liveUrl}
            onChange={(e) => setLiveUrl(e.target.value)}
            placeholder="https://app.example.com/page"
            disabled={isRunning}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       disabled:opacity-50 text-sm"
          />
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={handleRunComparison}
        disabled={isRunning || !baselineAssetId.trim() || !liveUrl.trim()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                   bg-indigo-600 text-white hover:bg-indigo-700
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Running comparison...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" aria-hidden="true" />
            Run Comparison
          </>
        )}
      </button>

      {/* Error */}
      {(error || job?.error) && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-red-700 dark:text-red-300">
            {job?.error || (error instanceof Error ? error.message : 'An error occurred')}
          </p>
        </div>
      )}

      {/* Results */}
      {isCompleted && output && (
        <div className="space-y-4">
          {/* Match score banner */}
          <div
            className={`flex items-center gap-3 p-4 rounded-md border ${
              output.matchScore >= 95
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : output.matchScore >= 80
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <CheckCircle
              className={`w-6 h-6 ${
                output.matchScore >= 95
                  ? 'text-green-500'
                  : output.matchScore >= 80
                    ? 'text-yellow-500'
                    : 'text-red-500'
              }`}
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {output.matchScore}% match
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {output.diffPercentage}% of pixels differ from the baseline
              </p>
            </div>
          </div>

          {/* Side-by-side images */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Screenshot
              </p>
              <img
                src={`/api/files/${output.currentImageUrl}`}
                alt="Current page screenshot"
                className="w-full rounded-md border border-gray-200 dark:border-gray-700"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Diff Overlay
              </p>
              <img
                src={`/api/files/${output.diffImageUrl}`}
                alt="Pixel diff overlay"
                className="w-full rounded-md border border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DesignQAPanel;
