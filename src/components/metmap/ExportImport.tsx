/**
 * ExportImport Component
 *
 * Export songs to JSON, import from file, and save as project assets.
 * Supports sharing MetMap sessions to project chat.
 */

import React, { useRef, useState } from 'react';
import { Song, Section } from '../../contexts/MetMapContext';
import { getApiUrl } from '../../utils/apiHelpers';
import { exportMetMapVideo, downloadBlob, type MetMapExportProgress } from '../../services/metmapExport';

interface ExportImportProps {
  currentSong: Song | null;
  sections: Section[];
  onImportSong: (data: Partial<Song> & { sections?: Partial<Section>[] }) => void;
  className?: string;
  projectId?: string;
  token?: string;
  onAssetCreated?: (asset: { id: string; name: string }) => void;
  onShareToChat?: (asset: { id: string; name: string }) => void;
}

export function ExportImport({
  currentSong,
  sections,
  onImportSong,
  className = '',
  projectId,
  token,
  onAssetCreated,
  onShareToChat
}: ExportImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastCreatedAsset, setLastCreatedAsset] = useState<any>(null);
  const [videoExporting, setVideoExporting] = useState(false);
  const [videoProgress, setVideoProgress] = useState<MetMapExportProgress | null>(null);

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

  // Calculate MetMap metadata
  const calculateMetadata = () => {
    if (!currentSong) return {};

    const totalBars = sections.reduce((sum, s) => sum + s.bars, 0);
    const tempoChanges = sections.filter((s, i) => {
      if (i === 0) return false;
      return s.tempoStart !== sections[i - 1].tempoStart;
    }).length;
    const meterChanges = sections.filter((s, i) => {
      if (i === 0) return false;
      return s.timeSignature !== sections[i - 1].timeSignature;
    }).length;

    // Estimate duration based on average tempo
    const avgTempo = sections.reduce((sum, s) => sum + s.tempoStart, 0) / (sections.length || 1);
    const avgBeatsPerBar = sections.reduce((sum, s) => {
      const [beats] = s.timeSignature.split('/').map(Number);
      return sum + (beats || 4);
    }, 0) / (sections.length || 1);
    const estimatedDurationSeconds = Math.round((totalBars * avgBeatsPerBar * 60) / avgTempo);

    return {
      bpm: currentSong.bpmDefault,
      timeSignature: currentSong.timeSignatureDefault,
      sectionCount: sections.length,
      totalBars,
      tempoChanges,
      meterChanges,
      estimatedDurationSeconds,
      lastEdited: new Date().toISOString()
    };
  };

  // Export as project asset
  const handleExportAsAsset = async () => {
    if (!currentSong || !projectId || !token) return;

    setIsExporting(true);
    setImportError(null);

    try {
      const metadata = calculateMetadata();

      // Create export data as JSON
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        song: {
          id: currentSong.id,
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
        metadata
      };

      // Create a blob and file for upload
      const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const fileName = `${currentSong.title.replace(/[^a-z0-9]/gi, '_')}_metmap.json`;

      // Upload as project asset
      const formData = new FormData();
      formData.append('files', jsonBlob, fileName);
      formData.append('description', `MetMap session: ${currentSong.title} - ${sections.length} sections, ${metadata.totalBars} bars, ${metadata.bpm} BPM`);
      formData.append('tags', JSON.stringify(['metmap', 'timeline', 'music']));
      formData.append('role', 'metmap');

      const response = await fetch(getApiUrl(`/projects/${projectId}/assets`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create asset');
      }

      const result = await response.json();
      const createdAsset = result.assets?.[0];

      if (createdAsset) {
        setLastCreatedAsset(createdAsset);
        onAssetCreated?.(createdAsset);
      }

      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to export as asset:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to export as asset');
    } finally {
      setIsExporting(false);
    }
  };

  // Share to project chat
  const handleShareToChat = () => {
    if (lastCreatedAsset && onShareToChat) {
      onShareToChat(lastCreatedAsset);
      setShowDropdown(false);
    }
  };

  // Export video
  const handleExportVideo = async () => {
    if (!currentSong || sections.length === 0) return;
    setVideoExporting(true);
    setVideoProgress(null);
    try {
      const blob = await exportMetMapVideo(
        sections,
        currentSong.beatMap,
        currentSong.audioDurationSeconds,
        { width: 1280, height: 200, fps: 30 },
        (progress) => setVideoProgress(progress),
      );
      const filename = `${currentSong.title.replace(/[^a-z0-9]/gi, '_')}_metmap.webm`;
      downloadBlob(blob, filename);
      setShowDropdown(false);
    } catch (err) {
      console.error('Video export failed:', err);
      setImportError(err instanceof Error ? err.message : 'Video export failed');
    } finally {
      setVideoExporting(false);
      setVideoProgress(null);
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
            <button
              onClick={handleExportVideo}
              disabled={!currentSong || videoExporting || sections.length === 0}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {videoExporting
                ? `Exporting... ${videoProgress?.percent ?? 0}%`
                : 'Export Video (.webm)'}
            </button>

            {/* Project Asset Export - only show when project is available */}
            {projectId && token && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase">
                  Project
                </div>
                <button
                  onClick={handleExportAsAsset}
                  disabled={!currentSong || isExporting}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {isExporting ? 'Saving...' : 'Save as Project Asset'}
                </button>
                {lastCreatedAsset && onShareToChat && (
                  <button
                    onClick={handleShareToChat}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-indigo-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Share to Project Chat
                  </button>
                )}
              </>
            )}

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
