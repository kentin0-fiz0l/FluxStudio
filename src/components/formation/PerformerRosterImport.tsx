/**
 * PerformerRosterImport - CSV/TSV import wizard for performer rosters
 *
 * Multi-step modal wizard: Upload -> Map Columns -> Preview -> Import.
 * Supports drag-and-drop file upload, column mapping, data validation,
 * and three merge strategies (add new, replace all, merge by name).
 *
 * Composed from sub-components in ./roster-import/:
 * - StepIndicator: wizard progress indicator
 * - RosterUploadStep: file upload with drag-and-drop
 * - RosterColumnMapper: column mapping step
 * - RosterPreviewStep: preview with merge strategy
 *
 * Sprint 7 - Formation Editor Upgrade
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, Check, X, ArrowRight } from 'lucide-react';
import type { Performer } from '../../services/formationTypes';

import { StepIndicator } from './roster-import/StepIndicator';
import { RosterUploadStep } from './roster-import/RosterUploadStep';
import { RosterColumnMapper } from './roster-import/RosterColumnMapper';
import { RosterPreviewStep } from './roster-import/RosterPreviewStep';
import { parseCsvContent, autoDetectMapping } from './roster-import/csvParser';
import { STEPS, DEFAULT_COLORS } from './roster-import/types';
import type { WizardStep, ColumnMapping, MergeMode, ValidationIssue } from './roster-import/types';

// ============================================================================
// TYPES
// ============================================================================

interface PerformerRosterImportProps {
  existingPerformers: Performer[];
  onImport: (performers: Omit<Performer, 'id'>[]) => void;
  onClose: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PerformerRosterImport: React.FC<PerformerRosterImportProps> = ({
  existingPerformers,
  onImport,
  onClose,
}) => {
  const { t } = useTranslation('common');

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
              {t('formation.importRoster', 'Import Roster')}
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
            <RosterUploadStep
              onFileLoaded={handleFileLoaded}
              fileName={fileName}
            />
          )}

          {step === 'map' && (
            <RosterColumnMapper
              headers={fileHeaders}
              sampleRows={fileRows}
              mapping={columnMapping}
              onMappingChange={setColumnMapping}
            />
          )}

          {step === 'preview' && (
            <RosterPreviewStep
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
                {t('actions.back', 'Back')}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              {t('actions.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleNext}
              disabled={!canAdvance}
              className="flex items-center gap-1.5 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 'preview' ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  {t('formation.importPerformersCount', 'Import {{count}} Performers', { count: parsedPerformers.filter((p) => p.name).length })}
                </>
              ) : (
                <>
                  {t('actions.next', 'Next')}
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
