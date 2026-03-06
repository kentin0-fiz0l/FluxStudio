/**
 * PerformerRosterImport - CSV/TSV import wizard for performer rosters
 *
 * Multi-step modal wizard: Upload -> Map Columns -> Preview -> Import.
 * Supports drag-and-drop file upload, column mapping, data validation,
 * and three merge strategies (add new, replace all, merge by name).
 *
 * Sprint 7 - Formation Editor Upgrade
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';
import type { Performer } from '../../services/formationTypes';

// ============================================================================
// TYPES
// ============================================================================

interface PerformerRosterImportProps {
  existingPerformers: Performer[];
  onImport: (performers: Omit<Performer, 'id'>[]) => void;
  onClose: () => void;
}

type WizardStep = 'upload' | 'map' | 'preview' | 'import';

type PerformerField =
  | 'name'
  | 'label'
  | 'color'
  | 'instrument'
  | 'section'
  | 'drillNumber'
  | 'group';

type MergeMode = 'add' | 'replace' | 'merge';

interface ColumnMapping {
  [columnIndex: number]: PerformerField | 'skip';
}

interface ValidationIssue {
  row: number;
  field: string;
  message: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS: WizardStep[] = ['upload', 'map', 'preview', 'import'];

const STEP_LABELS: Record<WizardStep, string> = {
  upload: 'Upload File',
  map: 'Map Columns',
  preview: 'Preview',
  import: 'Import',
};

const PERFORMER_FIELDS: { value: PerformerField; label: string; required: boolean }[] = [
  { value: 'name', label: 'Name', required: true },
  { value: 'label', label: 'Label', required: false },
  { value: 'color', label: 'Color', required: false },
  { value: 'instrument', label: 'Instrument', required: false },
  { value: 'section', label: 'Section', required: false },
  { value: 'drillNumber', label: 'Drill Number', required: false },
  { value: 'group', label: 'Group', required: false },
];

const MERGE_OPTIONS: { value: MergeMode; label: string; description: string }[] = [
  {
    value: 'add',
    label: 'Add new only',
    description: 'Keep existing performers, add new ones from file',
  },
  {
    value: 'replace',
    label: 'Replace all',
    description: 'Remove all existing performers, use file data only',
  },
  {
    value: 'merge',
    label: 'Merge by name',
    description: 'Update existing performers by name, add new ones',
  },
];

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

// ============================================================================
// CSV PARSING
// ============================================================================

/**
 * Parse a single CSV/TSV line, handling quoted fields.
 * Supports double-quote escaping (e.g., "field with ""quotes""").
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      current += char;
      i++;
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (char === delimiter) {
        fields.push(current.trim());
        current = '';
        i++;
        continue;
      }
      current += char;
      i++;
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Detect delimiter (comma or tab) from file content.
 */
function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0] ?? '';
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  return tabCount > commaCount ? '\t' : ',';
}

/**
 * Parse full CSV/TSV content into a 2D string array.
 */
function parseCsvContent(content: string): { headers: string[]; rows: string[][] } {
  const lines = content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const delimiter = detectDelimiter(content);
  const headers = parseCsvLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => parseCsvLine(line, delimiter));

  return { headers, rows };
}

/**
 * Auto-detect column mappings by matching header names to performer fields.
 */
function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  const patterns: Record<PerformerField, RegExp> = {
    name: /^(name|performer|first\s*name|full\s*name|member)$/i,
    label: /^(label|tag|abbreviation|abbr|short\s*name)$/i,
    color: /^(color|colour|hex|marker)$/i,
    instrument: /^(instrument|inst|horn)$/i,
    section: /^(section|sec|part|voice|family)$/i,
    drillNumber: /^(drill\s*number|drill\s*#|drill\s*no|number|#|num|spot)$/i,
    group: /^(group|grp|squad|rank|file)$/i,
  };

  const assigned = new Set<PerformerField>();

  headers.forEach((header, index) => {
    const trimmed = header.trim();
    for (const field of PERFORMER_FIELDS) {
      if (assigned.has(field.value)) continue;
      if (patterns[field.value].test(trimmed)) {
        mapping[index] = field.value;
        assigned.add(field.value);
        break;
      }
    }
  });

  return mapping;
}

// ============================================================================
// STEP INDICATOR
// ============================================================================

