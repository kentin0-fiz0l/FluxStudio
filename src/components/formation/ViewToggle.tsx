/**
 * ViewToggle - Switch between 2D, 3D, and Split views
 */

import { Monitor, Box, Columns } from 'lucide-react';
import type { FormationViewMode } from '../../services/scene3d/types';

interface ViewToggleProps {
  mode: FormationViewMode;
  onChange: (mode: FormationViewMode) => void;
}

const modes: { value: FormationViewMode; label: string; icon: typeof Monitor }[] = [
  { value: '2d', label: '2D', icon: Monitor },
  { value: '3d', label: '3D', icon: Box },
  { value: 'split', label: 'Split', icon: Columns },
];

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
      {modes.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
            ${mode === value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }
          `}
          title={`${label} View`}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
