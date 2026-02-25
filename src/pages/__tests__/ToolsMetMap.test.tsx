/**
 * ToolsMetMap Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com', displayName: 'Test User' },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  })),
  createAuthSlice: vi.fn(() => ({})),
  useSession: vi.fn(() => ({})),
}));

vi.mock('../../components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('../../contexts/MetMapContext', () => ({
  useMetMap: vi.fn(() => ({
    songs: [],
    songsLoading: false,
    filters: {},
    setFilters: vi.fn(),
    currentSong: null,
    currentSongLoading: false,
    editedSections: [],
    hasUnsavedChanges: false,
    playback: {
      isPlaying: false,
      isPaused: false,
      currentBar: 1,
      currentBeat: 1,
      currentTempo: 120,
      currentSectionIndex: 0,
      countingOff: false,
      countoffBeatsRemaining: 0,
    },
    stats: { songCount: 0, practiceCount: 0, totalPracticeMinutes: 0 },
    createSong: vi.fn(),
    loadSong: vi.fn(),
    updateSong: vi.fn(),
    deleteSong: vi.fn(),
    closeSong: vi.fn(),
    addSection: vi.fn(),
    updateSection: vi.fn(),
    removeSection: vi.fn(),
    reorderSections: vi.fn(),
    updateSectionChords: vi.fn(),
    saveSections: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    seekToBar: vi.fn(),
    loadStats: vi.fn(),
  })),
}));

vi.mock('@/store/slices/notificationSlice', () => ({
  createNotificationSlice: vi.fn(() => ({})),
  useNotifications: vi.fn(() => ({ state: { notifications: [] } })),
  useNotification: vi.fn(() => ({
    showNotification: vi.fn(),
  })),
  useNotificationInit: vi.fn(),
}));

vi.mock('@/store/slices/projectSlice', () => ({
  createProjectSlice: vi.fn(() => ({})),
  useProjects: vi.fn(() => ({ projects: [], loading: false })),
  useActiveProject: vi.fn(() => null),
  useProjectContext: vi.fn(() => ({
    currentProject: null,
    projects: [],
    isLoading: false,
  })),
  useCurrentProjectId: vi.fn(() => null),
  useRequiredProject: vi.fn(() => null),
}));

vi.mock('@/store', () => ({
  useProjectContext: vi.fn(() => ({
    currentProject: null,
    projects: [],
    isLoading: false,
  })),
}));

vi.mock('../../hooks/usePWA', () => ({
  usePWA: vi.fn(() => ({ isOnline: true })),
}));

vi.mock('../../hooks/useFirstTimeExperience', () => ({
  useFirstTimeExperience: vi.fn(() => ({
    markStepComplete: vi.fn(),
  })),
  ONBOARDING_STORAGE_KEYS: { metmapVisited: 'metmapVisited' },
}));

vi.mock('../../contexts/metmap', () => ({
  usePlayback: vi.fn(() => ({
    seekToTime: vi.fn(),
    setPlaybackMode: vi.fn(),
  })),
  useMetMapCore: vi.fn(() => ({
    state: { practiceHistory: [], stats: null, beatDetectionLoading: false, audioLoading: false, audioError: null },
    dispatch: vi.fn(),
  })),
  usePractice: vi.fn(() => ({
    loadPracticeHistory: vi.fn(),
  })),
}));

vi.mock('../../components/metmap/MetronomeAudio', () => ({
  useMetronomeAudio: vi.fn(() => ({ playClick: vi.fn() })),
}));

vi.mock('../../hooks/useMetMapKeyboardShortcuts', () => ({
  useMetMapKeyboardShortcuts: vi.fn(),
  ShortcutsHelp: () => <div data-testid="shortcuts-help" />,
}));

vi.mock('../../hooks/useMetMapHistory', () => ({
  useMetMapHistory: vi.fn(() => ({
    saveSnapshot: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
  })),
}));

vi.mock('../../hooks/useMetMapCollaboration', () => ({
  useMetMapCollaboration: vi.fn(() => ({
    status: 'disconnected',
    peerCount: 0,
    doc: null,
    awareness: null,
    reconnectAttempts: 0,
    forceReconnect: vi.fn(),
  })),
}));

vi.mock('../../hooks/useMetMapPresence', () => ({
  useMetMapPresence: vi.fn(() => ({
    peers: [],
    remotePeers: [],
    setEditingSection: vi.fn(),
    setCursorBarFast: vi.fn(),
  })),
}));

vi.mock('../../hooks/useMetMapUndo', () => ({
  useMetMapUndo: vi.fn(() => ({
    canUndo: false,
    canRedo: false,
    undo: vi.fn(),
    redo: vi.fn(),
  })),
}));

vi.mock('../../hooks/useConflictDetection', () => ({
  useConflictDetection: vi.fn(),
}));

vi.mock('../../hooks/useMetMapComments', () => ({
  useMetMapComments: vi.fn(() => ({
    comments: [],
    addComment: vi.fn(),
    replyToComment: vi.fn(),
    resolveComment: vi.fn(),
    deleteComment: vi.fn(),
    toggleReaction: vi.fn(),
  })),
}));

vi.mock('../../hooks/useMetMapSnapshots', () => ({
  useMetMapSnapshots: vi.fn(() => ({
    snapshots: [],
    isLoading: false,
    createSnapshot: vi.fn(),
    deleteSnapshot: vi.fn(),
    restoreSnapshot: vi.fn(),
    isCreating: false,
    isRestoring: false,
  })),
}));

vi.mock('../../hooks/useMetMapBranches', () => ({
  useMetMapBranches: vi.fn(() => ({
    branches: [],
    isLoading: false,
    createBranch: vi.fn(),
    deleteBranch: vi.fn(),
    mergeBranch: vi.fn(),
    isCreating: false,
    isMerging: false,
  })),
}));

vi.mock('../../components/metmap/TapTempo', () => ({
  TapTempo: () => <div data-testid="tap-tempo" />,
}));

vi.mock('../../components/metmap/SectionTemplates', () => ({
  SectionTemplates: () => <div data-testid="section-templates" />,
}));

vi.mock('../../components/metmap/VisualTimeline', () => ({
  VisualTimeline: () => <div data-testid="visual-timeline" />,
}));

vi.mock('../../components/metmap/PracticeMode', () => ({
  PracticeMode: () => <div data-testid="practice-mode" />,
}));

vi.mock('../../components/metmap/PracticeAnalytics', () => ({
  PracticeAnalytics: () => <div data-testid="practice-analytics" />,
}));

vi.mock('../../components/metmap/ExportImport', () => ({
  ExportImport: () => <div data-testid="export-import" />,
}));

vi.mock('../../components/metmap/WaveformTimeline', () => ({
  WaveformTimeline: () => <div data-testid="waveform-timeline" />,
}));

vi.mock('../../components/metmap/TimelineCanvas', () => ({
  TimelineCanvas: () => <div data-testid="timeline-canvas" />,
}));

vi.mock('../../components/metmap/BeatMarkers', () => ({
  BeatMarkers: () => <div data-testid="beat-markers" />,
}));

vi.mock('../../components/metmap/AudioTrackPanel', () => ({
  AudioTrackPanel: () => <div data-testid="audio-track-panel" />,
}));

vi.mock('../../components/metmap/AudioTrackMixer', () => ({
  AudioTrackMixer: () => <div data-testid="audio-track-mixer" />,
}));

vi.mock('../../components/metmap/KeyframeEditor', () => ({
  KeyframeEditor: () => <div data-testid="keyframe-editor" />,
}));

vi.mock('../../components/metmap/PresenceAvatars', () => ({
  PresenceAvatars: () => <div data-testid="presence-avatars" />,
}));

vi.mock('../../components/metmap/ConnectionStatus', () => ({
  ConnectionStatus: () => <div data-testid="connection-status" />,
}));

vi.mock('../../components/metmap/CanvasCommentLayer', () => ({
  CanvasCommentLayer: () => <div data-testid="canvas-comment-layer" />,
}));

vi.mock('../../components/metmap/SnapshotPanel', () => ({
  SnapshotPanel: () => <div data-testid="snapshot-panel" />,
}));

vi.mock('../../components/metmap/BranchSwitcher', () => ({
  BranchSwitcher: () => <div data-testid="branch-switcher" />,
}));

vi.mock('../../components/metmap/MetMapAIPanel', () => ({
  MetMapAIPanel: () => <div data-testid="metmap-ai-panel" />,
}));

vi.mock('../../components/metmap/MobilePlaybackControls', () => ({
  MobilePlaybackControls: () => <div data-testid="mobile-playback" />,
}));

vi.mock('../../components/pwa/OfflineIndicator', () => ({
  OfflineIndicator: () => <div data-testid="offline-indicator" />,
  NetworkStatusBadge: () => <div data-testid="network-status" />,
}));

vi.mock('../../services/beatDetection', () => ({
  detectBeatsWithCache: vi.fn(),
}));

vi.mock('../../utils/accessibility', () => ({
  announceToScreenReader: vi.fn(),
}));

vi.mock('../../utils/apiHelpers', () => ({
  getApiUrl: vi.fn((path: string) => path),
}));

vi.mock('./MetMapHelpers', () => ({
  useIsMobile: vi.fn(() => false),
  formatDuration: vi.fn((mins: number) => `${mins}m`),
  SongListItem: ({ song, onClick }: any) => (
    <div role="button" tabIndex={0} data-testid="song-list-item" onClick={onClick} onKeyDown={(e: any) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}>{song.title}</div>
  ),
  NewSongModal: ({ isOpen }: any) => isOpen ? <div data-testid="new-song-modal" /> : null,
}));

vi.mock('./MetMapComponents', () => ({
  SectionRow: () => <div data-testid="section-row" />,
  ChordGrid: () => <div data-testid="chord-grid" />,
  PlaybackControls: () => <div data-testid="playback-controls" />,
}));

import ToolsMetMap from '../ToolsMetMap';

describe('ToolsMetMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/tools/metmap']}>
        <ToolsMetMap />
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('displays breadcrumb navigation', () => {
    renderPage();
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('MetMap')).toBeInTheDocument();
  });

  test('shows project selection prompt when no project selected', () => {
    renderPage();
    expect(screen.getByText('Select a project to use MetMap')).toBeInTheDocument();
    expect(screen.getByText('Go to Projects')).toBeInTheDocument();
  });

  test('displays offline indicator', () => {
    renderPage();
    expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
  });
});
