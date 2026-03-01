/**
 * UserTestPanel - User Testing Harness for Project Focus + Pulse
 *
 * Provides a guided testing experience with:
 * - Tester information collection
 * - Task checklist with Start/Complete/Stuck actions
 * - Feedback form with ratings
 * - Report generation (Markdown + JSON)
 */

import * as React from 'react';
import {
  X,
  ClipboardCopy,
  Download,
  RefreshCw,
  Beaker,
  User,
  ListChecks,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUserTestMode } from '@/hooks/useUserTestMode';
import { TaskOutcome } from '@/services/userTestLogger';
import { TEST_TASKS, TabId } from './testTasks';
import { TesterInfoForm } from './TesterInfoForm';
import { TaskList } from './TaskList';
import { FeedbackForm } from './FeedbackForm';

export interface UserTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to detect active subpage from route
function detectActiveSubpage(route: string): string | null {
  const lowerRoute = route.toLowerCase();
  if (lowerRoute.includes('/messages')) return 'messages';
  if (lowerRoute.includes('/files')) return 'files';
  if (lowerRoute.includes('/assets')) return 'assets';
  if (lowerRoute.includes('/boards')) return 'boards';
  if (lowerRoute.includes('/pulse')) return 'pulse';
  if (lowerRoute.includes('/notifications')) return 'notifications';
  if (lowerRoute.includes('/settings')) return 'settings';
  if (lowerRoute.includes('/project')) return 'project';
  if (lowerRoute.includes('/dashboard')) return 'dashboard';
  return null;
}

