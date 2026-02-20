/**
 * MetMapAIPanel — AI Creative Co-Pilot sidebar panel.
 *
 * Sprint 34: Three tabs — Analyze, Chords, Practice.
 * Streams AI responses via SSE and displays with markdown-style formatting.
 * Chord suggestions include an Apply button to insert parsed chords into the timeline.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, Music, BarChart3, Square, X, ChevronDown, Loader2 } from 'lucide-react';
import {
  streamSongAnalysis,
  streamChordSuggestions,
  streamPracticeInsights,
  parseChordGridsFromResponse,
  type ParsedChordGrid,
} from '../../services/metmapAIService';
import type { Section, Chord } from '../../contexts/metmap/types';

type AITab = 'analyze' | 'chords' | 'practice';
type AnalysisFocus = 'structure' | 'harmony' | 'arrangement' | 'all';

interface MetMapAIPanelProps {
  songId: string;
  token: string;
  sections: Section[];
  onClose: () => void;
  onApplyChords: (sectionIndex: number, chords: Chord[]) => void;
}

export const MetMapAIPanel = React.memo(function MetMapAIPanel({
  songId,
  token,
  sections,
  onClose,
  onApplyChords,
}: MetMapAIPanelProps) {
  const [activeTab, setActiveTab] = useState<AITab>('analyze');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Analysis options
  const [analysisFocus, setAnalysisFocus] = useState<AnalysisFocus>('all');

  // Chord options
  const [chordSectionIndex, setChordSectionIndex] = useState(0);
  const [chordStyle, setChordStyle] = useState('');
  const [chordRequest, setChordRequest] = useState('');
  const [parsedGrids, setParsedGrids] = useState<ParsedChordGrid[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current && isStreaming) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [streamedText, isStreaming]);

  // Parse chord grids when streaming finishes on chord tab
  useEffect(() => {
    if (!isStreaming && activeTab === 'chords' && streamedText) {
      const grids = parseChordGridsFromResponse(streamedText);
      setParsedGrids(grids);
    }
  }, [isStreaming, activeTab, streamedText]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const startStream = useCallback((controller: AbortController) => {
    abortRef.current?.abort();
    abortRef.current = controller;
    setIsStreaming(true);
    setStreamedText('');
    setError(null);
    setParsedGrids([]);
  }, []);

  const streamCallbacks = useCallback(() => ({
    onChunk: (text: string) => setStreamedText(prev => prev + text),
    onDone: () => setIsStreaming(false),
    onError: (err: Error) => {
      setError(err.message);
      setIsStreaming(false);
    },
  }), []);

  const handleAnalyze = useCallback(() => {
    const controller = streamSongAnalysis(songId, token, analysisFocus, streamCallbacks());
    startStream(controller);
  }, [songId, token, analysisFocus, streamCallbacks, startStream]);

  const handleSuggestChords = useCallback(() => {
    const section = sections[chordSectionIndex];
    const controller = streamChordSuggestions(
      songId,
      section?.id,
      token,
      { style: chordStyle || undefined, request: chordRequest || undefined },
      streamCallbacks()
    );
    startStream(controller);
  }, [songId, token, sections, chordSectionIndex, chordStyle, chordRequest, streamCallbacks, startStream]);

  const handlePracticeInsights = useCallback(() => {
    const controller = streamPracticeInsights(songId, token, streamCallbacks());
    startStream(controller);
  }, [songId, token, streamCallbacks, startStream]);

  const handleApplyGrid = useCallback((grid: ParsedChordGrid) => {
    const chords: Chord[] = grid.chords.map(c => ({
      bar: c.bar,
      beat: c.beat,
      symbol: c.symbol,
      durationBeats: c.durationBeats,
    }));
    onApplyChords(chordSectionIndex, chords);
  }, [chordSectionIndex, onApplyChords]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const tabs: { key: AITab; label: string; icon: React.ReactNode }[] = [
    { key: 'analyze', label: 'Analyze', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { key: 'chords', label: 'Chords', icon: <Music className="w-3.5 h-3.5" /> },
    { key: 'practice', label: 'Practice', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-80 border-l border-neutral-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-neutral-200 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-medium text-neutral-800">AI Co-Pilot</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
          aria-label="Close AI panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { if (!isStreaming) setActiveTab(tab.key); }}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-violet-700 border-b-2 border-violet-600 bg-violet-50/50'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab-specific controls */}
      <div className="px-3 py-2 border-b border-neutral-100 space-y-2">
        {activeTab === 'analyze' && (
          <>
            <label className="block text-[10px] font-medium text-neutral-500 uppercase">Focus</label>
            <div className="relative">
              <select
                value={analysisFocus}
                onChange={(e) => setAnalysisFocus(e.target.value as AnalysisFocus)}
                disabled={isStreaming}
                className="w-full px-2 py-1.5 text-xs border border-neutral-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 appearance-none pr-6"
              >
                <option value="all">Comprehensive</option>
                <option value="structure">Structure & Form</option>
                <option value="harmony">Harmony & Chords</option>
                <option value="arrangement">Arrangement & Dynamics</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isStreaming}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {isStreaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Analyze Song
            </button>
          </>
        )}

        {activeTab === 'chords' && (
          <>
            <label className="block text-[10px] font-medium text-neutral-500 uppercase">Section</label>
            <div className="relative">
              <select
                value={chordSectionIndex}
                onChange={(e) => setChordSectionIndex(Number(e.target.value))}
                disabled={isStreaming}
                className="w-full px-2 py-1.5 text-xs border border-neutral-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 appearance-none pr-6"
              >
                {sections.map((s, i) => (
                  <option key={s.id || i} value={i}>
                    {s.name} ({s.bars} bars)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
            <input
              type="text"
              value={chordStyle}
              onChange={(e) => setChordStyle(e.target.value)}
              placeholder="Style (e.g. jazz, bossa nova)"
              disabled={isStreaming}
              className="w-full px-2 py-1.5 text-xs border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <input
              type="text"
              value={chordRequest}
              onChange={(e) => setChordRequest(e.target.value)}
              placeholder="Request (e.g. add a ii-V-I turnaround)"
              disabled={isStreaming}
              className="w-full px-2 py-1.5 text-xs border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <button
              onClick={handleSuggestChords}
              disabled={isStreaming || sections.length === 0}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {isStreaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Music className="w-3 h-3" />}
              Suggest Chords
            </button>
          </>
        )}

        {activeTab === 'practice' && (
          <button
            onClick={handlePracticeInsights}
            disabled={isStreaming}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {isStreaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3 h-3" />}
            Get Practice Insights
          </button>
        )}
      </div>

      {/* Streaming output */}
      <div ref={outputRef} className="flex-1 overflow-y-auto px-3 py-2">
        {isStreaming && (
          <div className="flex items-center justify-end mb-2">
            <button
              onClick={handleStop}
              className="flex items-center gap-1 px-2 py-1 text-[10px] bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
            >
              <Square className="w-2.5 h-2.5" />
              Stop
            </button>
          </div>
        )}

        {error && (
          <div className="p-2 mb-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}

        {streamedText ? (
          <div className="prose-sm">
            <AIMarkdown text={streamedText} />
          </div>
        ) : !isStreaming && !error ? (
          <div className="text-xs text-neutral-400 text-center py-8">
            {activeTab === 'analyze' && 'Analyze your song structure, harmony, and arrangement.'}
            {activeTab === 'chords' && 'Get AI-powered chord suggestions for any section.'}
            {activeTab === 'practice' && 'Get personalized practice coaching based on your history.'}
          </div>
        ) : null}

        {/* Parsed chord grids with Apply buttons (T4) */}
        {!isStreaming && parsedGrids.length > 0 && activeTab === 'chords' && (
          <div className="mt-3 space-y-2 border-t border-neutral-200 pt-3">
            <span className="text-[10px] font-medium text-neutral-500 uppercase">Apply to Timeline</span>
            {parsedGrids.map((grid, i) => (
              <div key={i} className="p-2 bg-violet-50 rounded border border-violet-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-violet-800">{grid.label}</span>
                  <button
                    onClick={() => handleApplyGrid(grid)}
                    className="px-2 py-0.5 text-[10px] bg-violet-600 text-white rounded hover:bg-violet-700 transition-colors"
                  >
                    Apply
                  </button>
                </div>
                <div className="text-[10px] text-violet-600 font-mono">
                  {grid.chords.slice(0, 8).map((c, j) => (
                    <span key={j} className="mr-1.5">{c.symbol}</span>
                  ))}
                  {grid.chords.length > 8 && <span>...</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Simple markdown renderer for AI output.
 * Handles bold, code, headers, and lists without pulling in a full markdown library.
 */
function AIMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="text-xs text-neutral-700 leading-relaxed space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        // Headers
        if (trimmed.startsWith('### ')) {
          return <h4 key={i} className="text-xs font-semibold text-neutral-900 mt-2">{formatInline(trimmed.slice(4))}</h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={i} className="text-sm font-semibold text-neutral-900 mt-3">{formatInline(trimmed.slice(3))}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={i} className="text-sm font-bold text-neutral-900 mt-3">{formatInline(trimmed.slice(2))}</h2>;
        }

        // List items
        if (/^[-*]\s/.test(trimmed)) {
          return (
            <div key={i} className="flex gap-1.5 pl-1">
              <span className="text-neutral-400 shrink-0">-</span>
              <span>{formatInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s(.+)/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-1.5 pl-1">
              <span className="text-neutral-400 shrink-0">{numMatch[1]}.</span>
              <span>{formatInline(numMatch[2])}</span>
            </div>
          );
        }

        // Bar grid lines (preserve formatting)
        if (trimmed.includes('|') && /\|[^|]+\|/.test(trimmed)) {
          return <div key={i} className="font-mono text-[11px] text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">{trimmed}</div>;
        }

        // Regular paragraph
        return <p key={i}>{formatInline(trimmed)}</p>;
      })}
    </div>
  );
}

/** Format inline markdown: **bold**, `code`, *italic* */
function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
      parts.push(<strong key={key++} className="font-semibold text-neutral-900">{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
      continue;
    }

    // Inline code: `text`
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)/s);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
      parts.push(<code key={key++} className="px-1 py-0.5 bg-neutral-100 rounded text-violet-700 font-mono text-[10px]">{codeMatch[2]}</code>);
      remaining = codeMatch[3];
      continue;
    }

    // No more matches
    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }

  return <>{parts}</>;
}
