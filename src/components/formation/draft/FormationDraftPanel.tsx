/**
 * FormationDraftPanel - AI Formation Generation UI
 *
 * Docked panel in the formation editor providing:
 * - Input form: show description, performer count, constraints
 * - Show plan preview with approve/reject
 * - Generation progress bar
 * - Refinement input for follow-up instructions
 * - Pause/resume/cancel controls
 * - Token usage display
 *
 * Date: 2026-02-21
 */

import { useState, useCallback } from 'react';
import {
  Bot, Play, Pause, Square, Check, X, Send,
  ChevronDown, ChevronUp, Loader2, Sparkles,
  AlertCircle, Zap, RefreshCw,
} from 'lucide-react';
import { useStore } from '@/store';
import { buildApiUrl } from '@/config/environment';
import type { FormationDraftPanelProps } from './formationDraftTypes';
import { useSSEGeneration } from './useSSEGeneration';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';
import { PlanPreview } from './PlanPreview';

// ============================================================================
// Main Component
// ============================================================================

export function FormationDraftPanel({
  formationId,
  songId,
  performerCount,
  onClose,
}: FormationDraftPanelProps) {
  const draft = useStore((s) => s.formationDraft);
  const token = useStore((s) => s.auth.token);

  const [showDescription, setShowDescription] = useState('');
  const [planExpanded, setPlanExpanded] = useState(true);
  const [refinementInput, setRefinementInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const { startGeneration, cancelGeneration } = useSSEGeneration(formationId);

  // Start generation
  const handleGenerate = useCallback(() => {
    if (!showDescription.trim()) return;
    startGeneration({
      songId,
      showDescription: showDescription.trim(),
      performerCount,
    });
  }, [showDescription, songId, performerCount, startGeneration]);

  // Approve plan
  const handleApprovePlan = useCallback(async () => {
    if (!draft.activeDraftSessionId || !token) return;

    try {
      await fetch(buildApiUrl(`/api/formation-agent/session/${draft.activeDraftSessionId}/approve`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch {
      draft.setDraftError('Failed to approve plan');
    }
  }, [draft, token]);

  // Interrupt (pause/cancel)
  const handleInterrupt = useCallback(async (action: 'pause' | 'cancel') => {
    if (!draft.activeDraftSessionId || !token) return;

    if (action === 'cancel') {
      cancelGeneration();
    }

    try {
      await fetch(buildApiUrl(`/api/formation-agent/session/${draft.activeDraftSessionId}/interrupt`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      if (action === 'cancel') {
        draft.setDraftStatus('idle');
      }
    } catch {
      // Best effort
    }
  }, [draft, token, cancelGeneration]);

  // Refine
  const handleRefine = useCallback(async () => {
    if (!draft.activeDraftSessionId || !refinementInput.trim() || !token) return;

    setIsRefining(true);
    try {
      const response = await fetch(
        buildApiUrl(`/api/formation-agent/session/${draft.activeDraftSessionId}/refine`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ instruction: refinementInput.trim() }),
        }
      );

      if (!response.ok) {
        throw new Error('Refinement failed');
      }

      // Read SSE response for refinement
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'refined') {
                draft.addRefinement(refinementInput.trim(), event.data.keyframesUpdated);
              }
            } catch {
              // Skip malformed
            }
          }
        }
      }

      setRefinementInput('');
    } catch {
      draft.setDraftError('Refinement failed');
    } finally {
      setIsRefining(false);
    }
  }, [draft, refinementInput, token]);

  const isActive = draft.draftStatus !== 'idle' && draft.draftStatus !== 'done' && draft.draftStatus !== 'error';

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Draft Agent</h3>
            <StatusBadge status={draft.draftStatus} />
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close draft panel">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Input Form (shown when idle or done) */}
        {(draft.draftStatus === 'idle' || draft.draftStatus === 'done' || draft.draftStatus === 'error') && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Show Description
              </label>
              <textarea
                value={showDescription}
                onChange={(e) => setShowDescription(e.target.value)}
                placeholder="Describe your show... e.g. 'A patriotic opener with expanding stars that transitions into flowing river patterns'"
                className="w-full h-24 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>{performerCount} performers</span>
              {songId && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-400" />
                  <span>Song linked</span>
                </>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!showDescription.trim() || isActive}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Generate Draft
            </button>

            {draft.draftStatus === 'error' && draft.error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" role="alert" aria-live="polite">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs">{draft.error}</p>
                  <button
                    onClick={handleGenerate}
                    disabled={!showDescription.trim()}
                    className="flex items-center gap-1 mt-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" aria-hidden="true" />
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress Section */}
        {isActive && draft.draftStatus !== 'awaiting_approval' && (
          <div className="space-y-3">
            <ProgressBar
              percent={draft.progressPercent}
              status={draft.draftStatus}
              currentSection={draft.currentSectionIndex}
              totalSections={draft.totalSections}
              currentKeyframe={draft.currentKeyframeIndex}
              totalKeyframes={draft.totalKeyframes}
            />

            {/* Controls */}
            <div className="flex items-center gap-2">
              {draft.draftStatus === 'paused' ? (
                <button
                  onClick={() => handleInterrupt('pause')}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-amber-500 hover:bg-amber-600 text-white"
                  aria-label="Resume generation"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={() => handleInterrupt('pause')}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  aria-label="Pause generation"
                >
                  <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                  Pause
                </button>
              )}
              <button
                onClick={() => handleInterrupt('cancel')}
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-red-500"
                aria-label="Cancel generation"
              >
                <Square className="w-3.5 h-3.5" aria-hidden="true" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Plan Preview + Approval Gate */}
        {draft.showPlan && (
          <div className="space-y-2">
            <button
              onClick={() => setPlanExpanded(!planExpanded)}
              className="flex items-center justify-between w-full text-sm font-medium"
              aria-expanded={planExpanded}
              aria-label="Toggle show plan details"
            >
              <span>Show Plan</span>
              {planExpanded ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
            </button>

            {planExpanded && (
              <PlanPreview plan={draft.showPlan} />
            )}

            {draft.draftStatus === 'awaiting_approval' && (
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleApprovePlan}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium"
                >
                  <Check className="w-4 h-4" aria-hidden="true" />
                  Approve Plan
                </button>
                <button
                  onClick={() => handleInterrupt('cancel')}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                  Reject
                </button>
              </div>
            )}
          </div>
        )}

        {/* Refinement Section (shown when done) */}
        {draft.draftStatus === 'done' && draft.activeDraftSessionId && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
              <span className="text-sm text-green-700 dark:text-green-400">Draft complete</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Refine
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={refinementInput}
                  onChange={(e) => setRefinementInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                  placeholder="e.g. 'Make the opener more dramatic'"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  disabled={isRefining}
                />
                <button
                  onClick={handleRefine}
                  disabled={!refinementInput.trim() || isRefining}
                  className="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white"
                >
                  {isRefining ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Refinement History */}
            {draft.refinementHistory.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">History</span>
                {draft.refinementHistory.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-gray-50 dark:bg-gray-900 text-xs">
                    <RefreshCw className="w-3 h-3 mt-0.5 text-amber-500 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <span className="text-gray-700 dark:text-gray-300">{entry.instruction}</span>
                      <span className="text-gray-400 ml-1">({entry.keyframesUpdated} keyframes)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: Token usage */}
      {draft.tokensUsed > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" aria-hidden="true" />
            <span>{draft.tokensUsed.toLocaleString()} tokens</span>
          </div>
        </div>
      )}
    </div>
  );
}
