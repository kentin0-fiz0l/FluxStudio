/**
 * CanvasToolbar Component Tests
 *
 * Tests tool buttons, active tool highlight, undo/redo, zoom controls.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback: string) => fallback || key }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../FormationPresencePanel', () => ({
  FormationPresencePanel: () => <div data-testid="presence-panel" />,
}));

vi.mock('@/store/slices/offlineSlice', () => ({
  useSyncStatus: () => ({ isOnline: true, pendingCount: 0, syncStatus: 'idle' }),
}));

vi.mock('@/services/observability', () => ({
  observability: { analytics: { track: vi.fn() } },
}));

import { CanvasToolbar } from '../CanvasToolbar';

function defaultProps(overrides: Partial<Parameters<typeof CanvasToolbar>[0]> = {}) {
  return {
    activeTool: 'select' as const,
    setActiveTool: vi.fn(),
    showGrid: true,
    setShowGrid: vi.fn(),
    showLabels: true,
    setShowLabels: vi.fn(),
    showRotation: false,
    setShowRotation: vi.fn(),
    showPaths: false,
    setShowPaths: vi.fn(),
    snapEnabled: false,
    setSnapEnabled: vi.fn(),
    timeDisplayMode: 'time' as const,
    setTimeDisplayMode: vi.fn(),
    showFieldOverlay: false,
    setShowFieldOverlay: vi.fn(),
    zoom: 1,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    formationName: 'My Formation',
    onNameChange: vi.fn(),
    isCollaborativeEnabled: false,
    collab: { collaborators: [], isConnected: false, isSyncing: false },
    currentUser: null,
    showPerformerPanel: false,
    setShowPerformerPanel: vi.fn(),
    showAudioPanel: false,
    setShowAudioPanel: vi.fn(),
    hasAudioTrack: false,
    setShowTemplatePicker: vi.fn(),
    setIsExportDialogOpen: vi.fn(),
    onSave: vi.fn(),
    saveStatus: 'idle' as const,
    apiSaving: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    canUndo: true,
    canRedo: false,
    ...overrides,
  };
}

describe('CanvasToolbar', () => {
  test('renders tool buttons with correct aria labels', () => {
    render(<CanvasToolbar {...defaultProps()} />);
    expect(screen.getAllByLabelText('Select tool').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Pan tool').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Add performer tool').length).toBeGreaterThan(0);
  });

  test('shows active tool as pressed', () => {
    render(<CanvasToolbar {...defaultProps({ activeTool: 'pan' })} />);
    const panButtons = screen.getAllByLabelText('Pan tool');
    expect(panButtons.some(b => b.getAttribute('aria-pressed') === 'true')).toBe(true);
  });

  test('calls setActiveTool when tool button is clicked', async () => {
    const setActiveTool = vi.fn();
    const { user } = render(<CanvasToolbar {...defaultProps({ setActiveTool })} />);
    const panButtons = screen.getAllByLabelText('Pan tool');
    await user.click(panButtons[0]);
    expect(setActiveTool).toHaveBeenCalledWith('pan');
  });

  test('renders zoom percentage display', () => {
    render(<CanvasToolbar {...defaultProps({ zoom: 0.75 })} />);
    expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
  });

  test('calls onZoomIn when zoom in button is clicked', async () => {
    const onZoomIn = vi.fn();
    const { user } = render(<CanvasToolbar {...defaultProps({ onZoomIn })} />);
    const zoomInBtns = screen.getAllByLabelText('Zoom in');
    await user.click(zoomInBtns[0]);
    expect(onZoomIn).toHaveBeenCalled();
  });

  test('shows formation name input', () => {
    render(<CanvasToolbar {...defaultProps({ formationName: 'Test Show' })} />);
    const input = screen.getByDisplayValue('Test Show');
    expect(input).toBeTruthy();
  });

  test('shows save button with correct status text', () => {
    render(<CanvasToolbar {...defaultProps({ saveStatus: 'idle' })} />);
    expect(screen.getByText('Save')).toBeTruthy();
  });
});
