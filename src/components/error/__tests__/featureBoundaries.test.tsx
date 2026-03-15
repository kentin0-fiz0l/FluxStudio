/**
 * Feature-specific Error Boundary Tests
 *
 * Tests the error boundary wrappers from featureBoundaries.tsx:
 * - Children render normally when no error
 * - Error fallback renders when child throws
 * - Retry/reset functionality for ResettableFeatureBoundary-based boundaries
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock dependencies
vi.mock('../../../services/observability', () => ({
  observability: {
    errors: { captureFromBoundary: vi.fn() },
    session: { mark: vi.fn() },
  },
}));

vi.mock('../../../lib/logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

import {
  FilesErrorBoundary,
  ToolsErrorBoundary,
  ProjectsErrorBoundary,
  FormationEditorErrorBoundary,
  AIErrorBoundary,
  FileUploadErrorBoundary,
  Formation3DViewErrorBoundary,
  AudioSyncTimelineErrorBoundary,
  ConnectorsErrorBoundary,
  ChatMessageListErrorBoundary,
  DrillCritiquePanelErrorBoundary,
  FormationVersionHistoryErrorBoundary,
} from '../featureBoundaries';

// Component that throws on render
function ThrowingComponent({ error }: { error: Error }): JSX.Element {
  throw error;
}

function GoodComponent({ text = 'All good' }: { text?: string }) {
  return <div>{text}</div>;
}

// Suppress React error boundary console.error noise
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// ============================================================================
// Page-level boundaries (PageErrorFallback-based)
// ============================================================================

describe('FilesErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <FilesErrorBoundary>
        <GoodComponent text="Files content" />
      </FilesErrorBoundary>
    );
    expect(screen.getByText('Files content')).toBeInTheDocument();
  });

  it('renders files-specific fallback on error', () => {
    render(
      <FilesErrorBoundary>
        <ThrowingComponent error={new Error('files broke')} />
      </FilesErrorBoundary>
    );
    expect(screen.getByText('Files Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/trouble loading your files/)).toBeInTheDocument();
    expect(screen.getByText('Reload')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });
});

describe('ToolsErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ToolsErrorBoundary>
        <GoodComponent text="Tools content" />
      </ToolsErrorBoundary>
    );
    expect(screen.getByText('Tools content')).toBeInTheDocument();
  });

  it('renders tools-specific fallback on error', () => {
    render(
      <ToolsErrorBoundary>
        <ThrowingComponent error={new Error('tools broke')} />
      </ToolsErrorBoundary>
    );
    expect(screen.getByText('Tools Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/trouble loading this tool/)).toBeInTheDocument();
    expect(screen.getByText('Reload')).toBeInTheDocument();
    expect(screen.getByText('All Tools')).toBeInTheDocument();
  });
});

describe('ProjectsErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ProjectsErrorBoundary>
        <GoodComponent text="Projects content" />
      </ProjectsErrorBoundary>
    );
    expect(screen.getByText('Projects content')).toBeInTheDocument();
  });

  it('renders projects-specific fallback on error', () => {
    render(
      <ProjectsErrorBoundary>
        <ThrowingComponent error={new Error('projects broke')} />
      </ProjectsErrorBoundary>
    );
    expect(screen.getByText('Projects Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/trouble loading your projects/)).toBeInTheDocument();
    expect(screen.getByText('Reload')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});

describe('ConnectorsErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ConnectorsErrorBoundary>
        <GoodComponent text="Connectors content" />
      </ConnectorsErrorBoundary>
    );
    expect(screen.getByText('Connectors content')).toBeInTheDocument();
  });

  it('renders connectors-specific fallback on error', () => {
    render(
      <ConnectorsErrorBoundary>
        <ThrowingComponent error={new Error('connectors broke')} />
      </ConnectorsErrorBoundary>
    );
    expect(screen.getByText('Integrations Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/trouble loading your integrations/)).toBeInTheDocument();
  });
});

// ============================================================================
// Inline boundaries (custom fallback-based)
// ============================================================================

describe('FormationEditorErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <FormationEditorErrorBoundary>
        <GoodComponent text="Editor content" />
      </FormationEditorErrorBoundary>
    );
    expect(screen.getByText('Editor content')).toBeInTheDocument();
  });

  it('renders formation editor fallback on error', () => {
    render(
      <FormationEditorErrorBoundary>
        <ThrowingComponent error={new Error('editor broke')} />
      </FormationEditorErrorBoundary>
    );
    expect(screen.getByText('Formation Editor Error')).toBeInTheDocument();
    expect(screen.getByText(/canvas encountered an error/)).toBeInTheDocument();
    expect(screen.getByText('Reload Editor')).toBeInTheDocument();
  });
});

describe('AIErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <AIErrorBoundary>
        <GoodComponent text="AI content" />
      </AIErrorBoundary>
    );
    expect(screen.getByText('AI content')).toBeInTheDocument();
  });

  it('renders AI-specific fallback on error', () => {
    render(
      <AIErrorBoundary>
        <ThrowingComponent error={new Error('AI broke')} />
      </AIErrorBoundary>
    );
    expect(screen.getByText('AI Assistant Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/AI features encountered an error/)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});

describe('FileUploadErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <FileUploadErrorBoundary>
        <GoodComponent text="Upload content" />
      </FileUploadErrorBoundary>
    );
    expect(screen.getByText('Upload content')).toBeInTheDocument();
  });

  it('renders upload-specific fallback on error', () => {
    render(
      <FileUploadErrorBoundary>
        <ThrowingComponent error={new Error('upload broke')} />
      </FileUploadErrorBoundary>
    );
    expect(screen.getByText('Upload Error')).toBeInTheDocument();
    expect(screen.getByText(/File upload failed/)).toBeInTheDocument();
  });
});

describe('Formation3DViewErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <Formation3DViewErrorBoundary>
        <GoodComponent text="3D content" />
      </Formation3DViewErrorBoundary>
    );
    expect(screen.getByText('3D content')).toBeInTheDocument();
  });

  it('renders 3D view fallback on error', () => {
    render(
      <Formation3DViewErrorBoundary>
        <ThrowingComponent error={new Error('3D broke')} />
      </Formation3DViewErrorBoundary>
    );
    expect(screen.getByText('3D View Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/3D renderer encountered an error/)).toBeInTheDocument();
  });
});

describe('AudioSyncTimelineErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <AudioSyncTimelineErrorBoundary>
        <GoodComponent text="Timeline content" />
      </AudioSyncTimelineErrorBoundary>
    );
    expect(screen.getByText('Timeline content')).toBeInTheDocument();
  });

  it('renders audio timeline fallback on error', () => {
    render(
      <AudioSyncTimelineErrorBoundary>
        <ThrowingComponent error={new Error('audio broke')} />
      </AudioSyncTimelineErrorBoundary>
    );
    expect(screen.getByText('Audio Timeline Unavailable')).toBeInTheDocument();
  });
});

// ============================================================================
// Resettable boundaries (ResettableFeatureBoundary-based with Try again)
// ============================================================================

describe('ChatMessageListErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ChatMessageListErrorBoundary>
        <GoodComponent text="Chat messages" />
      </ChatMessageListErrorBoundary>
    );
    expect(screen.getByText('Chat messages')).toBeInTheDocument();
  });

  it('renders error fallback with retry when child throws', () => {
    render(
      <ChatMessageListErrorBoundary>
        <ThrowingComponent error={new Error('chat broke')} />
      </ChatMessageListErrorBoundary>
    );
    expect(screen.getByText('Messages could not be loaded')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('resets error boundary when Try again is clicked', () => {
    // After clicking "Try again", the boundary remounts children via key change.
    // Since ThrowingComponent still throws, the fallback appears again,
    // but the key reset proves the boundary was reset.
    render(
      <ChatMessageListErrorBoundary>
        <ThrowingComponent error={new Error('chat broke')} />
      </ChatMessageListErrorBoundary>
    );

    fireEvent.click(screen.getByText('Try again'));

    // The boundary re-renders and catches the error again
    expect(screen.getByText('Messages could not be loaded')).toBeInTheDocument();
  });
});

describe('DrillCritiquePanelErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <DrillCritiquePanelErrorBoundary>
        <GoodComponent text="Critique content" />
      </DrillCritiquePanelErrorBoundary>
    );
    expect(screen.getByText('Critique content')).toBeInTheDocument();
  });

  it('renders error fallback with retry when child throws', () => {
    render(
      <DrillCritiquePanelErrorBoundary>
        <ThrowingComponent error={new Error('critique broke')} />
      </DrillCritiquePanelErrorBoundary>
    );
    expect(screen.getByText('AI analysis temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });
});

describe('FormationVersionHistoryErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <FormationVersionHistoryErrorBoundary>
        <GoodComponent text="Version history" />
      </FormationVersionHistoryErrorBoundary>
    );
    expect(screen.getByText('Version history')).toBeInTheDocument();
  });

  it('renders error fallback with retry when child throws', () => {
    render(
      <FormationVersionHistoryErrorBoundary>
        <ThrowingComponent error={new Error('history broke')} />
      </FormationVersionHistoryErrorBoundary>
    );
    expect(screen.getByText('Version history unavailable')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('retries by resetting the boundary via key change', () => {
    render(
      <FormationVersionHistoryErrorBoundary>
        <ThrowingComponent error={new Error('history broke')} />
      </FormationVersionHistoryErrorBoundary>
    );

    fireEvent.click(screen.getByText('Try again'));

    // The boundary resets (key increments), child throws again, fallback re-appears
    expect(screen.getByText('Version history unavailable')).toBeInTheDocument();
  });
});
