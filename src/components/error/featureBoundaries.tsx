/**
 * Feature-specific error boundary wrappers.
 * Each provides appropriate fallback UI and logging for its domain.
 */

import { ReactNode, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui/button';
import { createLogger } from '../../lib/logger';
import { ErrorBoundary } from './ErrorBoundary';
import { PageErrorFallback } from './fallbacks/PageErrorFallback';
import { InlineErrorFallback } from './fallbacks/InlineErrorFallback';

const boundaryLogger = createLogger('ErrorBoundary');

// ============================================================================
// Pre-built fallback elements (module-level constants to avoid re-creation)
// ============================================================================

const FORMATION_EDITOR_FALLBACK = (
  <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center">
    <AlertTriangle className="h-8 w-8 text-orange-500 mb-3" aria-hidden="true" />
    <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">Formation Editor Error</h4>
    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
      The canvas encountered an error. Your work has been preserved.
    </p>
    <Button size="sm" onClick={() => window.location.reload()}>
      <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
      Reload Editor
    </Button>
  </div>
);

const AI_PANEL_FALLBACK = (
  <div className="flex flex-col items-center justify-center p-6 text-center">
    <AlertTriangle className="h-6 w-6 text-yellow-500 mb-2" aria-hidden="true" />
    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">AI Assistant Unavailable</p>
    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
      The AI features encountered an error. Please try again.
    </p>
    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
      <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
      Retry
    </Button>
  </div>
);

const FORMATION_3D_VIEW_FALLBACK = (
  <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center">
    <AlertTriangle className="h-8 w-8 text-orange-500 mb-3" aria-hidden="true" />
    <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">3D View Unavailable</h4>
    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
      The 3D renderer encountered an error. Try switching to 2D view or reload.
    </p>
    <Button size="sm" onClick={() => window.location.reload()}>
      <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
      Reload
    </Button>
  </div>
);

const AUDIO_SYNC_TIMELINE_FALLBACK = (
  <div className="flex flex-col items-center justify-center h-24 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-4 text-center">
    <AlertTriangle className="h-5 w-5 text-orange-500 mb-2" aria-hidden="true" />
    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Audio Timeline Unavailable</p>
    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
      <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
      Reload
    </Button>
  </div>
);

export function MessagingErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolateComponent
      onError={(error) => boundaryLogger.error('Messaging error', error)}
      fallback={
        <InlineErrorFallback
          title="Messaging Unavailable"
          message="Unable to load messaging. Please refresh the page or try again later."
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function WorkflowErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolateComponent
      onError={(error) => boundaryLogger.error('Workflow error', error)}
      fallback={
        <InlineErrorFallback
          title="Workflow Engine Error"
          message="Workflow features are temporarily unavailable. Core functionality remains accessible."
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function CollaborationErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolateComponent
      retryable={true}
      onError={(error) => boundaryLogger.error('Collaboration error', error)}
      fallback={
        <InlineErrorFallback
          title="Collaboration Features Limited"
          message="Real-time collaboration is temporarily unavailable. You can continue working normally."
          variant="default"
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function FilesErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error) => boundaryLogger.error('Files page error', error)}
      fallback={
        <PageErrorFallback
          iconBgColor="bg-orange-100"
          icon={<AlertTriangle className="h-6 w-6 text-orange-600" aria-hidden="true" />}
          title="Files Unavailable"
          message="We're having trouble loading your files. Please try again."
          primaryAction={{ label: 'Reload', onClick: () => window.location.reload(), icon: <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" /> }}
          secondaryAction={{ label: 'Projects', onClick: () => { window.location.href = '/projects'; }, icon: <Home className="h-4 w-4 mr-2" aria-hidden="true" /> }}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function ToolsErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error) => boundaryLogger.error('Tools page error', error)}
      fallback={
        <PageErrorFallback
          iconBgColor="bg-purple-100"
          icon={<AlertTriangle className="h-6 w-6 text-purple-600" aria-hidden="true" />}
          title="Tools Unavailable"
          message="We're having trouble loading this tool. Please try again."
          primaryAction={{ label: 'Reload', onClick: () => window.location.reload(), icon: <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" /> }}
          secondaryAction={{ label: 'All Tools', onClick: () => { window.location.href = '/tools'; } }}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function ProjectsErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error) => boundaryLogger.error('Projects page error', error)}
      fallback={
        <PageErrorFallback
          iconBgColor="bg-blue-100"
          icon={<AlertTriangle className="h-6 w-6 text-blue-600" aria-hidden="true" />}
          title="Projects Unavailable"
          message="We're having trouble loading your projects. Please try again."
          primaryAction={{ label: 'Reload', onClick: () => window.location.reload(), icon: <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" /> }}
          secondaryAction={{ label: 'Home', onClick: () => { window.location.href = '/'; }, icon: <Home className="h-4 w-4 mr-2" aria-hidden="true" /> }}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function FormationEditorErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolateComponent
      retryable
      onError={(error) => boundaryLogger.error('Formation editor error', error)}
      fallback={FORMATION_EDITOR_FALLBACK}
    >
      {children}
    </ErrorBoundary>
  );
}

export function AIErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolateComponent
      retryable
      onError={(error) => boundaryLogger.error('AI panel error', error)}
      fallback={AI_PANEL_FALLBACK}
    >
      {children}
    </ErrorBoundary>
  );
}

export function FileUploadErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolateComponent
      retryable
      onError={(error) => boundaryLogger.error('File upload error', error)}
      fallback={
        <InlineErrorFallback
          title="Upload Error"
          message="File upload failed. Please try uploading again."
          variant="default"
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function Formation3DViewErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolateComponent
      retryable
      onError={(error) => boundaryLogger.error('Formation 3D view error', error)}
      fallback={FORMATION_3D_VIEW_FALLBACK}
    >
      {children}
    </ErrorBoundary>
  );
}

export function AudioSyncTimelineErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolateComponent
      retryable
      onError={(error) => boundaryLogger.error('Audio sync timeline error', error)}
      fallback={AUDIO_SYNC_TIMELINE_FALLBACK}
    >
      {children}
    </ErrorBoundary>
  );
}

