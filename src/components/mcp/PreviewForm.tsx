/**
 * Preview Form - Create preview deployments for Git branches
 */
import React, { useState } from 'react';
import { Rocket, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { getMCPClient } from '../../lib/mcpClient';

interface PreviewResult {
  run_id: number;
  status: string;
  html_url: string;
  created_at: string;
  head_branch: string;
}

export default function PreviewForm() {
  const [branch, setBranch] = useState('');
  const [payload, setPayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const mcpClient = getMCPClient();

      // Parse optional payload
      let payloadObj: Record<string, any> | undefined;
      if (payload.trim()) {
        try {
          payloadObj = JSON.parse(payload);
        } catch (_err) {
          throw new Error('Invalid JSON payload');
        }
      }

      const previewResult = await mcpClient.createPreview(branch, payloadObj);
      setResult(previewResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create preview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Rocket className="w-5 h-5 text-blue-600" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-gray-900">
          Create Preview
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Branch input */}
        <div>
          <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-2">
            Branch Name
          </label>
          <input
            id="branch"
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="e.g., feat/new-feature"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading}
          />
        </div>

        {/* Optional payload */}
        <div>
          <label htmlFor="payload" className="block text-sm font-medium text-gray-700 mb-2">
            Workflow Inputs (Optional JSON)
          </label>
          <textarea
            id="payload"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder='{"environment": "preview"}'
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            rows={3}
            disabled={loading}
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !branch.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Creating Preview...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" aria-hidden="true" />
              Create Preview
            </>
          )}
        </button>
      </form>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-900 mb-1">
              Error
            </h4>
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Success result */}
      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h4 className="text-sm font-semibold text-green-900">
              Preview Deployment Started
            </h4>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Run ID:</span>
              <span className="font-mono text-gray-900">#{result.run_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Branch:</span>
              <span className="font-medium text-gray-900">{result.head_branch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                result.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : result.status === 'in_progress' || result.status === 'queued'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {result.status}
              </span>
            </div>
          </div>

          <a
            href={result.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors font-medium text-sm"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            View on GitHub
          </a>
        </div>
      )}
    </div>
  );
}