export function UserTestPanel({ isOpen, onClose }: UserTestPanelProps) {
  const {
    logEvent,
    reportConfusion,
    testerInfo,
    saveTesterInfo,
    taskOutcomes,
    saveTaskOutcomes,
    feedback,
    saveFeedback,
    copyReportToClipboard,
    downloadJsonExport,
    resetAll,
    currentRoute,
  } = useUserTestMode();

  const [activeTab, setActiveTab] = React.useState<TabId>('info');
  const [copySuccess, setCopySuccess] = React.useState(false);
  const [expandedTask, setExpandedTask] = React.useState<string | null>(null);
  const [confusionNote, setConfusionNote] = React.useState('');
  const [showConfusionInput, setShowConfusionInput] = React.useState(false);
  const [confusionReported, setConfusionReported] = React.useState(false);

  // Initialize task outcomes if not set
  React.useEffect(() => {
    if (taskOutcomes.length === 0) {
      const initialTasks: TaskOutcome[] = TEST_TASKS.map(t => ({
        taskId: t.id,
        taskTitle: t.title,
        status: 'pending',
      }));
      saveTaskOutcomes(initialTasks);
    }
  }, [taskOutcomes.length, saveTaskOutcomes]);

  // Keyboard shortcut: Escape to close
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'Escape',
        action: onClose,
        description: 'Close User Test panel',
      },
    ],
    enabled: isOpen,
  });

  // Log panel open
  React.useEffect(() => {
    if (isOpen) {
      logEvent('usertest_panel_opened');
    }
  }, [isOpen, logEvent]);

  const handleStartTask = (taskId: string) => {
    const now = new Date().toISOString();
    const updated = taskOutcomes.map(t =>
      t.taskId === taskId
        ? { ...t, status: 'started' as const, startedAt: now }
        : t
    );
    saveTaskOutcomes(updated);
    logEvent('usertest_task_started', { taskId });
  };

  const handleCompleteTask = (taskId: string) => {
    const now = new Date().toISOString();
    const updated = taskOutcomes.map(t => {
      if (t.taskId === taskId) {
        const timeToComplete = t.startedAt
          ? new Date(now).getTime() - new Date(t.startedAt).getTime()
          : undefined;
        return {
          ...t,
          status: 'completed' as const,
          completedAt: now,
          timeToCompleteMs: timeToComplete,
        };
      }
      return t;
    });
    saveTaskOutcomes(updated);
    logEvent('usertest_task_completed', { taskId });
  };

  const handleStuckTask = (taskId: string) => {
    const updated = taskOutcomes.map(t =>
      t.taskId === taskId ? { ...t, status: 'stuck' as const } : t
    );
    saveTaskOutcomes(updated);
    logEvent('usertest_task_stuck', { taskId });
    setExpandedTask(taskId);
  };

  const handleTaskNotes = (taskId: string, notes: string) => {
    const updated = taskOutcomes.map(t =>
      t.taskId === taskId ? { ...t, notes } : t
    );
    saveTaskOutcomes(updated);
  };

  const handleCopyReport = async () => {
    const success = await copyReportToClipboard();
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      logEvent('usertest_report_copied');
    }
  };

  const handleDownloadJson = () => {
    downloadJsonExport();
    logEvent('usertest_json_downloaded');
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all test data? This cannot be undone.')) {
      resetAll();
      logEvent('usertest_data_reset');
    }
  };

  const handleReportConfusion = () => {
    if (showConfusionInput) {
      // Submit the confusion report
      const activeSubpage = detectActiveSubpage(currentRoute);
      reportConfusion(confusionNote.trim() || undefined, activeSubpage);
      setConfusionNote('');
      setShowConfusionInput(false);
      setConfusionReported(true);
      setTimeout(() => setConfusionReported(false), 2000);
    } else {
      setShowConfusionInput(true);
    }
  };

  const handleCancelConfusion = () => {
    setConfusionNote('');
    setShowConfusionInput(false);
  };

  if (!isOpen) return null;

  const completedCount = taskOutcomes.filter(t => t.status === 'completed').length;
  const stuckCount = taskOutcomes.filter(t => t.status === 'stuck').length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50"
        role="presentation"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-4 right-4 bottom-4 w-[420px] max-w-[calc(100vw-2rem)] z-50',
          'bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-800',
          'flex flex-col overflow-hidden',
          'animate-in slide-in-from-right-4 duration-200'
        )}
        role="dialog"
        aria-label="User Test Panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
              User Test Mode
            </h2>
            <Badge variant="warning" size="sm">
              Project Focus + Pulse
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close panel (Esc)"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1">
            <span>Progress: {completedCount}/{TEST_TASKS.length} tasks</span>
            {stuckCount > 0 && (
              <span className="text-red-600 dark:text-red-400">{stuckCount} stuck</span>
            )}
          </div>
          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${(completedCount / TEST_TASKS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Quick Action: Report Confusion */}
        <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-rose-50 dark:bg-rose-900/10">
          {!showConfusionInput ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReportConfusion}
              className={cn(
                'w-full text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700',
                'hover:bg-rose-100 dark:hover:bg-rose-900/30',
                confusionReported && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300'
              )}
              disabled={confusionReported}
            >
              <HelpCircle className="h-4 w-4 mr-1.5" aria-hidden="true" />
              {confusionReported ? 'Confusion Reported!' : "I'm confused right now"}
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                What's confusing? (optional, max 140 chars)
              </p>
              <input
                type="text"
                value={confusionNote}
                onChange={(e) => setConfusionNote(e.target.value.slice(0, 140))}
                placeholder="e.g., Not sure where to find..."
                className="w-full px-2 py-1.5 text-sm border border-rose-300 dark:border-rose-700 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-rose-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleReportConfusion();
                  if (e.key === 'Escape') handleCancelConfusion();
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">{confusionNote.length}/140</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelConfusion}
                    className="text-neutral-600 dark:text-neutral-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleReportConfusion}
                    className="bg-rose-600 hover:bg-rose-700"
                  >
                    Report
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800">
          {[
            { id: 'info' as const, label: 'Tester Info', icon: <User className="h-4 w-4" aria-hidden="true" /> },
            { id: 'tasks' as const, label: 'Tasks', icon: <ListChecks className="h-4 w-4" aria-hidden="true" /> },
            { id: 'feedback' as const, label: 'Feedback', icon: <MessageSquare className="h-4 w-4" aria-hidden="true" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5',
                'text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'info' && (
            <TesterInfoForm
              testerInfo={testerInfo}
              onSave={saveTesterInfo}
            />
          )}

          {activeTab === 'tasks' && (
            <TaskList
              tasks={TEST_TASKS}
              outcomes={taskOutcomes}
              expandedTask={expandedTask}
              onExpand={setExpandedTask}
              onStart={handleStartTask}
              onComplete={handleCompleteTask}
              onStuck={handleStuckTask}
              onNotes={handleTaskNotes}
            />
          )}

          {activeTab === 'feedback' && (
            <FeedbackForm
              feedback={feedback}
              onSave={saveFeedback}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" />
            Reset
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadJson}
            >
              <Download className="h-4 w-4 mr-1" aria-hidden="true" />
              JSON
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopyReport}
            >
              <ClipboardCopy className="h-4 w-4 mr-1" aria-hidden="true" />
              {copySuccess ? 'Copied!' : 'Copy Report'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default UserTestPanel;