function StepIndicator({
  currentStep,
}: {
  currentStep: WizardStep;
}) {
  const currentIndex = STEPS.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-1 px-6 py-3">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <React.Fragment key={step}>
            {index > 0 && (
              <div
                className={`h-px w-8 mx-1 ${
                  index <= currentIndex
                    ? 'bg-blue-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  isCompleted
                    ? 'bg-blue-500 text-white'
                    : isCurrent
                      ? 'bg-blue-500 text-white ring-2 ring-blue-300 dark:ring-blue-700'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isCurrent
                    ? 'text-blue-600 dark:text-blue-400'
                    : isCompleted
                      ? 'text-gray-600 dark:text-gray-300'
                      : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============================================================================
// UPLOAD STEP
// ============================================================================

function UploadStep({
  onFileLoaded,
  fileName,
}: {
  onFileLoaded: (content: string, name: string) => void;
  fileName: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'tsv' && ext !== 'txt') {
        setError('Unsupported file type. Please use CSV or TSV files.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('File is too large. Maximum file size is 5 MB.');
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
        setError('Failed to read file. Please try again.');
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
              Click or drag to replace
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
              Drop your roster file here
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              or click to browse. Supports CSV and TSV files.
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
          Expected Format
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          The first row should contain column headers. Each subsequent row represents one performer.
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

// ============================================================================
// COLUMN MAPPING STEP
// ============================================================================

function MapColumnsStep({
  headers,
  sampleRows,
  mapping,
  onMappingChange,
}: {
  headers: string[];
  sampleRows: string[][];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
}) {
  const assignedFields = useMemo(() => {
    const set = new Set<PerformerField>();
    for (const value of Object.values(mapping)) {
      if (value !== 'skip') set.add(value);
    }
    return set;
  }, [mapping]);

  const hasNameMapping = assignedFields.has('name');

  return (
    <div className="p-6">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Map each column from your file to a performer field. The &quot;Name&quot; field is required.
      </p>

      {!hasNameMapping && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Please map at least one column to &quot;Name&quot; to continue.
          </p>
        </div>
      )}

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900">
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                File Column
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Map To
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Sample Values
              </th>
            </tr>
          </thead>
          <tbody>
            {headers.map((header, colIndex) => {
              const currentValue = mapping[colIndex] ?? 'skip';

              return (
                <tr
                  key={colIndex}
                  className="border-t border-gray-100 dark:border-gray-700/50"
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                    {header}
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={currentValue}
                      onChange={(e) => {
                        const newMapping = { ...mapping };
                        const val = e.target.value as PerformerField | 'skip';
                        if (val === 'skip') {
                          delete newMapping[colIndex];
                        } else {
                          // Remove this field from any other column first
                          for (const key of Object.keys(newMapping)) {
                            if (newMapping[Number(key)] === val) {
                              delete newMapping[Number(key)];
                            }
                          }
                          newMapping[colIndex] = val;
                        }
                        onMappingChange(newMapping);
                      }}
                      className="w-full px-2 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="skip">-- Skip --</option>
                      {PERFORMER_FIELDS.map((field) => {
                        const isAssignedElsewhere =
                          assignedFields.has(field.value) && currentValue !== field.value;
                        return (
                          <option
                            key={field.value}
                            value={field.value}
                            disabled={isAssignedElsewhere}
                          >
                            {field.label}
                            {field.required ? ' *' : ''}
                            {isAssignedElsewhere ? ' (mapped)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">
                    {sampleRows
                      .slice(0, 3)
                      .map((row) => row[colIndex] ?? '')
                      .filter(Boolean)
                      .join(', ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// PREVIEW STEP
// ============================================================================

function PreviewStep({
  parsedPerformers,
  validationIssues,
  mergeMode,
  onMergeModeChange,
  existingCount,
}: {
  parsedPerformers: Omit<Performer, 'id'>[];
  validationIssues: ValidationIssue[];
  mergeMode: MergeMode;
  onMergeModeChange: (mode: MergeMode) => void;
  existingCount: number;
}) {
  const issuesByRow = useMemo(() => {
    const map = new Map<number, ValidationIssue[]>();
    for (const issue of validationIssues) {
      const list = map.get(issue.row) ?? [];
      list.push(issue);
      map.set(issue.row, list);
    }
    return map;
  }, [validationIssues]);

  return (
    <div className="p-6">
      {/* Summary */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <FileSpreadsheet className="w-4 h-4 text-blue-500" aria-hidden="true" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {parsedPerformers.length} performer{parsedPerformers.length !== 1 ? 's' : ''} found
          </span>
        </div>
        {validationIssues.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {validationIssues.length} issue{validationIssues.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Merge mode selector */}
      {existingCount > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Merge Strategy
          </h4>
          <div className="space-y-2">
            {MERGE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  mergeMode === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="mergeMode"
                  checked={mergeMode === option.value}
                  onChange={() => onMergeModeChange(option.value)}
                  className="mt-0.5 w-4 h-4 text-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {option.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Preview table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide w-8">
                  #
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Label
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Instrument
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Section
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Drill #
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {parsedPerformers.map((p, index) => {
                const rowIssues = issuesByRow.get(index);
                const hasIssues = rowIssues && rowIssues.length > 0;

                return (
                  <tr
                    key={index}
                    className={`border-t border-gray-100 dark:border-gray-700/50 ${
                      hasIssues
                        ? 'bg-amber-50/50 dark:bg-amber-900/10'
                        : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-gray-400 text-xs">{index + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                      {p.name || (
                        <span className="text-red-500 italic">missing</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1.5">
                        {p.color && (
                          <span
                            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                        )}
                        {p.label || <span className="text-gray-400">--</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {p.instrument || <span className="text-gray-400">--</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {p.section || <span className="text-gray-400">--</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {p.drillNumber || <span className="text-gray-400">--</span>}
                    </td>
                    <td className="px-3 py-2">
                      {hasIssues ? (
                        <span
                          className="text-xs text-amber-600 dark:text-amber-400"
                          title={rowIssues.map((i) => i.message).join('; ')}
                        >
                          <AlertCircle className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                          {rowIssues.length} issue{rowIssues.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation issues detail */}
      {validationIssues.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <h4 className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1.5">
            Issues Found
          </h4>
          <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5 max-h-24 overflow-y-auto">
            {validationIssues.map((issue, i) => (
              <li key={i}>
                Row {issue.row + 1}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PerformerRosterImport: React.FC<PerformerRosterImportProps> = ({
  existingPerformers,
  onImport,
  onClose,
}) => {
  // Wizard state
  const [step, setStep] = useState<WizardStep>('upload');

  // Upload state
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileRows, setFileRows] = useState<string[][]>([]);

  // Mapping state
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});

  // Import options
  const [mergeMode, setMergeMode] = useState<MergeMode>(
    existingPerformers.length > 0 ? 'add' : 'replace',
  );

  // ---- File loaded handler ----
  const handleFileLoaded = useCallback((content: string, name: string) => {
    const { headers, rows } = parseCsvContent(content);
    setFileName(name);
    setFileHeaders(headers);
    setFileRows(rows);
    setColumnMapping(autoDetectMapping(headers));
  }, []);

  // ---- Derived: check if name column is mapped ----
  const hasNameMapping = useMemo(() => {
    return Object.values(columnMapping).includes('name');
  }, [columnMapping]);

  // ---- Derived: build performer objects from rows + mapping ----
  const parsedPerformers = useMemo((): Omit<Performer, 'id'>[] => {
    return fileRows.map((row, rowIndex) => {
      const performer: Record<string, string> = {};

      for (const [colIndexStr, field] of Object.entries(columnMapping)) {
        if (field === 'skip') continue;
        const colIndex = Number(colIndexStr);
        const value = row[colIndex]?.trim() ?? '';
        if (value) {
          performer[field] = value;
        }
      }

      return {
        name: performer.name ?? '',
        label: performer.label ?? performer.name?.substring(0, 2).toUpperCase() ?? '',
        color: performer.color ?? DEFAULT_COLORS[rowIndex % DEFAULT_COLORS.length],
        instrument: performer.instrument,
        section: performer.section,
        drillNumber: performer.drillNumber,
        group: performer.group,
      };
    });
  }, [fileRows, columnMapping]);

  // ---- Derived: validation issues ----
  const validationIssues = useMemo((): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const labelsSeen = new Map<string, number>();

    parsedPerformers.forEach((p, i) => {
      // Missing name
      if (!p.name) {
        issues.push({ row: i, field: 'name', message: 'Name is missing' });
      }

      // Duplicate labels
      if (p.label) {
        const prevRow = labelsSeen.get(p.label);
        if (prevRow !== undefined) {
          issues.push({
            row: i,
            field: 'label',
            message: `Duplicate label "${p.label}" (same as row ${prevRow + 1})`,
          });
        } else {
          labelsSeen.set(p.label, i);
        }
      }

      // Invalid color (basic hex check)
      if (p.color && !/^#[0-9a-fA-F]{3,8}$/.test(p.color) && !DEFAULT_COLORS.includes(p.color)) {
        // Only flag if the user mapped a color column and provided a non-hex value
        const colorColIndex = Object.entries(columnMapping).find(
          ([, field]) => field === 'color',
        )?.[0];
        if (colorColIndex !== undefined) {
          issues.push({
            row: i,
            field: 'color',
            message: `Invalid color value "${p.color}"`,
          });
        }
      }
    });

    return issues;
  }, [parsedPerformers, columnMapping]);

  // ---- Has blocking issues (missing names) ----
  const hasBlockingIssues = useMemo(() => {
    return validationIssues.some((issue) => issue.field === 'name');
  }, [validationIssues]);

  // ---- Apply final import ----
  const handleImport = useCallback(() => {
    // Filter out rows with missing names
    const validPerformers = parsedPerformers.filter((p) => p.name.length > 0);

    if (mergeMode === 'replace') {
      onImport(validPerformers);
    } else if (mergeMode === 'add') {
      // Add only performers whose names don't exist yet
      const existingNames = new Set(
        existingPerformers.map((p) => p.name.toLowerCase()),
      );
      const newPerformers = validPerformers.filter(
        (p) => !existingNames.has(p.name.toLowerCase()),
      );
      // Combine existing (without id) + new
      const combined = [
        ...existingPerformers.map(({ id: _id, ...rest }) => rest),
        ...newPerformers,
      ];
      onImport(combined);
    } else {
      // merge by name
      const existingByName = new Map<string, Omit<Performer, 'id'>>();
      for (const { id: _id, ...rest } of existingPerformers) {
        existingByName.set(rest.name.toLowerCase(), rest);
      }

      // Update existing, track which we've seen
      const merged: Omit<Performer, 'id'>[] = [];
      const seenNames = new Set<string>();

      for (const imported of validPerformers) {
        const key = imported.name.toLowerCase();
        const existing = existingByName.get(key);
        if (existing) {
          merged.push({
            ...existing,
            label: imported.label || existing.label,
            color: imported.color || existing.color,
            instrument: imported.instrument ?? existing.instrument,
            section: imported.section ?? existing.section,
            drillNumber: imported.drillNumber ?? existing.drillNumber,
            group: imported.group ?? existing.group,
          });
        } else {
          merged.push(imported);
        }
        seenNames.add(key);
      }

      // Add existing performers that weren't in the import
      for (const { id: _id, ...rest } of existingPerformers) {
        if (!seenNames.has(rest.name.toLowerCase())) {
          merged.push(rest);
        }
      }

      onImport(merged);
    }
  }, [parsedPerformers, mergeMode, existingPerformers, onImport]);

  // ---- Navigation helpers ----
  const canAdvance = useMemo((): boolean => {
    switch (step) {
      case 'upload':
        return fileName !== null && fileRows.length > 0;
      case 'map':
        return hasNameMapping;
      case 'preview':
        return parsedPerformers.length > 0 && !hasBlockingIssues;
      case 'import':
        return false;
      default:
        return false;
    }
  }, [step, fileName, fileRows, hasNameMapping, parsedPerformers, hasBlockingIssues]);

  const handleNext = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1]);
    }
    // On the preview step, "next" means import
    if (step === 'preview') {
      handleImport();
    }
  }, [step, handleImport]);

  const handleBack = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) {
      setStep(STEPS[idx - 1]);
    }
  }, [step]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" role="presentation" onClick={onClose} />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import Performer Roster"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-500" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Import Roster
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close import dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <StepIndicator currentStep={step} />
        </div>

        {/* Step Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-220px)]">
          {step === 'upload' && (
            <UploadStep
              onFileLoaded={handleFileLoaded}
              fileName={fileName}
            />
          )}

          {step === 'map' && (
            <MapColumnsStep
              headers={fileHeaders}
              sampleRows={fileRows}
              mapping={columnMapping}
              onMappingChange={setColumnMapping}
            />
          )}

          {step === 'preview' && (
            <PreviewStep
              parsedPerformers={parsedPerformers}
              validationIssues={validationIssues}
              mergeMode={mergeMode}
              onMergeModeChange={setMergeMode}
              existingCount={existingPerformers.length}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div>
            {step !== 'upload' && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              Cancel
            </button>
            <button
              onClick={handleNext}
              disabled={!canAdvance}
              className="flex items-center gap-1.5 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 'preview' ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  Import {parsedPerformers.filter((p) => p.name).length} Performers
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformerRosterImport;
