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
} from 'lucide-react';
import type { Performer, Position, FieldConfig } from '@/services/formationTypes';
import { parsePrompt } from '@/services/promptParser';
import { executePromptCommand } from '@/services/promptExecutor';
import { useGhostPreview } from '@/store/slices/ghostPreviewSlice';
import { VoiceInputButton } from './VoiceInputButton';
import { FORMATION_TEMPLATES, snapToTemplate } from '@/services/formationTemplates';

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
// Main Component
// ============================================================================

export function FormationPromptBar({
  performers,
  currentPositions,
  selectedPerformerIds,
  onApplyPositions: _onApplyPositions,
  fieldConfig,
  className = '',
}: FormationPromptBarProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const ghostPreview = useGhostPreview();

  const hasActivePreview = ghostPreview.activePreview !== null;
  const canGenerate = prompt.trim().length > 0 && performers.length > 0;

  const handleGenerate = useCallback(
    (text?: string) => {
      const description = (text ?? prompt).trim();
      if (!description || performers.length === 0) return;

      setIsGenerating(true);
      setError(null);
      setShowSuggestions(false);

      // Use setTimeout for UI responsiveness (generation is synchronous)
      setTimeout(() => {
        try {
          // Parse natural language into structured command
          const command = parsePrompt(description, selectedPerformerIds);

          // Execute command to get proposed positions
          const result = executePromptCommand(
            command,
            performers,
            currentPositions,
            fieldConfig,
          );

          if (result.affectedPerformerIds.length > 0) {
            // Route through ghost preview instead of applying directly
            ghostPreview.setPreview({
              id: `prompt-${Date.now()}`,
              source: 'prompt',
              sourceLabel: description.length > 30
                ? description.slice(0, 27) + '...'
                : description,
              proposedPositions: result.proposedPositions,
              affectedPerformerIds: result.affectedPerformerIds,
            });
          } else {
            setError('No performers matched');
          }
          setIsGenerating(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Generation failed');
          setIsGenerating(false);
        }
      }, 100);
    },
    [prompt, performers, currentPositions, selectedPerformerIds, fieldConfig, ghostPreview],
  );

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
      if (e.key === 'Escape') {
        if (hasActivePreview) {
          ghostPreview.clearPreview();
        } else {
          setShowSuggestions(false);
          inputRef.current?.blur();
        }
      }
    },
    [handleGenerate, hasActivePreview, ghostPreview],
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
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => !hasActivePreview && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              performers.length === 0
                ? 'Add performers first...'
                : 'Describe a formation: "spread trumpets in arc", "company front"...'
            }
            disabled={performers.length === 0 || isGenerating}
            className="flex-1 text-sm bg-transparent border-none outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 disabled:opacity-50"
            aria-label="Formation description"
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

        {/* Keyboard shortcut hint */}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1">
          Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">Enter</kbd> to generate
          {hasActivePreview && (
            <> &middot; Preview on canvas &middot; <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">Esc</kbd> to dismiss</>
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
