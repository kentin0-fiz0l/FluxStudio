/**
 * FormationPromptBar Component
 *
 * Natural language formation creation bar at the bottom of the canvas.
 * Users type descriptions like "company front at the 40 yard line" and
 * the system generates positions using the local heuristic engine.
 * Shows a preview before applying.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Check,
  X,
  Eye,
  Wand2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { Performer, Position, FieldConfig } from '@/services/formationTypes';
import { generateFormationFromDescription } from '@/services/drillAiService';

// ============================================================================
// Types
// ============================================================================

interface FormationPromptBarProps {
  /** Current performers */
  performers: Performer[];
  /** Apply generated positions to the canvas */
  onApplyPositions: (positions: Map<string, Position>) => void;
  /** Field configuration for context-aware generation */
  fieldConfig?: FieldConfig;
  /** Optional class name */
  className?: string;
}

interface PreviewState {
  positions: Map<string, Position>;
  description: string;
  setName: string;
}

// ============================================================================
// Suggestions
// ============================================================================

const SUGGESTIONS = [
  { label: 'Company front', prompt: 'company front' },
  { label: 'Block', prompt: 'block formation' },
  { label: 'Circle', prompt: 'circle' },
  { label: 'Scatter', prompt: 'scatter' },
  { label: 'Diagonal', prompt: 'diagonal line' },
  { label: 'Wedge', prompt: 'wedge formation' },
] as const;

// ============================================================================
// Preview Overlay
// ============================================================================

interface PreviewOverlayProps {
  preview: PreviewState;
  performers: Performer[];
  onApply: () => void;
  onDismiss: () => void;
}

function PreviewOverlay({ preview, performers, onApply, onDismiss }: PreviewOverlayProps) {
  const performerLookup = useMemo(() => {
    const map = new Map<string, Performer>();
    for (const p of performers) {
      map.set(p.id, p);
    }
    return map;
  }, [performers]);

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 mx-4">
      <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-xl shadow-xl overflow-hidden">
        {/* Preview header */}
        <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Preview: {preview.setName}
            </span>
          </div>
          <span className="text-[10px] text-blue-500 dark:text-blue-400">
            {preview.positions.size} performers
          </span>
        </div>

        {/* Mini position preview */}
        <div className="relative h-32 mx-3 my-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {Array.from(preview.positions.entries()).map(([performerId, pos]) => {
            const performer = performerLookup.get(performerId);
            return (
              <div
                key={performerId}
                className="absolute w-2.5 h-2.5 rounded-full border border-white dark:border-gray-800 shadow-sm transition-all duration-300"
                style={{
                  backgroundColor: performer?.color ?? '#6b7280',
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                title={performer?.label ?? performerId}
              />
            );
          })}
          {/* Grid lines for reference */}
          <div className="absolute inset-0 pointer-events-none">
            {[25, 50, 75].map((pct) => (
              <React.Fragment key={pct}>
                <div
                  className="absolute top-0 bottom-0 border-l border-gray-200 dark:border-gray-700 opacity-30"
                  style={{ left: `${pct}%` }}
                />
                <div
                  className="absolute left-0 right-0 border-t border-gray-200 dark:border-gray-700 opacity-30"
                  style={{ top: `${pct}%` }}
                />
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Description */}
        <p className="px-3 text-[10px] text-gray-400 dark:text-gray-500 mb-2">
          {preview.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-3 pb-3">
          <button
            onClick={onDismiss}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none transition-colors"
          >
            <X className="w-3 h-3" aria-hidden="true" />
            Discard
          </button>
          <button
            onClick={onApply}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 outline-none transition-colors"
          >
            <Check className="w-3 h-3" aria-hidden="true" />
            Apply Formation
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function FormationPromptBar({
  performers,
  onApplyPositions,
  fieldConfig,
  className = '',
}: FormationPromptBarProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

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
          const result = generateFormationFromDescription({
            description,
            performers,
            fieldConfig,
          });

          if (result.sets.length > 0) {
            const firstSet = result.sets[0];
            setPreview({
              positions: firstSet.positions,
              description: result.description,
              setName: firstSet.name,
            });
          }
          setIsGenerating(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Generation failed');
          setIsGenerating(false);
        }
      }, 100);
    },
    [prompt, performers, fieldConfig],
  );

  const handleApply = useCallback(() => {
    if (!preview) return;
    onApplyPositions(preview.positions);
    setPreview(null);
    setPrompt('');
  }, [preview, onApplyPositions]);

  const handleDismiss = useCallback(() => {
    setPreview(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleGenerate();
      }
      if (e.key === 'Escape') {
        if (preview) {
          handleDismiss();
        } else {
          setShowSuggestions(false);
          inputRef.current?.blur();
        }
      }
    },
    [handleGenerate, preview, handleDismiss],
  );

  const handleSuggestionClick = useCallback(
    (suggestionPrompt: string) => {
      setPrompt(suggestionPrompt);
      setShowSuggestions(false);
      handleGenerate(suggestionPrompt);
    },
    [handleGenerate],
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (_e: MouseEvent) => {
      if (showSuggestions) {
        setShowSuggestions(false);
      }
    };
    // Delayed to prevent closing immediately on the trigger click
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
      {/* Preview overlay */}
      {preview && (
        <PreviewOverlay
          preview={preview}
          performers={performers}
          onApply={handleApply}
          onDismiss={handleDismiss}
        />
      )}

      {/* Suggestion chips */}
      {showSuggestions && !preview && (
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
            onFocus={() => !preview && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              performers.length === 0
                ? 'Add performers first...'
                : 'Describe a formation: "company front", "circle", "scatter"...'
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
          {preview && (
            <> &middot; <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">Esc</kbd> to dismiss preview</>
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
