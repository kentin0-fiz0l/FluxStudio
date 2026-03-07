/**
 * RosterUploadStep - File upload with drag-and-drop for CSV/TSV roster files
 */

import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';

export interface RosterUploadStepProps {
  onFileLoaded: (content: string, name: string) => void;
  fileName: string | null;
}

export function RosterUploadStep({ onFileLoaded, fileName }: RosterUploadStepProps) {
  const { t } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'tsv' && ext !== 'txt') {
        setError(t('formation.rosterUpload.unsupportedFileType', 'Unsupported file type. Please use CSV or TSV files.'));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(t('formation.rosterUpload.fileTooLarge', 'File is too large. Maximum file size is 5 MB.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          onFileLoaded(content, file.name);
        }
      };
      reader.onerror = () => {
        setError(t('formation.rosterUpload.readError', 'Failed to read file. Please try again.'));
      };
      reader.readAsText(file);
    },
    [onFileLoaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="p-6">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : fileName
              ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-900'
        }`}
      >
        {fileName ? (
          <>
            <FileSpreadsheet
              className="w-10 h-10 text-green-500 mb-3"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {fileName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('formation.rosterUpload.clickOrDragReplace', 'Click or drag to replace')}
            </p>
          </>
        ) : (
          <>
            <Upload
              className={`w-10 h-10 mb-3 ${
                isDragOver ? 'text-blue-500' : 'text-gray-400'
              }`}
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {t('formation.rosterUpload.dropFileHere', 'Drop your roster file here')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('formation.rosterUpload.clickToBrowse', 'or click to browse. Supports CSV and TSV files.')}
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Choose roster file"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Format tips */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          {t('formation.rosterUpload.expectedFormat', 'Expected Format')}
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          {t('formation.rosterUpload.formatDescription', 'The first row should contain column headers. Each subsequent row represents one performer.')}
        </p>
        <div className="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded p-2 overflow-x-auto">
          <div>Name, Label, Instrument, Section, Drill Number, Group</div>
          <div>Alice Smith, AS, Trumpet, Brass, T1, Front</div>
          <div>Bob Jones, BJ, Snare, Percussion, S2, Battery</div>
        </div>
      </div>
    </div>
  );
}
