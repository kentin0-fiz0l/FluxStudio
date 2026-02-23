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

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Bot, Play, Pause, Square, Check, X, Send,
  ChevronDown, ChevronUp, Loader2, Sparkles,
  AlertCircle, Zap, RefreshCw,
} from 'lucide-react';
import { useStore } from '@/store';
import { buildApiUrl } from '@/config/environment';
import type { ShowPlan, DraftStatus } from '@/store/slices/formationDraftSlice';

// ============================================================================
// Types
// ============================================================================

interface FormationDraftPanelProps {
  formationId: string;
  songId?: string | null;
  performerCount: number;
  onClose: () => void;
}

// ============================================================================
// SSE Event Handler
// ============================================================================

function useSSEGeneration(formationId: string) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startGeneration = useCallback(async (params: {
    songId?: string | null;
    showDescription: string;
    performerCount: number;
    constraints?: Record<string, unknown>;
  }) => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const token = useStore.getState().auth.token;
    if (!token) return;

    abortRef.current = new AbortController();

    try {
      const response = await fetch(buildApiUrl('/api/formation-agent/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          formationId,
          songId: params.songId || undefined,
          showDescription: params.showDescription,
          performerCount: params.performerCount,
          constraints: params.constraints || {},
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Request failed' }));
        useStore.getState().formationDraft.setDraftError(errData.error || errData.message || 'Generation failed');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

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
            handleSSEEvent(event);
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      useStore.getState().formationDraft.setDraftError(
        err instanceof Error ? err.message : 'Connection lost'
      );
    }
  }, [formationId]);

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      eventSourceRef.current?.close();
    };
  }, []);

  return { startGeneration, cancelGeneration };
}

function handleSSEEvent(event: { type: string; data: Record<string, unknown> }) {
  const { type, data } = event;
  const draft = useStore.getState().formationDraft;

  switch (type) {
    case 'session':
      draft.startDraftSession(data.sessionId as string);
      break;
    case 'status':
      draft.setDraftStatus(data.status as DraftStatus);
      break;
    case 'music_analysis':
      draft.setMusicAnalysis({
        sections: data.sections as { name: string; startMs: number; endMs: number; durationMs: number; tempo: number }[],
        totalDurationMs: data.totalDurationMs as number,
        hasSong: true,
      });
      break;
    case 'plan':
      draft.setShowPlan(data as unknown as ShowPlan);
      break;
    case 'awaiting_approval':
      draft.setDraftStatus('awaiting_approval');
      break;
    case 'generating':
      draft.setGenerationProgress(
        data.sectionIndex as number,
        data.totalSections as number,
        data.sectionName as string,
      );
      break;
    case 'keyframe':
      draft.setKeyframeProgress(
        data.keyframeIndex as number,
        data.totalKeyframes as number,
      );
      break;
    case 'smoothing':
      draft.setSmoothingResult(
        (data.adjustments as number) || 0,
        (data.summary as string) || '',
      );
      break;
    case 'done':
      draft.setDraftDone(
        data.tokensUsed as number,
        data.keyframesGenerated as number,
      );
      break;
    case 'paused':
      draft.setDraftStatus('paused');
      break;
    case 'cancelled':
      draft.setDraftStatus('idle');
      break;
    case 'error':
      draft.setDraftError(data.message as string);
      break;
  }
}

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
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Draft Agent</h3>
            <StatusBadge status={draft.draftStatus} />
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close draft panel">
          <X className="w-4 h-4" />
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
              <Sparkles className="w-4 h-4" />
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
                    <RefreshCw className="w-3 h-3" />
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
                  <Play className="w-3.5 h-3.5" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={() => handleInterrupt('pause')}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  aria-label="Pause generation"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </button>
              )}
              <button
                onClick={() => handleInterrupt('cancel')}
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-red-500"
                aria-label="Cancel generation"
              >
                <Square className="w-3.5 h-3.5" />
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
              {planExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                  <Check className="w-4 h-4" />
                  Approve Plan
                </button>
                <button
                  onClick={() => handleInterrupt('cancel')}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                >
                  <X className="w-4 h-4" />
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
              <Check className="w-4 h-4 text-green-500" />
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
                  {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Refinement History */}
            {draft.refinementHistory.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">History</span>
                {draft.refinementHistory.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-gray-50 dark:bg-gray-900 text-xs">
                    <RefreshCw className="w-3 h-3 mt-0.5 text-amber-500 flex-shrink-0" />
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
            <Zap className="w-3 h-3" />
            <span>{draft.tokensUsed.toLocaleString()} tokens</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: DraftStatus }) {
  const configs: Record<DraftStatus, { label: string; color: string }> = {
    idle: { label: 'Ready', color: 'text-gray-400' },
    analyzing: { label: 'Analyzing music...', color: 'text-blue-500' },
    planning: { label: 'Planning show...', color: 'text-blue-500' },
    awaiting_approval: { label: 'Awaiting approval', color: 'text-amber-500' },
    generating: { label: 'Generating...', color: 'text-amber-500' },
    smoothing: { label: 'Smoothing...', color: 'text-purple-500' },
    refining: { label: 'Refining...', color: 'text-purple-500' },
    paused: { label: 'Paused', color: 'text-gray-400' },
    done: { label: 'Complete', color: 'text-green-500' },
    error: { label: 'Error', color: 'text-red-500' },
  };

  const cfg = configs[status];

  return (
    <span className={`text-[10px] font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function ProgressBar({
  percent,
  status,
  currentSection,
  totalSections,
  currentKeyframe,
  totalKeyframes,
}: {
  percent: number;
  status: DraftStatus;
  currentSection: number;
  totalSections: number;
  currentKeyframe: number;
  totalKeyframes: number;
}) {
  const statusLabels: Partial<Record<DraftStatus, string>> = {
    analyzing: 'Analyzing music structure...',
    planning: 'Creating show plan...',
    generating: `Section ${currentSection + 1}/${totalSections} — Keyframe ${currentKeyframe}/${totalKeyframes}`,
    smoothing: 'Smoothing transitions...',
    refining: 'Applying refinements...',
    paused: 'Paused',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          {statusLabels[status] || status}
        </span>
        <span className="font-medium text-gray-700 dark:text-gray-300">{percent}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Generation progress">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function PlanPreview({ plan }: { plan: ShowPlan }) {
  return (
    <div className="space-y-1.5 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{plan.title}</p>
      <div className="space-y-1">
        {plan.sections.map((section, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-medium text-[10px]">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-700 dark:text-gray-300 truncate block">
                {section.sectionName}
              </span>
              <span className="text-gray-400 truncate block">
                {section.formationConcept} — {section.keyframeCount} keyframe{section.keyframeCount !== 1 ? 's' : ''}
              </span>
            </div>
            <EnergyDot energy={section.energy} />
          </div>
        ))}
      </div>
      <div className="pt-1 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-400">
        {plan.totalKeyframes} total keyframes — ~{plan.estimatedTokens?.toLocaleString() || '?'} tokens
      </div>
    </div>
  );
}

function EnergyDot({ energy }: { energy: string }) {
  const colors: Record<string, string> = {
    low: 'bg-blue-400',
    medium: 'bg-green-400',
    high: 'bg-orange-400',
    climax: 'bg-red-400',
  };

  return (
    <div
      className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[energy] || 'bg-gray-400'}`}
      title={energy}
    />
  );
}
