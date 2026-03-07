/**
 * GenerateSetsFromMusicDialog - Auto-generate drill sets from music analysis
 *
 * Phase 5: Auto-Set Generation from Music
 *
 * Modal dialog that analyzes MetMap song structure and suggests optimal
 * drill set placements. Supports both rule-based analysis and AI-enhanced
 * suggestions via SSE streaming.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Section } from '../../contexts/metmap/types';
import type { TempoMap } from '../../services/tempoMap';
import type { SetSuggestion } from '../../services/musicDrillMapper';
import type { Performer, Position } from '../../services/formationTypes';
import { suggestSetsFromMusic } from '../../services/musicDrillMapper';
import { streamSetSuggestions, streamShowGeneration } from '../../services/drillMusicAIService';
import {
  generateShowFromMusic,
  type GeneratedShowSet,
} from '../../services/drillAiService';

// ============================================================================
// TYPES
// ============================================================================

interface GenerateSetsFromMusicDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  tempoMap: TempoMap;
  songId?: string;
  /** Performers for AI formation generation */
  performers?: Performer[];
  onGenerate: (suggestions: SetSuggestion[]) => void;
  /** Called when AI generates full formations with positions */
  onGenerateFormations?: (sets: GeneratedShowSet[]) => void;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    border: '1px solid #333',
    width: 560,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
    color: '#e0e0e0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #333',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600 as const,
    margin: 0,
    color: '#fff',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: 18,
    padding: '4px 8px',
    borderRadius: 4,
    lineHeight: 1,
  },
  body: {
    padding: '16px 20px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600 as const,
    color: '#999',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 8,
    marginTop: 16,
  },
  structureList: {
    listStyle: 'none' as const,
    padding: 0,
    margin: '0 0 16px 0',
  },
  structureItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 6,
    backgroundColor: '#2a2a3a',
    marginBottom: 4,
    fontSize: 13,
  },
  structureName: {
    fontWeight: 500 as const,
    color: '#e0e0e0',
  },
  structureDetail: {
    color: '#888',
    fontSize: 12,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderTop: '1px solid #333',
    borderBottom: '1px solid #333',
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 13,
    color: '#ccc',
  },
  toggleSwitch: (active: boolean) => ({
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: active ? '#6366f1' : '#444',
    border: 'none',
    cursor: 'pointer',
    position: 'relative' as const,
    transition: 'background-color 0.2s',
  }),
  toggleKnob: (active: boolean) => ({
    position: 'absolute' as const,
    top: 2,
    left: active ? 20 : 2,
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: '#fff',
    transition: 'left 0.2s',
  }),
  streamingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 6,
    backgroundColor: '#2a2a3a',
    marginBottom: 12,
    fontSize: 13,
    color: '#a78bfa',
  },
  spinner: {
    width: 14,
    height: 14,
    border: '2px solid #6366f1',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
  suggestionList: {
    listStyle: 'none' as const,
    padding: 0,
    margin: 0,
  },
  suggestionItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 6,
    backgroundColor: '#2a2a3a',
    marginBottom: 4,
    fontSize: 13,
    cursor: 'pointer',
  },
  checkbox: {
    marginTop: 2,
    accentColor: '#6366f1',
    cursor: 'pointer',
    width: 16,
    height: 16,
    flexShrink: 0,
  },
  suggestionContent: {
    flex: 1,
    minWidth: 0,
  },
  suggestionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  suggestionCounts: {
    fontWeight: 500 as const,
    color: '#e0e0e0',
    fontSize: 13,
  },
  confidenceBadge: (confidence: number) => ({
    fontSize: 11,
    fontWeight: 500 as const,
    padding: '1px 6px',
    borderRadius: 10,
    backgroundColor: confidence >= 0.85
      ? 'rgba(16, 185, 129, 0.2)'
      : confidence >= 0.7
        ? 'rgba(245, 158, 11, 0.2)'
        : 'rgba(156, 163, 175, 0.2)',
    color: confidence >= 0.85
      ? '#34d399'
      : confidence >= 0.7
        ? '#fbbf24'
        : '#9ca3af',
  }),
  suggestionReason: {
    color: '#888',
    fontSize: 12,
    lineHeight: 1.3,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: '1px solid #333',
  },
  footerInfo: {
    fontSize: 12,
    color: '#888',
  },
  footerButtons: {
    display: 'flex',
    gap: 8,
  },
  cancelButton: {
    padding: '8px 16px',
    borderRadius: 6,
    border: '1px solid #444',
    backgroundColor: 'transparent',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500 as const,
  },
  generateButton: (disabled: boolean) => ({
    padding: '8px 16px',
    borderRadius: 6,
    border: 'none',
    backgroundColor: disabled ? '#444' : '#6366f1',
    color: disabled ? '#888' : '#fff',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: 13,
    fontWeight: 500 as const,
  }),
  emptyState: {
    textAlign: 'center' as const,
    padding: '32px 20px',
    color: '#888',
    fontSize: 13,
  },
  aiStreamText: {
    padding: '8px 12px',
    borderRadius: 6,
    backgroundColor: '#1a1a2e',
    border: '1px solid #333',
    fontSize: 12,
    color: '#a78bfa',
    maxHeight: 80,
    overflowY: 'auto' as const,
    marginBottom: 12,
    whiteSpace: 'pre-wrap' as const,
    lineHeight: 1.4,
  },
};

