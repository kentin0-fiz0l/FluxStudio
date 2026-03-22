/**
 * FormationPromptBar Component
 *
 * Natural language formation creation bar at the bottom of the canvas.
 * Parses input via promptParser → executes via promptExecutor → routes
 * results through the ghost preview pipeline for visual accept/reject.
 * Falls back to basic_formation for unrecognized patterns.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Wand2,
  ChevronUp,
  ChevronDown,
  Wrench,
} from 'lucide-react';
import type { Performer, Position, FieldConfig } from '@/services/formationTypes';
import { parsePrompt } from '@/services/promptParser';
import { executePromptCommand } from '@/services/promptExecutor';
import { useGhostPreview } from '@/store/slices/ghostPreviewSlice';
import { VoiceInputButton } from './VoiceInputButton';
import { FORMATION_TEMPLATES, snapToTemplate } from '@/services/formationTemplates';
import { buildApiUrl } from '@/config/environment';
import type { AIToolCall } from '@/services/aiToolExecution';
import { describeToolCall } from '@/services/aiToolExecution';

// Template chips for quick template access (pick 6 popular ones)
const TEMPLATE_CHIPS = FORMATION_TEMPLATES.filter(t =>
  ['company_front', 'wedge', 'diamond', 'block', 'concentric_circles', 'starburst'].includes(t.id)
);

// ============================================================================
// Types
// ============================================================================

interface FormationPromptBarProps {
  /** Current performers */
  performers: Performer[];
  /** Current positions on canvas (for computing deltas) */
  currentPositions: Map<string, Position>;
  /** Selected performer IDs (for "selected" filter) */
  selectedPerformerIds: string[];
  /** Apply generated positions to the canvas (legacy fallback) */
  onApplyPositions: (positions: Map<string, Position>) => void;
  /** Field configuration for context-aware generation */
  fieldConfig?: FieldConfig;
  /** Pre-fill the prompt input (e.g. from a ?prompt= query param) */
  initialPrompt?: string;
  /** Called when the sandbox AI rate limit (429) is hit */
  onSandboxLimit?: () => void;
  /** Optional class name */
  className?: string;
}

// ============================================================================
// Suggestions
// ============================================================================

const SUGGESTIONS = [
  { label: 'Company front', prompt: 'company front' },
  { label: 'Block', prompt: 'block formation' },
  { label: 'Circle', prompt: 'circle' },
  { label: 'Scatter', prompt: 'scatter' },
  { label: 'Spread in arc', prompt: 'spread in arc' },
  { label: 'Diagonal', prompt: 'diagonal line' },
  { label: 'Wedge', prompt: 'wedge formation' },
  { label: 'Grid', prompt: 'distribute in grid' },
] as const;

// ============================================================================
// Autocomplete Hook
// ============================================================================

function useAutocomplete(performerCount: number) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isVisible, setIsVisible] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback((partial: string) => {
    // Clear previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (partial.trim().length < 2) {
      setSuggestions([]);
      setIsVisible(false);
      setActiveIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const resp = await fetch(buildApiUrl('/ai/drill/autocomplete'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            partial: partial.trim(),
            context: { performerCount },
          }),
          signal: controller.signal,
        });

        if (!resp.ok || controller.signal.aborted) return;

        const data = await resp.json();
        if (data.success && Array.isArray(data.data?.suggestions) && data.data.suggestions.length > 0) {
          setSuggestions(data.data.suggestions);
          setIsVisible(true);
          setActiveIndex(-1);
        } else {
          setSuggestions([]);
          setIsVisible(false);
        }
      } catch {
        // Ignore abort errors and network failures
      }
    }, 300);
  }, [performerCount]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { suggestions, activeIndex, setActiveIndex, isVisible, fetchSuggestions, dismiss };
}

// ============================================================================
// Main Component
// ============================================================================

