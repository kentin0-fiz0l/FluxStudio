/**
 * DslExportPanel Component
 *
 * UI panel for exporting formations as FluxDrill DSL notation.
 * Shows a read-only text preview, copy-to-clipboard, and download actions.
 */

import { useState, useMemo, useCallback } from 'react';
import { Copy, Download, RefreshCw, Check, FileText } from 'lucide-react';
import type { Formation } from '../../../services/formationTypes';
import { serializeFormation } from '../../../services/dsl';

// ============================================================================
// Types
// ============================================================================

export interface DslExportPanelProps {
  formation: Formation;
}

// ============================================================================
// Component
// ============================================================================

export function DslExportPanel({ formation }: DslExportPanelProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const dslOutput = useMemo(
    () => serializeFormation(formation),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formation, refreshKey],
  );

  const lineCount = useMemo(() => dslOutput.split('\n').length, [dslOutput]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(dslOutput);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = dslOutput;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [dslOutput]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([dslOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Sanitize formation name for filename
    const safeName = formation.name
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    a.download = `${safeName}.fxd`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [dslOutput, formation.name]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            FluxDrill DSL
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {lineCount} lines
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Copy to clipboard"
          >
            {copySuccess ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Download .fxd file"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DSL output */}
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs font-mono leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
          {dslOutput}
        </pre>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        FluxDrill v1 &middot; Export only &middot; .fxd
      </div>
    </div>
  );
}

export default DslExportPanel;
