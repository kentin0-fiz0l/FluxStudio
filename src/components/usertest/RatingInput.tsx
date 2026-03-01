/**
 * RatingInput - Numeric 1-10 rating selector for user test feedback.
 */

import { cn } from '@/lib/utils';

export interface RatingInputProps {
  label: string;
  sublabel: string;
  value: number;
  onChange: (value: number) => void;
}

export function RatingInput({ label, sublabel, value, onChange }: RatingInputProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">{sublabel}</span>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              'w-7 h-7 text-xs font-medium rounded transition-colors',
              value >= n
                ? 'bg-amber-500 text-white'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-amber-200 dark:hover:bg-amber-800'
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
