/**
 * TestScenarioList - Task checklist with Start/Complete/Stuck actions
 */

import {
  ChevronDown,
  ChevronRight,
  Play,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { TaskOutcome } from '@/services/userTestLogger';

export interface TestTask {
  id: string;
  title: string;
  successCriteria: string;
}

export interface TestScenarioListProps {
  tasks: TestTask[];
  outcomes: TaskOutcome[];
  expandedTask: string | null;
  onExpand: (taskId: string | null) => void;
  onStart: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onStuck: (taskId: string) => void;
  onNotes: (taskId: string, notes: string) => void;
}

export function TestScenarioList({
  tasks,
  outcomes,
  expandedTask,
  onExpand,
  onStart,
  onComplete,
  onStuck,
  onNotes,
}: TestScenarioListProps) {
  return (
    <div className="space-y-2">
      {tasks.map((task, index) => {
        const outcome = outcomes.find(o => o.taskId === task.id);
        const isExpanded = expandedTask === task.id;

        return (
          <div
            key={task.id}
            className={cn(
              'border rounded-lg overflow-hidden',
              outcome?.status === 'completed' && 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10',
              outcome?.status === 'stuck' && 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10',
              outcome?.status === 'started' && 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10',
              outcome?.status === 'pending' && 'border-neutral-200 dark:border-neutral-700'
            )}
          >
            <button
              onClick={() => onExpand(isExpanded ? null : task.id)}
              className="w-full flex items-start gap-3 p-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
            >
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-xs font-medium">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {task.title}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {task.successCriteria}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {outcome?.status === 'completed' && (
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                )}
                {outcome?.status === 'stuck' && (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
                )}
                {outcome?.status === 'started' && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">In progress</span>
                )}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex flex-wrap gap-2 mb-3">
                  {outcome?.status === 'pending' && (
                    <Button size="sm" variant="outline" onClick={() => onStart(task.id)}>
                      <Play className="h-3 w-3 mr-1" aria-hidden="true" />
                      Start
                    </Button>
                  )}
                  {(outcome?.status === 'pending' || outcome?.status === 'started') && (
                    <>
                      <Button size="sm" variant="primary" onClick={() => onComplete(task.id)}>
                        <Check className="h-3 w-3 mr-1" aria-hidden="true" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStuck(task.id)}
                        className="text-red-600 hover:bg-red-50 dark:text-red-400"
                      >
                        <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                        Stuck
                      </Button>
                    </>
                  )}
                  {(outcome?.status === 'completed' || outcome?.status === 'stuck') && (
                    <Button size="sm" variant="ghost" onClick={() => onStart(task.id)}>
                      <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
                      Retry
                    </Button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={outcome?.notes || ''}
                    onChange={(e) => onNotes(task.id, e.target.value)}
                    placeholder="Any issues, confusions, or observations..."
                    rows={2}
                    className="w-full px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {outcome?.timeToCompleteMs && (
                  <p className="text-xs text-neutral-500 mt-2">
                    Time: {(outcome.timeToCompleteMs / 1000).toFixed(1)}s
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