export function FormationPromptBar({
  performers,
  currentPositions,
  selectedPerformerIds,
  onApplyPositions: _onApplyPositions,
  fieldConfig,
  initialPrompt = '',
  onSandboxLimit,
  className = '',
}: FormationPromptBarProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [pendingToolCall, setPendingToolCall] = useState<AIToolCall | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('fluxstudio_prompt_history') || '[]');
    } catch { return []; }
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoTriggeredRef = useRef(false);
  const ghostPreview = useGhostPreview();
  const autocomplete = useAutocomplete(performers.length);

  const hasActivePreview = ghostPreview.activePreview !== null;
  const canGenerate = prompt.trim().length > 0 && performers.length > 0;

  /** Run local prompt parsing and show result via ghost preview */
  const generateLocal = useCallback(
    (description: string) => {
      const command = parsePrompt(description, selectedPerformerIds);
      const result = executePromptCommand(command, performers, currentPositions, fieldConfig);

      if (result.affectedPerformerIds.length > 0) {
        ghostPreview.setPreview({
          id: `prompt-${Date.now()}`,
          source: 'prompt',
          sourceLabel: description.length > 30 ? description.slice(0, 27) + '...' : description,
          proposedPositions: result.proposedPositions,
          affectedPerformerIds: result.affectedPerformerIds,
        });
      } else {
        setError('No performers matched');
      }
    },
    [selectedPerformerIds, performers, currentPositions, fieldConfig, ghostPreview],
  );

  const handleGenerate = useCallback(
    (text?: string) => {
      const description = (text ?? prompt).trim();
      if (!description || performers.length === 0) return;

      setIsGenerating(true);
      setError(null);
      setShowSuggestions(false);

      // When onSandboxLimit is provided we are in sandbox mode —
      // call the sandbox API to get AI-generated positions and track usage.
      if (onSandboxLimit) {
        fetch(buildApiUrl('/ai/sandbox-generate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: description,
            performers: performers.map(p => ({ id: p.id, name: p.name })),
          }),
        })
          .then(async (resp) => {
            if (resp.status === 429) {
              const body = await resp.json().catch(() => ({}));
              if (body.code === 'SANDBOX_LIMIT') {
                onSandboxLimit();
              }
              // Fall back to local generation
              generateLocal(description);
              setIsGenerating(false);
              return;
            }
            if (!resp.ok) {
              // Non-429 error — fall back to local
              generateLocal(description);
              setIsGenerating(false);
              return;
            }
            const data = await resp.json();
            if (data.positions && typeof data.positions === 'object') {
              const proposed = new Map<string, Position>();
              const affected: string[] = [];
              for (const [id, pos] of Object.entries(data.positions)) {
                const p = pos as { x: number; y: number };
                proposed.set(id, { x: p.x, y: p.y, rotation: 0 });
                affected.push(id);
              }
              if (affected.length > 0) {
                ghostPreview.setPreview({
                  id: `prompt-${Date.now()}`,
                  source: 'prompt',
                  sourceLabel: description.length > 30 ? description.slice(0, 27) + '...' : description,
                  proposedPositions: proposed,
                  affectedPerformerIds: affected,
                });
              } else {
                generateLocal(description);
              }
            } else {
              generateLocal(description);
            }
            setIsGenerating(false);
          })
          .catch(() => {
            // Network error — fall back to local generation
            generateLocal(description);
            setIsGenerating(false);
          });
        return;
      }

      // Non-sandbox: local-only generation
      setTimeout(() => {
        try {
          generateLocal(description);
          setIsGenerating(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Generation failed');
          setIsGenerating(false);
        }
      }, 100);
    },
    [prompt, performers, currentPositions, selectedPerformerIds, fieldConfig, ghostPreview, onSandboxLimit, generateLocal],
  );

  // Auto-submit when initialPrompt is provided (e.g. from ?prompt= query param)
  useEffect(() => {
    if (initialPrompt && performers.length > 0 && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      const timer = setTimeout(() => {
        handleGenerate(initialPrompt);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [initialPrompt, performers.length, handleGenerate]);

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      setPrompt(text);
      // Auto-submit after a brief delay so the user sees the text
      setTimeout(() => {
        handleGenerate(text);
      }, 200);
    },
    [handleGenerate],
  );

  // Save a command to history
  const saveToHistory = useCallback((text: string) => {
    setCommandHistory(prev => {
      const filtered = prev.filter(h => h !== text);
      const next = [text, ...filtered].slice(0, 50);
      try { localStorage.setItem('fluxstudio_prompt_history', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setHistoryIndex(-1);
  }, []);

  // Apply or reject pending tool call
  const handleToolCallDecision = useCallback((accept: boolean) => {
    if (!accept) {
      ghostPreview.clearPreview();
    }
    // If accepted, ghost preview accept flow handles position application
    setPendingToolCall(null);
  }, [ghostPreview]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Autocomplete navigation
      if (autocomplete.isVisible && autocomplete.suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          autocomplete.setActiveIndex(prev =>
            prev < autocomplete.suggestions.length - 1 ? prev + 1 : 0
          );
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          autocomplete.setActiveIndex(prev =>
            prev > 0 ? prev - 1 : autocomplete.suggestions.length - 1
          );
          return;
        }
        if ((e.key === 'Tab' || e.key === 'Enter') && autocomplete.activeIndex >= 0) {
          e.preventDefault();
          const selected = autocomplete.suggestions[autocomplete.activeIndex];
          setPrompt(selected);
          autocomplete.dismiss();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          autocomplete.dismiss();
          return;
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        autocomplete.dismiss();
        if (prompt.trim()) saveToHistory(prompt.trim());
        handleGenerate();
      }
      if (e.key === 'Escape') {
        if (pendingToolCall) {
          handleToolCallDecision(false);
        } else if (hasActivePreview) {
          ghostPreview.clearPreview();
        } else {
          setShowSuggestions(false);
          inputRef.current?.blur();
        }
      }
      // Command history navigation (only when autocomplete is not visible)
      if (e.key === 'ArrowUp' && commandHistory.length > 0) {
        e.preventDefault();
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setPrompt(commandHistory[newIndex]);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex <= 0) {
          setHistoryIndex(-1);
          setPrompt('');
        } else {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setPrompt(commandHistory[newIndex]);
        }
      }
    },
    [handleGenerate, hasActivePreview, ghostPreview, pendingToolCall, handleToolCallDecision, commandHistory, historyIndex, prompt, saveToHistory, autocomplete],
  );

  const handleSuggestionClick = useCallback(
    (suggestionPrompt: string) => {
      setPrompt(suggestionPrompt);
      setShowSuggestions(false);
      handleGenerate(suggestionPrompt);
    },
    [handleGenerate],
  );

  // Apply a formation template via ghost preview
  const handleTemplateClick = useCallback(
    (templateId: string) => {
      if (performers.length === 0) return;
      const template = FORMATION_TEMPLATES.find(t => t.id === templateId);
      if (!template) return;

      setShowSuggestions(false);
      const performerIds = performers.map(p => p.id);
      const proposedPositions = snapToTemplate(currentPositions, performerIds, template);

      ghostPreview.setPreview({
        id: `template-${templateId}-${Date.now()}`,
        source: 'prompt',
        sourceLabel: template.name,
        proposedPositions,
        affectedPerformerIds: performerIds,
      });
    },
    [performers, currentPositions, ghostPreview],
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (_e: MouseEvent) => {
      if (showSuggestions) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showSuggestions]);

  // Clear prompt when preview is accepted (preview cleared externally)
  useEffect(() => {
    if (!hasActivePreview && prompt.trim().length > 0 && !isGenerating) {
      // Preview was handled (accepted or rejected) — clear prompt
    }
  }, [hasActivePreview, prompt, isGenerating]);

  if (!isExpanded) {
    return (
      <div className={`flex justify-center ${className}`}>
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-md text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-blue-300 dark:hover:border-blue-600 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
          aria-label="Open formation prompt"
        >
          <Wand2 className="w-3 h-3 text-blue-500" aria-hidden="true" />
          Describe a formation...
          <ChevronUp className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Suggestion chips */}
      {showSuggestions && !hasActivePreview && (
        <div className="absolute bottom-full left-0 right-0 mb-2 mx-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1.5 px-1">
              Quick formations
            </p>
            <div className="flex flex-wrap gap-1">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.prompt}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSuggestionClick(suggestion.prompt);
                  }}
                  className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>

            {/* Template chips */}
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 mb-1.5 px-1">
              Snap to template
            </p>
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_CHIPS.map((template) => (
                <button
                  key={template.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTemplateClick(template.id);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-purple-500 outline-none"
                >
                  <svg width="14" height="14" viewBox="0 0 40 40" className="flex-shrink-0">
                    <path d={template.thumbnail} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="mx-4 mb-3">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-shadow">
          <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" aria-hidden="true" />

          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => {
              const val = e.target.value;
              setPrompt(val);
              autocomplete.fetchSuggestions(val);
            }}
            onFocus={() => !hasActivePreview && setShowSuggestions(true)}
            onBlur={() => {
              // Delay dismiss so click on autocomplete item can register
              setTimeout(() => autocomplete.dismiss(), 150);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              performers.length === 0
                ? 'Add performers first...'
                : 'Describe a formation: "spread trumpets in arc", "company front"...'
            }
            disabled={performers.length === 0 || isGenerating}
            className="flex-1 text-sm bg-transparent border-none outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 disabled:opacity-50"
            aria-label="Formation description"
            autoComplete="off"
            role="combobox"
            aria-expanded={autocomplete.isVisible}
            aria-activedescendant={autocomplete.activeIndex >= 0 ? `ac-option-${autocomplete.activeIndex}` : undefined}
          />

          {error && (
            <span className="text-[10px] text-red-500 flex-shrink-0 max-w-[120px] truncate">
              {error}
            </span>
          )}

          <div className="flex items-center gap-1 flex-shrink-0">
            <VoiceInputButton onTranscript={handleVoiceTranscript} />
            <button
              onClick={() => handleGenerate()}
              disabled={!canGenerate || isGenerating}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 outline-none transition-colors"
              aria-label="Generate formation"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>

            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
              aria-label="Minimize prompt bar"
            >
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* AI Autocomplete dropdown */}
        {autocomplete.isVisible && autocomplete.suggestions.length > 0 && (
          <div
            className="absolute left-4 right-4 bottom-full mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden"
            role="listbox"
            aria-label="Autocomplete suggestions"
          >
            {autocomplete.suggestions.map((suggestion, i) => (
              <button
                key={i}
                id={`ac-option-${i}`}
                role="option"
                aria-selected={i === autocomplete.activeIndex}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  i === autocomplete.activeIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur from firing before click
                  setPrompt(suggestion);
                  autocomplete.dismiss();
                  inputRef.current?.focus();
                }}
                onMouseEnter={() => autocomplete.setActiveIndex(i)}
              >
                <Sparkles className="w-3 h-3 inline-block mr-2 text-blue-400 opacity-60" aria-hidden="true" />
                {suggestion}
              </button>
            ))}
            <div className="px-3 py-1 text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">Tab</kbd> to accept
            </div>
          </div>
        )}

        {/* Pending tool call preview */}
        {pendingToolCall && (
          <div className="mt-2 mx-1 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-700 dark:text-amber-300 flex-1">
              AI wants to: {describeToolCall(pendingToolCall)}
            </span>
            <button
              onClick={() => handleToolCallDecision(true)}
              className="px-2 py-0.5 text-[10px] font-medium bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
            >
              Apply
            </button>
            <button
              onClick={() => handleToolCallDecision(false)}
              className="px-2 py-0.5 text-[10px] font-medium bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded transition-colors"
            >
              Reject
            </button>
          </div>
        )}

        {/* Keyboard shortcut hint */}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1">
          Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">Enter</kbd> to generate
          {hasActivePreview && (
            <> &middot; Preview on canvas &middot; <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">Esc</kbd> to dismiss</>
          )}
          {commandHistory.length > 0 && !hasActivePreview && (
            <> &middot; <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">&uarr;</kbd><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">&darr;</kbd> history</>
          )}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default FormationPromptBar;
