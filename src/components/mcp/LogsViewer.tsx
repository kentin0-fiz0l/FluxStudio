/**
 * Logs Viewer - View workflow run logs and status
 */
import { useState } from 'react';
import { FileText, Loader2, RefreshCw } from 'lucide-react';
import { getMCPClient } from '../../lib/mcpClient';

export default function LogsViewer() {
  const [runId, setRunId] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTailLogs = async () => {
    if (!runId.trim()) return;

    setLoading(true);
    setError(null);
    setLogs(null);

    try {
      const mcpClient = getMCPClient();
      const logsText = await mcpClient.tailLogs(parseInt(runId, 10));
      setLogs(logsText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-purple-600" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-gray-900">
          Tail Logs
        </h3>
      </div>

      {/* Run ID input */}
      <div className="flex gap-2">
        <input
          type="number"
          value={runId}
          onChange={(e) => setRunId(e.target.value)}
          placeholder="Run ID (e.g., 12345678)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={loading}
        />
        <button
          onClick={handleTailLogs}
          disabled={loading || !runId.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Fetch
            </>
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Logs display */}
      {logs && (
        <div className="space-y-3">
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs text-gray-100 font-mono whitespace-pre leading-relaxed">
              {logs}
            </pre>
          </div>

          <button
            onClick={handleTailLogs}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Refresh
          </button>
        </div>
      )}

      {/* Help text */}
      {!logs && !error && !loading && (
        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
          <p className="mb-2">Enter a workflow run ID to view its status and logs.</p>
          <p className="text-xs text-gray-500">
            You can find the run ID in the URL when viewing a workflow run on GitHub,
            or from the preview creation result above.
          </p>
        </div>
      )}
    </div>
  );
}
