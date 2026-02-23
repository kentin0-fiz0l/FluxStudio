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
  ChevronDown,
  ChevronRight,
  Play,
  Check,
  AlertCircle,
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
import { TesterInfo, TaskOutcome, UserTestFeedback } from '@/services/userTestLogger';

export interface UserTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Define the test tasks
const TEST_TASKS = [
  {
    id: 'task-1',
    title: 'Find a project and click "Focus on this project"',
    successCriteria: 'ProjectContextBar appears with correct project name',
  },
  {
    id: 'task-2',
    title: 'Go to /messages and verify only project conversations are shown',
    successCriteria: 'Messages list shows only conversations from focused project',
  },
  {
    id: 'task-3',
    title: 'Open Pulse panel and review Activity tab',
    successCriteria: 'Pulse panel opens and shows Activity tab content',
  },
  {
    id: 'task-4',
    title: 'Trigger an activity and confirm it appears without refresh',
    successCriteria: 'Send a message; it appears in Activity tab in real-time',
  },
  {
    id: 'task-5',
    title: 'Go to /notifications and confirm scoped to focused project',
    successCriteria: 'Notifications are filtered to the focused project only',
  },
  {
    id: 'task-6',
    title: 'Click "Exit Focus" and verify /messages returns to global view',
    successCriteria: 'Messages show all conversations after exiting focus',
  },
  {
    id: 'task-7',
    title: 'Re-focus a project and verify focus persists on refresh',
    successCriteria: 'After page refresh, the project is still focused',
  },
];

type TabId = 'info' | 'tasks' | 'feedback';

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

// Tester Info Form Component
interface TesterInfoFormProps {
  testerInfo: TesterInfo | null;
  onSave: (info: TesterInfo) => void;
}

function TesterInfoForm({ testerInfo, onSave }: TesterInfoFormProps) {
  const [name, setName] = React.useState(testerInfo?.name || '');
  const [role, setRole] = React.useState<TesterInfo['role']>(testerInfo?.role || 'other');
  const [experience, setExperience] = React.useState<TesterInfo['experienceLevel']>(
    testerInfo?.experienceLevel || 'new'
  );

  const handleSave = () => {
    onSave({ name, role, experienceLevel: experience });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Name (optional)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name or alias"
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Role
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as TesterInfo['role'])}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500"
        >
          <option value="designer">Designer</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Experience with FluxStudio
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="experience"
              value="new"
              checked={experience === 'new'}
              onChange={() => setExperience('new')}
              className="text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">New user</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="experience"
              value="returning"
              checked={experience === 'returning'}
              onChange={() => setExperience('returning')}
              className="text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Returning user</span>
          </label>
        </div>
      </div>

      <Button variant="primary" size="sm" onClick={handleSave} className="w-full">
        Save Info
      </Button>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
        This information is stored locally and included in your test report.
      </p>
    </div>
  );
}

// Task List Component
interface TaskListProps {
  tasks: typeof TEST_TASKS;
  outcomes: TaskOutcome[];
  expandedTask: string | null;
  onExpand: (taskId: string | null) => void;
  onStart: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onStuck: (taskId: string) => void;
  onNotes: (taskId: string, notes: string) => void;
}

function TaskList({
  tasks,
  outcomes,
  expandedTask,
  onExpand,
  onStart,
  onComplete,
  onStuck,
  onNotes,
}: TaskListProps) {
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

// Feedback Form Component
interface FeedbackFormProps {
  feedback: UserTestFeedback | null;
  onSave: (feedback: UserTestFeedback) => void;
}

function FeedbackForm({ feedback, onSave }: FeedbackFormProps) {
  const [confusions, setConfusions] = React.useState<string[]>(
    feedback?.topConfusions || ['', '', '']
  );
  const [clarity, setClarity] = React.useState(feedback?.clarityRating || 5);
  const [speed, setSpeed] = React.useState(feedback?.speedRating || 5);
  const [delight, setDelight] = React.useState(feedback?.delightRating || 5);
  const [comments, setComments] = React.useState(feedback?.additionalComments || '');

  const handleSave = () => {
    onSave({
      topConfusions: confusions.filter(c => c.trim() !== ''),
      clarityRating: clarity,
      speedRating: speed,
      delightRating: delight,
      additionalComments: comments.trim() || undefined,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Top Confusions (up to 3)
        </label>
        {confusions.map((c, i) => (
          <input
            key={i}
            type="text"
            value={c}
            onChange={(e) => {
              const updated = [...confusions];
              updated[i] = e.target.value;
              setConfusions(updated);
            }}
            placeholder={`Confusion ${i + 1}`}
            className="w-full px-3 py-2 mb-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 text-sm"
          />
        ))}
      </div>

      <RatingInput label="Clarity" sublabel="How clear was the flow?" value={clarity} onChange={setClarity} />
      <RatingInput label="Speed" sublabel="How quick did tasks feel?" value={speed} onChange={setSpeed} />
      <RatingInput label="Delight" sublabel="How enjoyable was the experience?" value={delight} onChange={setDelight} />

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Additional Comments
        </label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Any other thoughts, suggestions, or issues..."
          rows={4}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 text-sm"
        />
      </div>

      <Button variant="primary" size="sm" onClick={handleSave} className="w-full">
        Save Feedback
      </Button>
    </div>
  );
}

// Rating Input Component
interface RatingInputProps {
  label: string;
  sublabel: string;
  value: number;
  onChange: (value: number) => void;
}

function RatingInput({ label, sublabel, value, onChange }: RatingInputProps) {
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

export default UserTestPanel;
