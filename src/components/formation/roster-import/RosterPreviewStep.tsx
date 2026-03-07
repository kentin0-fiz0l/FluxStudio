/**
 * RosterPreviewStep - Preview parsed performers with validation and merge strategy
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, AlertCircle, Check } from 'lucide-react';
import { MERGE_OPTIONS } from './types';
import type { MergeMode, ValidationIssue } from './types';
import type { Performer } from '../../../services/formationTypes';

export interface RosterPreviewStepProps {
  parsedPerformers: Omit<Performer, 'id'>[];
  validationIssues: ValidationIssue[];
  mergeMode: MergeMode;
  onMergeModeChange: (mode: MergeMode) => void;
  existingCount: number;
}

export function RosterPreviewStep({
  parsedPerformers,
  validationIssues,
  mergeMode,
  onMergeModeChange,
  existingCount,
}: RosterPreviewStepProps) {
  const { t } = useTranslation('common');
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
            {t('formation.rosterPreview.performersFound', '{{count}} performer(s) found', { count: parsedPerformers.length })}
          </span>
        </div>
        {validationIssues.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {t('formation.rosterPreview.issuesCount', '{{count}} issue(s)', { count: validationIssues.length })}
            </span>
          </div>
        )}
      </div>

      {/* Merge mode selector */}
      {existingCount > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {t('formation.rosterPreview.mergeStrategy', 'Merge Strategy')}
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
                  {t('formation.rosterPreview.name', 'Name')}
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('formation.rosterPreview.label', 'Label')}
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('formation.rosterPreview.instrument', 'Instrument')}
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('formation.rosterPreview.section', 'Section')}
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('formation.rosterPreview.drillNumber', 'Drill #')}
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('formation.rosterPreview.status', 'Status')}
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
                        <span className="text-red-500 italic">{t('formation.rosterPreview.missing', 'missing')}</span>
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
            {t('formation.rosterPreview.issuesFound', 'Issues Found')}
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
