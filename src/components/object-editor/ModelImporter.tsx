/**
 * ModelImporter - Upload and validate .glb/.obj 3D models
 */

import { useState, useCallback, useRef } from 'react';
import { Upload, X, AlertTriangle, CheckCircle, FileUp } from 'lucide-react';
import { Button } from '@/components/ui';
import { validateModelFile } from '../../services/scene3d/modelLoader';
import { POLY_COUNT_WARN, POLY_COUNT_REJECT } from '../../services/scene3d/types';

interface ModelImporterProps {
  onImport: (file: File) => void;
  onClose: () => void;
}

interface ValidationState {
  status: 'idle' | 'validating' | 'valid' | 'error';
  file: File | null;
  errors: string[];
  warnings: string[];
}

export function ModelImporter({ onImport, onClose }: ModelImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validation, setValidation] = useState<ValidationState>({
    status: 'idle',
    file: null,
    errors: [],
    warnings: [],
  });
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    const result = validateModelFile(file);
    if (!result.valid) {
      setValidation({
        status: 'error',
        file,
        errors: result.errors,
        warnings: [],
      });
      return;
    }

    setValidation({
      status: 'valid',
      file,
      errors: [],
      warnings: [],
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Import 3D Model</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragging
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }
            `}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" aria-hidden="true" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drop a .glb, .gltf, or .obj file here
            </p>
            <p className="text-xs text-gray-400 mt-1">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf,.obj"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* File info */}
          {validation.file && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <FileUp className="w-5 h-5 text-gray-400" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {validation.file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {(validation.file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              {validation.status === 'valid' && <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />}
              {validation.status === 'error' && <AlertTriangle className="w-5 h-5 text-red-500" aria-hidden="true" />}
            </div>
          )}

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg space-y-1">
              {validation.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-600 dark:text-red-400">{err}</p>
              ))}
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg space-y-1">
              {validation.warnings.map((warn, i) => (
                <p key={i} className="text-xs text-yellow-600 dark:text-yellow-400">{warn}</p>
              ))}
            </div>
          )}

          {/* Limits info */}
          <div className="text-xs text-gray-400 space-y-0.5">
            <p>Max file size: 50 MB</p>
            <p>Polygon warning: {POLY_COUNT_WARN.toLocaleString()} faces</p>
            <p>Polygon limit: {POLY_COUNT_REJECT.toLocaleString()} faces</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={validation.status !== 'valid' || !validation.file}
            onClick={() => {
              if (validation.file) onImport(validation.file);
            }}
          >
            Import Model
          </Button>
        </div>
      </div>
    </div>
  );
}
