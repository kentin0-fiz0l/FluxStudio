/**
 * ExportImport Component
 *
 * Export songs to JSON and import from file.
 */

import React, { useRef, useState } from 'react';
import { Song, Section } from '../../contexts/MetMapContext';

interface ExportImportProps {
  currentSong: Song | null;
  sections: Section[];
  onImportSong: (data: Partial<Song> & { sections?: Partial<Section>[] }) => void;
  className?: string;
}

export function ExportImport({
  currentSong,
  sections,
  onImportSong,
  className = ''
}: ExportImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Export song to JSON
  const handleExport = () => {
    if (!currentSong) return;

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      song: {
        title: currentSong.title,
        bpmDefault: currentSong.bpmDefault,
        timeSignatureDefault: currentSong.timeSignatureDefault,
        sections: sections.map((s) => ({
          name: s.name,
          bars: s.bars,
          timeSignature: s.timeSignature,
          tempoStart: s.tempoStart,
          tempoEnd: s.tempoEnd,
          tempoCurve: s.tempoCurve,
          chords: s.chords,
        })),
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentSong.title.replace(/[^a-z0-9]/gi, '_')}_metmap.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowDropdown(false);
  };

  // Handle file import
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Validate structure
        if (!data.song || !data.song.title) {
          throw new Error('Invalid file format: missing song data');
        }

        // Import the song
        onImportSong({
          title: data.song.title,
          bpmDefault: data.song.bpmDefault || 120,
          timeSignatureDefault: data.song.timeSignatureDefault || '4/4',
          sections: data.song.sections || [],
        });

        setShowDropdown(false);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to import file');
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read file');
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = '';
  };

  // Export to clipboard
  const handleCopyToClipboard = async () => {
    if (!currentSong) return;

    const exportData = {
      title: currentSong.title,
      bpm: currentSong.bpmDefault,
      timeSignature: currentSong.timeSignatureDefault,
      sections: sections.map((s) => `${s.name} (${s.bars} bars, ${s.tempoStart} BPM)`).join(' → '),
    };

    const text = `🎵 ${exportData.title}
Tempo: ${exportData.bpm} BPM | Time: ${exportData.timeSignature}
${exportData.sections}`;

    try {
      await navigator.clipboard.writeText(text);
      setShowDropdown(false);
    } catch {
      console.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Export/Import options"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-1 py-2 bg-white rounded-lg shadow-xl border border-gray-200 z-20 min-w-[180px]">
            <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase">
              Export
            </div>
            <button
              onClick={handleExport}
              disabled={!currentSong}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to JSON
            </button>
            <button
              onClick={handleCopyToClipboard}
              disabled={!currentSong}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy Summary
            </button>

            <div className="border-t border-gray-100 my-1" />

            <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase">
              Import
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Import from JSON
            </button>

            {importError && (
              <div className="px-3 py-2 text-xs text-red-600 bg-red-50">
                {importError}
              </div>
            )}
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
}

export default ExportImport;
