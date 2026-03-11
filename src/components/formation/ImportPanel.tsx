/**
 * Import Panel - FluxStudio
 *
 * File upload UI for importing drill files (.3dz Pyware archives, .xml).
 * Supports drag-and-drop, file format auto-detection, preview, and label mapping.
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Formation } from '../../services/formationTypes';
import {
  parsePywareFile,
  parsePywareXml,
  pywareToFormation,
  type PywareImportResult,
} from '../../services/pywareImporter';

// ============================================================================
// TYPES
// ============================================================================

interface ImportPanelProps {
  onImport: (formation: Partial<Formation>) => void;
  onClose: () => void;
}

type ImportPhase = 'upload' | 'preview' | 'error';

// ============================================================================
// COMPONENT
// ============================================================================

export const ImportPanel: React.FC<ImportPanelProps> = ({ onImport, onClose }) => {
  const [phase, setPhase] = useState<ImportPhase>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importResult, setImportResult] = useState<PywareImportResult | null>(null);
  const [labelMapping, setLabelMapping] = useState<Map<string, string>>(new Map());
  const [showLabelMapping, setShowLabelMapping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect file type and parse
  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const name = file.name.toLowerCase();
      let result: PywareImportResult;

      if (name.endsWith('.3dz') || name.endsWith('.zip')) {
        result = await parsePywareFile(file);
      } else if (name.endsWith('.xml')) {
        const text = await file.text();
        result = parsePywareXml(text);
      } else {
        throw new Error(`Unsupported file format: "${file.name}". Accepted formats: .3dz, .xml`);
      }

      if (result.performers.length === 0 && result.sets.length === 0) {
        throw new Error('No drill data found in the file. The file may be empty or in an unrecognized format.');
      }

      setImportResult(result);
      // Initialize label mapping with identity (no renaming)
      const mapping = new Map<string, string>();
      for (const p of result.performers) {
        mapping.set(p.label, p.label);
      }
      setLabelMapping(mapping);
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse drill file');
      setPhase('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleImport = useCallback(() => {
    if (!importResult) return;
    const formation = pywareToFormation(importResult, labelMapping);
    onImport(formation);
  }, [importResult, labelMapping, onImport]);

  const handleLabelChange = useCallback((originalLabel: string, newLabel: string) => {
    setLabelMapping(prev => {
      const next = new Map(prev);
      next.set(originalLabel, newLabel);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setPhase('upload');
    setImportResult(null);
    setError(null);
    setLabelMapping(new Map());
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Import Drill File
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Parsing drill file...</p>
            </div>
          )}

          {/* Upload phase */}
          {!isLoading && phase === 'upload' && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Drop a drill file here or click to browse
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supported formats: .3dz (Pyware), .xml
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".3dz,.xml,.zip"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Error phase */}
          {!isLoading && phase === 'error' && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Import failed
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Try another file
              </button>
            </div>
          )}

          {/* Preview phase */}
          {!isLoading && phase === 'preview' && importResult && (
            <div className="space-y-4">
              {/* Metadata summary */}
              <div className="grid grid-cols-2 gap-3">
                {importResult.metadata.title && (
                  <div className="col-span-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Title</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{importResult.metadata.title}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Performers</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{importResult.metadata.totalPerformers}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sets</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{importResult.metadata.totalSets}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Field Size</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {importResult.fieldSize.width} x {importResult.fieldSize.height} steps
                  </p>
                </div>
                {importResult.metadata.composer && (
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Composer</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{importResult.metadata.composer}</p>
                  </div>
                )}
              </div>

              {/* Preview: instruments breakdown */}
              {importResult.performers.some(p => p.instrument) && (
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Instruments</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {Array.from(
                      importResult.performers.reduce((acc, p) => {
                        const inst = p.instrument ?? 'Unknown';
                        acc.set(inst, (acc.get(inst) ?? 0) + 1);
                        return acc;
                      }, new Map<string, number>())
                    ).map(([inst, count]) => (
                      <span
                        key={inst}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {inst} ({count})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Label mapping (collapsible) */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                <button
                  onClick={() => setShowLabelMapping(!showLabelMapping)}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Label Mapping
                  </span>
                  {showLabelMapping ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showLabelMapping && (
                  <div className="px-3 pb-3 max-h-48 overflow-y-auto">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Optionally rename imported performer labels.
                    </p>
                    <div className="space-y-1.5">
                      {importResult.performers.map((p) => (
                        <div key={p.label} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-20 truncate flex-shrink-0" title={p.label}>
                            {p.label}
                          </span>
                          <span className="text-gray-400">&#8594;</span>
                          <input
                            type="text"
                            value={labelMapping.get(p.label) ?? p.label}
                            onChange={(e) => handleLabelChange(p.label, e.target.value)}
                            className="flex-1 text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {phase === 'preview' && (
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Import
            </button>
          )}
          {phase === 'error' && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportPanel;
