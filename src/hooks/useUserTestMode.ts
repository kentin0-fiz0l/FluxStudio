/**
 * useUserTestMode - Hook for managing user test mode
 *
 * Enables user test mode via query param (?usertest=1) or localStorage.
 * Provides methods for logging events and managing test state.
 */

import * as React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/store/slices/authSlice';
import { useActiveProject } from '@/store';
import {
  userTestLogger,
  TesterInfo,
  TaskOutcome,
  UserTestFeedback,
} from '@/services/userTestLogger';

export interface UseUserTestModeReturn {
  /** Whether user test mode is enabled */
  isEnabled: boolean;
  /** Enable user test mode */
  enable: () => void;
  /** Disable user test mode */
  disable: () => void;
  /** Log an event */
  logEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
  /** Report a confusion moment */
  reportConfusion: (note?: string, activeSubpage?: string | null) => void;
  /** Tester info */
  testerInfo: TesterInfo | null;
  /** Save tester info */
  saveTesterInfo: (info: TesterInfo) => void;
  /** Task outcomes */
  taskOutcomes: TaskOutcome[];
  /** Save task outcomes */
  saveTaskOutcomes: (tasks: TaskOutcome[]) => void;
  /** Feedback */
  feedback: UserTestFeedback | null;
  /** Save feedback */
  saveFeedback: (feedback: UserTestFeedback) => void;
  /** Generate markdown report */
  generateReport: () => string;
  /** Generate JSON export */
  generateJsonExport: () => string;
  /** Copy report to clipboard */
  copyReportToClipboard: () => Promise<boolean>;
  /** Download JSON export */
  downloadJsonExport: () => void;
  /** Reset all test data */
  resetAll: () => void;
  /** Current route */
  currentRoute: string;
  /** Focused project ID */
  focusedProjectId: string | null;
}

export function useUserTestMode(): UseUserTestModeReturn {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  const activeProjectContext = useActiveProject();
  const activeProject = activeProjectContext?.activeProject ?? null;

  const [isEnabled, setIsEnabled] = React.useState(() => userTestLogger.isTestModeEnabled());
  const [testerInfo, setTesterInfo] = React.useState<TesterInfo | null>(() => userTestLogger.getTesterInfo());
  const [taskOutcomes, setTaskOutcomes] = React.useState<TaskOutcome[]>(() => userTestLogger.getTaskOutcomes());
  const [feedback, setFeedback] = React.useState<UserTestFeedback | null>(() => userTestLogger.getFeedback());

  // Check query param on mount and route changes
  React.useEffect(() => {
    const testParam = searchParams.get('usertest');
    if (testParam === '1' && !isEnabled) {
      userTestLogger.enable();
      setIsEnabled(true);
    }
  }, [searchParams, isEnabled]);

  // Log route changes
  React.useEffect(() => {
    if (isEnabled) {
      userTestLogger.log('route_change', { path: location.pathname }, {
        userId: user?.id,
        projectId: activeProject?.id,
      });
    }
  }, [location.pathname, isEnabled, user?.id, activeProject?.id]);

  const enable = React.useCallback(() => {
    userTestLogger.enable();
    setIsEnabled(true);
  }, []);

  const disable = React.useCallback(() => {
    userTestLogger.disable();
    setIsEnabled(false);
  }, []);

  const logEvent = React.useCallback((eventName: string, metadata: Record<string, unknown> = {}) => {
    userTestLogger.log(eventName, metadata, {
      userId: user?.id,
      projectId: activeProject?.id,
    });
  }, [user?.id, activeProject?.id]);

  const reportConfusion = React.useCallback((note?: string, activeSubpage?: string | null) => {
    userTestLogger.reportConfusion({
      route: location.pathname,
      focusedProjectId: activeProject?.id ?? null,
      activeSubpage: activeSubpage ?? null,
      note,
    });
  }, [location.pathname, activeProject?.id]);

  const saveTesterInfo = React.useCallback((info: TesterInfo) => {
    userTestLogger.saveTesterInfo(info);
    setTesterInfo(info);
  }, []);

  const saveTaskOutcomes = React.useCallback((tasks: TaskOutcome[]) => {
    userTestLogger.saveTaskOutcomes(tasks);
    setTaskOutcomes(tasks);
  }, []);

  const saveFeedback = React.useCallback((fb: UserTestFeedback) => {
    userTestLogger.saveFeedback(fb);
    setFeedback(fb);
  }, []);

  const generateReport = React.useCallback(() => {
    return userTestLogger.generateMarkdownReport();
  }, []);

  const generateJsonExport = React.useCallback(() => {
    return userTestLogger.generateJsonExport();
  }, []);

  const copyReportToClipboard = React.useCallback(async () => {
    try {
      const report = generateReport();
      await navigator.clipboard.writeText(report);
      return true;
    } catch (e) {
      console.error('Failed to copy report to clipboard:', e);
      return false;
    }
  }, [generateReport]);

  const downloadJsonExport = React.useCallback(() => {
    const json = generateJsonExport();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxstudio-usertest-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generateJsonExport]);

  const resetAll = React.useCallback(() => {
    userTestLogger.resetAll();
    setIsEnabled(false);
    setTesterInfo(null);
    setTaskOutcomes([]);
    setFeedback(null);
  }, []);

  return {
    isEnabled,
    enable,
    disable,
    logEvent,
    reportConfusion,
    testerInfo,
    saveTesterInfo,
    taskOutcomes,
    saveTaskOutcomes,
    feedback,
    saveFeedback,
    generateReport,
    generateJsonExport,
    copyReportToClipboard,
    downloadJsonExport,
    resetAll,
    currentRoute: location.pathname,
    focusedProjectId: activeProject?.id ?? null,
  };
}

export default useUserTestMode;
