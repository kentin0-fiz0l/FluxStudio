/**
 * RosterColumnMapper - Map CSV/TSV columns to performer fields
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { PERFORMER_FIELDS } from './types';
import type { ColumnMapping, PerformerField } from './types';

export interface RosterColumnMapperProps {
  headers: string[];
  sampleRows: string[][];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
}

export function RosterColumnMapper({
  headers,
  sampleRows,
  mapping,
  onMappingChange,
}: RosterColumnMapperProps) {
  const { t } = useTranslation('common');
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
        {t('formation.columnMapper.instructions', 'Map each column from your file to a performer field. The "Name" field is required.')}
      </p>

      {!hasNameMapping && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {t('formation.columnMapper.nameRequired', 'Please map at least one column to "Name" to continue.')}
          </p>
        </div>
      )}

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900">
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('formation.columnMapper.fileColumn', 'File Column')}
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('formation.columnMapper.mapTo', 'Map To')}
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('formation.columnMapper.sampleValues', 'Sample Values')}
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
                      <option value="skip">{t('formation.columnMapper.skip', '-- Skip --')}</option>
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
