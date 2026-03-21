/**
 * GenerateFromMusicPanel - Enhanced AI formation generation from music analysis
 *
 * Extends the existing GenerateSetsFromMusicDialog with:
 * - Music selection -> AI-suggested set boundaries -> AI generates positions (streaming)
 * - Ghost preview for progressive position generation
 * - "Generate from Music" button for the formation toolbar
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Music, Loader2, Sparkles, Play, Square, Check } from 'lucide-react';
import type { Section } from '../../contexts/metmap/types';
import type { TempoMap } from '../../services/tempoMap';
import type { Performer, Position } from '../../services/formationTypes';
import type { SetSuggestion } from '../../services/musicDrillMapper';
import { suggestSetsFromMusic } from '../../services/musicDrillMapper';
import { useGhostPreview } from '../../store/slices/ghostPreviewSlice';
import { buildApiUrl } from '../../config/environment';

// ============================================================================
// Types
// ============================================================================

interface GenerateFromMusicPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  tempoMap: TempoMap;
  songId?: string;
  performers: Performer[];
  onGenerateFormations?: (sets: GeneratedSet[]) => void;
}

interface GeneratedSet {
  name: string;
  counts: number;
  sectionName?: string;
  positions: Map<string, Position>;
  notes?: string;
}

type Phase = 'select' | 'boundaries' | 'generating' | 'preview';

// ============================================================================
// Main Component
// ============================================================================

export function GenerateFromMusicPanel({
  isOpen,
  onClose,
  sections,
  tempoMap,
  songId: _songId,
  performers,
  onGenerateFormations,
}: GenerateFromMusicPanelProps) {
  const [phase, setPhase] = useState<Phase>('select');
  const [setBoundaries, setBoundaryList] = useState<SetSuggestion[]>([]);
  const [checkedBoundaries, setCheckedBoundaries] = useState<Set<number>>(new Set());
  const [generatedSets, setGeneratedSets] = useState<GeneratedSet[]>([]);
  const [streamingStatus, setStreamingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const ghostPreview = useGhostPreview();

  // Reset state when panel opens
  useEffect(() => {
    if (isOpen) {
      setPhase('select');
      setError(null);
      setGeneratedSets([]);

      // Auto-suggest boundaries from music
      const suggestions = suggestSetsFromMusic(sections, tempoMap);
      setBoundaryList(suggestions);
      setCheckedBoundaries(new Set(suggestions.map((_, i) => i)));
    }
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [isOpen, sections, tempoMap]);

  // Move to boundary review
  const handleReviewBoundaries = useCallback(() => {
    setPhase('boundaries');
  }, []);

  // Toggle boundary selection
  const handleToggleBoundary = useCallback((index: number) => {
    setCheckedBoundaries(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Start AI generation via SSE streaming
  const handleGenerate = useCallback(async () => {
    if (performers.length === 0) {
      setError('No performers. Add performers before generating.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required for AI generation.');
      return;
    }

    setPhase('generating');
    setStreamingStatus('Connecting to AI...');
    setError(null);
    setGeneratedSets([]);

    const selectedBoundaries = setBoundaries.filter((_, i) => checkedBoundaries.has(i));
    const musicAnalysis = {
      sections: selectedBoundaries.map(b => ({
        startCount: b.startCount,
        endCount: b.endCount,
        counts: b.counts,
        sectionName: b.sectionName,
        reason: b.reason,
      })),
      totalSections: sections.length,
      tempoRange: sections.length > 0 ? {
        min: Math.min(...sections.map(s => s.tempoStart)),
        max: Math.max(...sections.map(s => Math.max(s.tempoStart, s.tempoEnd || s.tempoStart))),
      } : null,
    };

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch(buildApiUrl('/ai/drill/generate-show'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          performers: performers.map(p => ({
            id: p.id,
            name: p.name,
            section: p.section,
            instrument: p.instrument,
          })),
          sections: sections.map(s => ({
            name: s.name,
            bars: s.bars,
            timeSignature: s.timeSignature,
            tempoStart: s.tempoStart,
            tempoEnd: s.tempoEnd,
          })),
          fieldType: 'ncaa_football',
          defaultCounts: 8,
          musicAnalysis,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

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
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === 'start') {
              setStreamingStatus('AI is designing formations...');
            } else if (event.type === 'set') {
              const setData = event.data;
              const positions = new Map<string, Position>();
              if (setData.positions) {
                for (const [id, pos] of Object.entries(setData.positions)) {
                  const p = pos as { x: number; y: number };
                  positions.set(id, { x: p.x, y: p.y });
                }
              }

              const newSet: GeneratedSet = {
                name: setData.name,
                counts: setData.counts,
                sectionName: setData.sectionName,
                positions,
              };

              setGeneratedSets(prev => [...prev, newSet]);
              setStreamingStatus(`Generated ${setData.name}...`);

              // Show latest set as ghost preview
              if (positions.size > 0) {
                ghostPreview.setPreview({
                  id: `music-gen-${Date.now()}`,
                  source: 'prompt',
                  sourceLabel: `${setData.name} (from music)`,
                  proposedPositions: positions,
                  affectedPerformerIds: Array.from(positions.keys()),
                });
              }
            } else if (event.type === 'done' || event.type === 'complete') {
              setPhase('preview');
              setStreamingStatus('');
            } else if (event.type === 'error') {
              setError(event.error || 'Generation failed');
              setPhase('boundaries');
            }
          } catch {
            // Incomplete JSON, continue
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message || 'Generation failed');
      setPhase('boundaries');
    }
  }, [performers, sections, setBoundaries, checkedBoundaries, ghostPreview]);

  // Apply all generated formations
  const handleApply = useCallback(() => {
    if (generatedSets.length > 0 && onGenerateFormations) {
      onGenerateFormations(generatedSets);
    }
    onClose();
  }, [generatedSets, onGenerateFormations, onClose]);

  // Cancel streaming
  const handleCancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (generatedSets.length > 0) {
      setPhase('preview');
    } else {
      setPhase('boundaries');
    }
    setStreamingStatus('');
  }, [generatedSets]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-[#1e1e2e] text-gray-200 rounded-xl border border-gray-700 shadow-2xl w-[520px] max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Generate from Music</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-lg px-2"
          >
            x
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Phase: Select */}
          {phase === 'select' && (
            <>
              <p className="text-xs text-gray-400">
                AI will analyze your music structure and generate formations that match the energy,
                phrasing, and tempo of each section. ({performers.length} performers)
              </p>

              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Song Sections ({sections.length})
              </div>
              {sections.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  No sections defined. Link a MetMap song first.
                </p>
              ) : (
                <ul className="space-y-1">
                  {sections.sort((a, b) => a.orderIndex - b.orderIndex).map((s, i) => (
                    <li key={s.id || i} className="flex justify-between items-center px-3 py-1.5 bg-[#2a2a3a] rounded text-xs">
                      <span className="text-gray-200 font-medium">{s.name}</span>
                      <span className="text-gray-500">
                        {s.bars} bars | {s.timeSignature} | {s.tempoStart} BPM
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={handleReviewBoundaries}
                disabled={sections.length === 0}
                className="w-full py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                Review Set Boundaries
              </button>
            </>
          )}

          {/* Phase: Boundaries */}
          {phase === 'boundaries' && (
            <>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Suggested Set Boundaries ({setBoundaries.length})
              </div>
              <ul className="space-y-1">
                {setBoundaries.map((b, i) => (
                  <li
                    key={`${b.startCount}-${b.endCount}`}
                    className="flex items-start gap-2 px-3 py-2 bg-[#2a2a3a] rounded text-xs cursor-pointer hover:bg-[#333]"
                    onClick={() => handleToggleBoundary(i)}
                  >
                    <input
                      type="checkbox"
                      checked={checkedBoundaries.has(i)}
                      onChange={() => handleToggleBoundary(i)}
                      className="mt-0.5 accent-indigo-500"
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="text-gray-200">
                          Counts {b.startCount}--{b.endCount} ({b.counts} counts)
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                          b.confidence >= 0.85 ? 'bg-green-900/30 text-green-400'
                          : b.confidence >= 0.7 ? 'bg-yellow-900/30 text-yellow-400'
                          : 'bg-gray-700 text-gray-400'
                        }`}>
                          {Math.round(b.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-gray-500 mt-0.5">{b.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>

              {error && (
                <div className="px-3 py-2 bg-red-900/20 border border-red-800 rounded text-xs text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={checkedBoundaries.size === 0}
                className="w-full py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
              >
                <Play className="w-3.5 h-3.5 inline mr-1" />
                Generate Formations ({checkedBoundaries.size} sets)
              </button>
            </>
          )}

          {/* Phase: Generating */}
          {phase === 'generating' && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-900/20 rounded-lg text-xs text-indigo-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                <span>{streamingStatus || 'Generating...'}</span>
              </div>

              {generatedSets.length > 0 && (
                <div className="text-xs text-gray-500">
                  {generatedSets.length} set(s) generated so far
                </div>
              )}

              <ul className="space-y-1">
                {generatedSets.map((set, i) => (
                  <li key={i} className="flex justify-between items-center px-3 py-1.5 bg-[#2a2a3a] rounded text-xs">
                    <span className="text-gray-200">{set.name}</span>
                    <span className="text-gray-500">{set.counts} counts | {set.positions.size} positions</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={handleCancel}
                className="w-full py-2 rounded-lg border border-gray-600 bg-transparent text-gray-400 hover:text-white text-xs font-medium transition-colors"
              >
                <Square className="w-3 h-3 inline mr-1" />
                Stop Generation
              </button>
            </>
          )}

          {/* Phase: Preview */}
          {phase === 'preview' && (
            <>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Generated Formations ({generatedSets.length})
              </div>
              <ul className="space-y-1">
                {generatedSets.map((set, i) => (
                  <li key={i} className="flex justify-between items-center px-3 py-2 bg-[#2a2a3a] rounded text-xs">
                    <div>
                      <span className="text-gray-200 font-medium">{set.name}</span>
                      {set.sectionName && (
                        <span className="ml-2 px-1.5 py-0.5 bg-indigo-900/30 text-indigo-300 rounded-full text-[10px]">
                          {set.sectionName}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500">{set.counts} counts | {set.positions.size} positions</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Footer */}
        {phase === 'preview' && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-700">
            <span className="text-xs text-gray-500">
              {generatedSets.length} formation(s) ready
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg border border-gray-600 text-gray-400 text-xs font-medium hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={generatedSets.length === 0}
                className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-600 text-white text-xs font-medium transition-colors"
              >
                <Check className="w-3 h-3 inline mr-1" />
                Apply All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GenerateFromMusicPanel;