// Keyframe animation for spinner (injected once)
const SPINNER_STYLE_ID = 'generate-sets-spinner-style';
function ensureSpinnerAnimation() {
  if (document.getElementById(SPINNER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SPINNER_STYLE_ID;
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const GenerateSetsFromMusicDialog: React.FC<GenerateSetsFromMusicDialogProps> = ({
  isOpen,
  onClose,
  sections,
  tempoMap,
  songId,
  performers,
  onGenerate,
  onGenerateFormations,
}) => {
  // Tab: 'sets' = set boundaries, 'formations' = AI full formations
  const [activeTab, setActiveTab] = useState<'sets' | 'formations'>('sets');
  const [suggestions, setSuggestions] = useState<SetSuggestion[]>([]);
  const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set());
  const [useAI, setUseAI] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiStreamText, setAiStreamText] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // AI Formations state
  const [generatedSets, setGeneratedSets] = useState<GeneratedShowSet[]>([]);
  const [formationChecked, setFormationChecked] = useState<Set<number>>(new Set());
  const [formationStreaming, setFormationStreaming] = useState(false);
  const [formationStatus, setFormationStatus] = useState('');
  const [formationError, setFormationError] = useState<string | null>(null);
  const formationAbortRef = useRef<AbortController | null>(null);

  // Generate rule-based suggestions on mount / when sections change
  useEffect(() => {
    if (!isOpen) return;

    ensureSpinnerAnimation();

    const results = suggestSetsFromMusic(sections, tempoMap);
    setSuggestions(results);
    setCheckedIndices(new Set(results.map((_, i) => i)));
    setAiStreamText('');
    setAiError(null);
  }, [isOpen, sections, tempoMap]);

  // Cleanup AI stream on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      if (formationAbortRef.current) {
        formationAbortRef.current.abort();
        formationAbortRef.current = null;
      }
    };
  }, []);

  // Generate AI formations from music
  const handleGenerateFormations = useCallback(() => {
    if (!performers || performers.length === 0) {
      setFormationError('No performers available. Add performers before generating formations.');
      return;
    }

    setFormationStreaming(true);
    setFormationStatus('Analyzing music structure...');
    setFormationError(null);
    setGeneratedSets([]);
    setFormationChecked(new Set());

    const token = localStorage.getItem('token');

    if (songId && token) {
      // Use AI streaming endpoint
      formationAbortRef.current = streamShowGeneration(
        {
          songId,
          performers: performers.map((p) => ({
            id: p.id, name: p.name, section: p.section, instrument: p.instrument,
          })),
          sections: sections.map((s) => ({
            name: s.name, bars: s.bars, timeSignature: s.timeSignature,
            tempoStart: s.tempoStart, tempoEnd: s.tempoEnd,
          })),
          fieldType: 'ncaa_football',
          bandSize: performers.length,
        },
        token,
        {
          onStatus: (message: string) => {
            setFormationStatus(message);
          },
          onSet: (setData) => {
            const positions = new Map<string, Position>();
            for (const [id, pos] of Object.entries(setData.positions)) {
              positions.set(id, { x: pos.x, y: pos.y });
            }
            setGeneratedSets((prev) => {
              const next = [...prev, { ...setData, positions }];
              setFormationChecked(new Set(next.map((_, i) => i)));
              return next;
            });
          },
          onDone: () => {
            setFormationStreaming(false);
            setFormationStatus('');
          },
          onError: (err: Error) => {
            setFormationStreaming(false);
            setFormationStatus('');
            // Fallback to local generation
            const result = generateShowFromMusic({
              performers,
              sections: sections.map((s) => ({
                name: s.name, bars: s.bars, timeSignature: s.timeSignature,
                tempoStart: s.tempoStart, tempoEnd: s.tempoEnd,
              })),
            });
            setGeneratedSets(result.sets);
            setFormationChecked(new Set(result.sets.map((_, i) => i)));
            setFormationError(`AI unavailable (${err.message}). Using local generation instead.`);
          },
        },
      );
    } else {
      // No AI — use local generation
      const result = generateShowFromMusic({
        performers,
        sections: sections.map((s) => ({
          name: s.name, bars: s.bars, timeSignature: s.timeSignature,
          tempoStart: s.tempoStart, tempoEnd: s.tempoEnd,
        })),
      });
      setGeneratedSets(result.sets);
      setFormationChecked(new Set(result.sets.map((_, i) => i)));
      setFormationStreaming(false);
      setFormationStatus('');
    }
  }, [performers, songId, sections]);

  // Toggle formation set check
  const handleToggleFormation = useCallback((index: number) => {
    setFormationChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Apply generated formations
  const handleApplyFormations = useCallback(() => {
    const selected = generatedSets.filter((_, i) => formationChecked.has(i));
    if (selected.length > 0 && onGenerateFormations) {
      onGenerateFormations(selected);
    }
    onClose();
  }, [generatedSets, formationChecked, onGenerateFormations, onClose]);

  // Handle AI toggle
  const handleToggleAI = useCallback(() => {
    if (useAI) {
      // Turning off AI — revert to rule-based
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      setUseAI(false);
      setAiStreaming(false);
      setAiStreamText('');
      setAiError(null);

      const results = suggestSetsFromMusic(sections, tempoMap);
      setSuggestions(results);
      setCheckedIndices(new Set(results.map((_, i) => i)));
      return;
    }

    // Turning on AI
    if (!songId) {
      setAiError('No song linked — AI suggestions require a saved song.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setAiError('Authentication required for AI suggestions.');
      return;
    }

    setUseAI(true);
    setAiStreaming(true);
    setAiStreamText('');
    setAiError(null);

    abortRef.current = streamSetSuggestions(songId, token, {
      onChunk: (text: string) => {
        setAiStreamText((prev) => prev + text);
      },
      onDone: () => {
        setAiStreaming(false);
      },
      onError: (err: Error) => {
        setAiStreaming(false);
        setAiError(err.message);
      },
    });
  }, [useAI, songId, sections, tempoMap]);

  // Toggle individual suggestion
  const handleToggle = useCallback((index: number) => {
    setCheckedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Select / deselect all
  const handleSelectAll = useCallback(() => {
    if (checkedIndices.size === suggestions.length) {
      setCheckedIndices(new Set());
    } else {
      setCheckedIndices(new Set(suggestions.map((_, i) => i)));
    }
  }, [checkedIndices.size, suggestions.length]);

  // Generate sets from checked suggestions
  const handleGenerate = useCallback(() => {
    const selected = suggestions.filter((_, i) => checkedIndices.has(i));
    if (selected.length > 0) {
      onGenerate(selected);
    }
    onClose();
  }, [suggestions, checkedIndices, onGenerate, onClose]);

  const checkedCount = checkedIndices.size;
  const hasSelections = checkedCount > 0;

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.headerTitle}>Generate Sets from Music</h3>
          <button
            style={styles.closeButton}
            onClick={onClose}
            title="Close"
          >
            x
          </button>
        </div>

        {/* Tab Switcher */}
        {performers && performers.length > 0 && onGenerateFormations && (
          <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
            <button
              onClick={() => setActiveTab('sets')}
              style={{
                flex: 1, padding: '10px 16px', border: 'none', cursor: 'pointer',
                backgroundColor: activeTab === 'sets' ? '#2a2a3a' : 'transparent',
                color: activeTab === 'sets' ? '#fff' : '#888',
                borderBottom: activeTab === 'sets' ? '2px solid #6366f1' : '2px solid transparent',
                fontSize: 13, fontWeight: 500,
              }}
            >
              Set Boundaries
            </button>
            <button
              onClick={() => setActiveTab('formations')}
              style={{
                flex: 1, padding: '10px 16px', border: 'none', cursor: 'pointer',
                backgroundColor: activeTab === 'formations' ? '#2a2a3a' : 'transparent',
                color: activeTab === 'formations' ? '#fff' : '#888',
                borderBottom: activeTab === 'formations' ? '2px solid #6366f1' : '2px solid transparent',
                fontSize: 13, fontWeight: 500,
              }}
            >
              AI Formations
            </button>
          </div>
        )}

        {/* Body */}
        <div style={styles.body}>
          {/* Song Structure (shared between tabs) */}
          <div style={{ ...styles.sectionLabel, marginTop: 0 }}>Song Structure</div>
          {sections.length === 0 ? (
            <div style={styles.emptyState}>
              No sections defined. Add sections in MetMap first.
            </div>
          ) : (
            <ul style={styles.structureList}>
              {sections
                .slice()
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((section, i) => (
                  <li key={section.id || i} style={styles.structureItem}>
                    <span style={styles.structureName}>{section.name}</span>
                    <span style={styles.structureDetail}>
                      {section.bars} bars | {section.timeSignature} | {section.tempoStart}
                      {section.tempoEnd && section.tempoEnd !== section.tempoStart
                        ? `-${section.tempoEnd}`
                        : ''
                      } BPM
                    </span>
                  </li>
                ))}
            </ul>
          )}

          {activeTab === 'sets' ? (
            <>
              {/* AI Toggle */}
              <div style={styles.toggleRow}>
                <span style={styles.toggleLabel}>Use AI for smarter suggestions</span>
                <button
                  style={styles.toggleSwitch(useAI)}
                  onClick={handleToggleAI}
                  title={useAI ? 'Disable AI' : 'Enable AI'}
                >
                  <div style={styles.toggleKnob(useAI)} />
                </button>
              </div>

              {/* AI Streaming Indicator */}
              {aiStreaming && (
                <div style={styles.streamingIndicator}>
                  <div style={styles.spinner} />
                  <span>AI is analyzing your music...</span>
                </div>
              )}

              {/* AI Stream Text */}
              {useAI && aiStreamText && (
                <div style={styles.aiStreamText}>{aiStreamText}</div>
              )}

              {/* AI Error */}
              {aiError && (
                <div style={{ ...styles.streamingIndicator, color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                  {aiError}
                </div>
              )}

              {/* Suggestions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={styles.sectionLabel}>
                  Suggested Sets ({suggestions.length})
                </div>
                {suggestions.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    style={{
                      background: 'none', border: 'none', color: '#6366f1',
                      cursor: 'pointer', fontSize: 12, padding: '2px 4px',
                    }}
                  >
                    {checkedIndices.size === suggestions.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {suggestions.length === 0 && !aiStreaming ? (
                <div style={styles.emptyState}>
                  No suggestions available. Ensure your song has sections defined.
                </div>
              ) : (
                <ul style={styles.suggestionList}>
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={`${suggestion.startCount}-${suggestion.endCount}`}
                      style={styles.suggestionItem}
                      onClick={() => handleToggle(index)}
                    >
                      <input
                        type="checkbox"
                        checked={checkedIndices.has(index)}
                        onChange={() => handleToggle(index)}
                        style={styles.checkbox}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div style={styles.suggestionContent}>
                        <div style={styles.suggestionHeader}>
                          <span style={styles.suggestionCounts}>
                            Counts {suggestion.startCount}–{suggestion.endCount} ({suggestion.counts} counts)
                          </span>
                          <span style={styles.confidenceBadge(suggestion.confidence)}>
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                        <div style={styles.suggestionReason}>
                          {suggestion.reason}
                          {suggestion.sectionName && suggestion.reason.indexOf(suggestion.sectionName) === -1
                            ? ` — ${suggestion.sectionName}`
                            : ''
                          }
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              {/* AI Formations Tab */}
              <div style={{ ...styles.sectionLabel }}>AI Formation Generation</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                Generate complete formations with performer positions based on your music structure.
                {performers && ` (${performers.length} performers)`}
              </div>

              {generatedSets.length === 0 && !formationStreaming && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <button
                    onClick={handleGenerateFormations}
                    style={{
                      padding: '12px 24px', borderRadius: 8, border: 'none',
                      backgroundColor: '#6366f1', color: '#fff', cursor: 'pointer',
                      fontSize: 14, fontWeight: 600,
                    }}
                  >
                    Generate Formations
                  </button>
                </div>
              )}

              {/* Streaming status */}
              {formationStreaming && (
                <div style={styles.streamingIndicator}>
                  <div style={styles.spinner} />
                  <span>{formationStatus || 'Generating formations...'}</span>
                </div>
              )}

              {/* Formation error */}
              {formationError && (
                <div style={{ ...styles.streamingIndicator, color: '#fbbf24', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                  {formationError}
                </div>
              )}

              {/* Generated formations list */}
              {generatedSets.length > 0 && (
                <ul style={styles.suggestionList}>
                  {generatedSets.map((set, index) => (
                    <li
                      key={`formation-${index}`}
                      style={styles.suggestionItem}
                      onClick={() => handleToggleFormation(index)}
                    >
                      <input
                        type="checkbox"
                        checked={formationChecked.has(index)}
                        onChange={() => handleToggleFormation(index)}
                        style={styles.checkbox}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div style={styles.suggestionContent}>
                        <div style={styles.suggestionHeader}>
                          <span style={styles.suggestionCounts}>
                            {set.name} ({set.counts} counts)
                          </span>
                          {set.sectionName && (
                            <span style={{ fontSize: 11, color: '#a78bfa', padding: '1px 6px', borderRadius: 10, backgroundColor: 'rgba(99, 102, 241, 0.2)' }}>
                              {set.sectionName}
                            </span>
                          )}
                        </div>
                        {set.notes && (
                          <div style={styles.suggestionReason}>{set.notes}</div>
                        )}
                        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                          {set.positions.size} performer positions
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={styles.footerInfo}>
            {activeTab === 'sets'
              ? `${checkedCount} of ${suggestions.length} sets selected`
              : `${formationChecked.size} of ${generatedSets.length} formations selected`
            }
          </span>
          <div style={styles.footerButtons}>
            <button style={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            {activeTab === 'sets' ? (
              <button
                style={styles.generateButton(!hasSelections || aiStreaming)}
                onClick={handleGenerate}
                disabled={!hasSelections || aiStreaming}
              >
                Generate Sets
              </button>
            ) : (
              <button
                style={styles.generateButton(formationChecked.size === 0 || formationStreaming)}
                onClick={handleApplyFormations}
                disabled={formationChecked.size === 0 || formationStreaming}
              >
                Apply Formations
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateSetsFromMusicDialog;