export function ConnectorsErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error) => boundaryLogger.error('Connectors page error', error)}
      fallback={
        <PageErrorFallback
          wrapperClassName="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-center justify-center p-4"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          icon={<AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
          title="Integrations Unavailable"
          message="We're having trouble loading your integrations. Your connected services are not affected."
          primaryAction={{ label: 'Reload', onClick: () => window.location.reload(), icon: <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" /> }}
          secondaryAction={{ label: 'Projects', onClick: () => { window.location.href = '/projects'; }, icon: <Home className="h-4 w-4 mr-2" aria-hidden="true" /> }}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Resettable inline error boundary with "Try again" support.
 * Uses a key to force remount and reset the ErrorBoundary on retry.
 */
function ResettableFeatureBoundary({
  children,
  message,
  logLabel,
}: {
  children: ReactNode;
  message: string;
  logLabel: string;
}) {
  const [resetKey, setResetKey] = useState(0);
  const handleRetry = useCallback(() => setResetKey((k) => k + 1), []);

  return (
    <ErrorBoundary
      key={resetKey}
      isolateComponent
      onError={(error) => boundaryLogger.error(`${logLabel} error`, error)}
      fallback={
        <div className="flex flex-col items-center justify-center p-4 text-center rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 m-2">
          <AlertTriangle className="h-5 w-5 text-orange-500 mb-2" aria-hidden="true" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            {message}
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Try again
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function ChatMessageListErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ResettableFeatureBoundary message="Messages could not be loaded" logLabel="ChatMessageList">
      {children}
    </ResettableFeatureBoundary>
  );
}

export function DrillCritiquePanelErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ResettableFeatureBoundary message="AI analysis temporarily unavailable" logLabel="DrillCritiquePanel">
      {children}
    </ResettableFeatureBoundary>
  );
}

export function FormationVersionHistoryErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ResettableFeatureBoundary message="Version history unavailable" logLabel="FormationVersionHistory">
      {children}
    </ResettableFeatureBoundary>
  );
}
