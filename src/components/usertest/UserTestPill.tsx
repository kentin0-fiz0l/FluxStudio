/**
 * UserTestPill - Small indicator shown when user test mode is enabled
 *
 * Displays in the header as a clickable pill to open the test panel.
 * Unobtrusive design that doesn't interfere with normal usage.
 */

import { Beaker } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserTestMode } from '@/hooks/useUserTestMode';

export interface UserTestPillProps {
  onClick: () => void;
  className?: string;
}

export function UserTestPill({ onClick, className }: UserTestPillProps) {
  const { isEnabled, taskOutcomes } = useUserTestMode();

  if (!isEnabled) return null;

  const completedCount = taskOutcomes.filter(t => t.status === 'completed').length;
  const totalTasks = taskOutcomes.length || 7;

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'text-xs font-medium transition-all',
        'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
        'hover:bg-amber-200 dark:hover:bg-amber-800/50',
        'border border-amber-300 dark:border-amber-700',
        className
      )}
      aria-label="Open User Test Panel"
      title="User Test Mode - Click to open test panel"
    >
      <Beaker className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Test</span>
      {completedCount > 0 && (
        <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
          {completedCount}/{totalTasks}
        </span>
      )}
    </button>
  );
}

export default UserTestPill;
