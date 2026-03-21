/**
 * AIFormationFeedback - Collapsible side panel for AI formation analysis
 *
 * Captures the formation canvas, sends it to the Vision API, and displays
 * structured feedback with score badges and actionable suggestions.
 */

import React, { useState, useCallback } from 'react';
import {
  Eye,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { FormationAnalysis, AnalysisType } from '@/services/formationVisionService';
import {
  captureFormationScreenshot,
  analyzeFormation,
} from '@/services/formationVisionService';

// ============================================================================
// Types
// ============================================================================

interface AIFormationFeedbackProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  formationId?: string;
  className?: string;
}

// ============================================================================
// Score Badge
// ============================================================================

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 8
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : score >= 5
        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${color}`}>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-sm font-bold">{score}/10</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AIFormationFeedback({
  canvasRef,
  formationId,
  className = '',
}: AIFormationFeedbackProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FormationAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('general');

  const handleAnalyze = useCallback(async () => {
    if (!canvasRef.current) {
      setError('Canvas not available');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const image = captureFormationScreenshot(canvasRef.current);
      const result = await analyzeFormation(image, { formationId, analysisType });
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [canvasRef, formationId, analysisType]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-colors ${className}`}
        aria-label="Open AI formation feedback"
      >
        <Eye className="w-3.5 h-3.5" />
        AI Feedback
        <ChevronLeft className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div className={`w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg flex flex-col max-h-[70vh] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">AI Formation Feedback</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          aria-label="Close feedback panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Controls */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 space-y-2">
        <select
          value={analysisType}
          onChange={(e) => setAnalysisType(e.target.value as AnalysisType)}
          className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        >
          <option value="general">General Analysis</option>
          <option value="spacing">Spacing Focus</option>
          <option value="alignment">Alignment Focus</option>
          <option value="collisions">Collision Detection</option>
        </select>

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              Analyze Formation
            </>
          )}
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
          </div>
        )}

        {analysis && (
          <>
            {/* Overall Score */}
            <ScoreBadge score={analysis.overallScore} label="Overall Score" />

            {/* Category Scores */}
            <div className="space-y-1.5">
              <ScoreBadge score={analysis.spacing.score} label="Spacing" />
              <ScoreBadge score={analysis.alignment.score} label="Alignment" />
              <ScoreBadge score={analysis.visualImpact.score} label="Visual Impact" />
            </div>

            {/* Collisions */}
            {analysis.collisions.detected && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    Collisions Detected ({analysis.collisions.pairs.length})
                  </span>
                </div>
                {analysis.collisions.pairs.map((pair, i) => (
                  <div key={i} className="text-[11px] text-red-500 dark:text-red-400 ml-5 mb-0.5">
                    {pair.performer1} / {pair.performer2} ({pair.distance})
                  </div>
                ))}
              </div>
            )}

            {!analysis.collisions.detected && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs text-green-600 dark:text-green-400">No collisions detected</span>
              </div>
            )}

            {/* Spacing Issues */}
            {analysis.spacing.issues.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Spacing Issues
                </p>
                {analysis.spacing.issues.map((issue, i) => (
                  <div key={i} className="mb-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded text-[11px]">
                    <p className="text-gray-700 dark:text-gray-300">{issue.description}</p>
                    <p className="text-blue-500 dark:text-blue-400 mt-0.5">{issue.suggestion}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Alignment Issues */}
            {analysis.alignment.issues.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Alignment Issues
                </p>
                {analysis.alignment.issues.map((issue, i) => (
                  <div key={i} className="mb-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded text-[11px]">
                    <p className="text-gray-700 dark:text-gray-300">{issue.description}</p>
                    <p className="text-blue-500 dark:text-blue-400 mt-0.5">{issue.suggestion}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Visual Impact Suggestions */}
            {analysis.visualImpact.suggestions.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Visual Impact Suggestions
                </p>
                {analysis.visualImpact.suggestions.map((suggestion, i) => (
                  <div key={i} className="mb-1 px-2 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded text-[11px] text-purple-700 dark:text-purple-300">
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!analysis && !error && !isAnalyzing && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
            Click "Analyze Formation" to get AI feedback on spacing, alignment, and visual impact.
          </p>
        )}
      </div>
    </div>
  );
}

export default AIFormationFeedback;
