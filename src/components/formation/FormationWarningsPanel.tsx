/**
 * FormationWarningsPanel - Collapsible panel displaying formation validation warnings
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { FormationWarning } from '../../services/formationValidator';

interface FormationWarningsPanelProps {
  warnings: FormationWarning[];
}

const severityConfig = {
  error: {
    icon: AlertCircle,
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-400',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-700 dark:text-yellow-400',
    iconColor: 'text-yellow-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-400',
    iconColor: 'text-blue-500',
  },
} as const;

export function FormationWarningsPanel({ warnings }: FormationWarningsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (warnings.length === 0) return null;

  const errorCount = warnings.filter(w => w.severity === 'error').length;
  const warningCount = warnings.filter(w => w.severity === 'warning').length;

  return (
    <div className="absolute bottom-2 left-2 z-40 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <AlertTriangle className="w-4 h-4 text-yellow-500" />
        <span className="font-medium text-gray-700 dark:text-gray-200">
          {warnings.length} {warnings.length === 1 ? 'Warning' : 'Warnings'}
        </span>
        {errorCount > 0 && (
          <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
            {errorCount} error{errorCount > 1 ? 's' : ''}
          </span>
        )}
        {warningCount > 0 && errorCount === 0 && (
          <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
            {warningCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="max-h-48 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
          {warnings.map((warning, i) => {
            const config = severityConfig[warning.severity];
            const Icon = config.icon;
            return (
              <div
                key={i}
                className={`flex items-start gap-2 px-3 py-2 ${config.bg} border-b ${config.border} last:border-b-0`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.iconColor}`} />
                <span className={`${config.text} text-xs`}>{warning.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
