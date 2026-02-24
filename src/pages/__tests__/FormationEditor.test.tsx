/**
 * FormationEditor Page Tests
 *
 * Tests the formation editor page with 2D/3D view switching, breadcrumb navigation,
 * and object editing capabilities.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  })),
}));

vi.mock('@/contexts/NotificationContext', () => ({
  useNotification: vi.fn(() => ({
    showNotification: vi.fn(),
    addNotification: vi.fn(),
  })),
}));

vi.mock('@/contexts/KeyboardShortcutsContext', () => ({
  useRegisterShortcuts: vi.fn(),
}));

vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/formation', () => ({
  FormationCanvas: ({ onSave, onClose }: any) => (
    <div data-testid="formation-canvas">
      <button onClick={() => onSave?.({ id: 'f1', name: 'Test', performers: [], keyframes: [] })}>Save</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/error/ErrorBoundary', () => ({
  FormationEditorErrorBoundary: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
}));

vi.mock('@/components/formation/ViewToggle', () => ({
  ViewToggle: ({ mode, onChange }: any) => (
    <div data-testid="view-toggle">
      <button onClick={() => onChange('2d')}>2D</button>
      <button onClick={() => onChange('3d')}>3D</button>
      <button onClick={() => onChange('split')}>Split</button>
      <span>{mode}</span>
    </div>
  ),
}));

vi.mock('@/components/formation/Scene3DToolbar', () => ({
  Scene3DToolbar: (_props: any) => <div data-testid="scene-3d-toolbar" />,
}));

vi.mock('@/components/formation/Formation3DView', () => ({
  Formation3DView: () => <div data-testid="formation-3d-view" />,
}));

vi.mock('@/components/object-editor/ObjectEditorModal', () => ({
  ObjectEditorModal: () => <div data-testid="object-editor-modal" />,
}));

vi.mock('@/components/object-editor/PropLibraryPanel', () => ({
  PropLibraryPanel: () => <div data-testid="prop-library-panel" />,
}));

vi.mock('@/components/object-editor/ModelImporter', () => ({
  ModelImporter: () => <div data-testid="model-importer" />,
}));

vi.mock('@/components/object-editor/PrimitiveBuilder', () => ({
  PrimitiveBuilder: () => <div data-testid="primitive-builder" />,
}));

vi.mock('@/hooks/useScene3D', () => ({
  useScene3D: vi.fn(() => ({
    viewMode: '2d',
    setViewMode: vi.fn(),
    objects: {},
    objectList: [],
    selectedObject: null,
    selectedObjectId: null,
    activeTool: 'select',
    settings: { showGrid: true, showLabels: true, showShadows: true },
    selectObject: vi.fn(),
    updateObject: vi.fn(),
    updateObjectPosition: vi.fn(),
    removeObject: vi.fn(),
    addPrimitive: vi.fn(),
    addProp: vi.fn(),
    addObject: vi.fn(),
    clearScene: vi.fn(),
    setActiveTool: vi.fn(),
    updateSettings: vi.fn(),
    duplicateSelected: vi.fn(),
    isObjectEditorOpen: false,
    isPropLibraryOpen: false,
    isModelImporterOpen: false,
    isPrimitiveBuilderOpen: false,
    setObjectEditorOpen: vi.fn(),
    setPropLibraryOpen: vi.fn(),
    setModelImporterOpen: vi.fn(),
    setPrimitiveBuilderOpen: vi.fn(),
  })),
}));

vi.mock('@/services/formationsApi', () => ({
  saveSceneObjects: vi.fn().mockResolvedValue(undefined),
  fetchSceneObjects: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/formationService', () => ({
  Formation: {},
}));

import FormationEditor from '../FormationEditor';

describe('FormationEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderEditor = (path = '/projects/proj-1/formations/new') => {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/projects/:projectId/formations/:formationId" element={<FormationEditor />} />
          <Route path="/projects/:projectId/formations" element={<FormationEditor />} />
        </Routes>
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    const { container } = renderEditor();
    expect(container.firstChild).toBeTruthy();
  });

  test('displays breadcrumb navigation', () => {
    renderEditor();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Formations')).toBeInTheDocument();
  });

  test('shows "New Formation" for new formation route', () => {
    renderEditor('/projects/proj-1/formations/new');
    expect(screen.getByText('New Formation')).toBeInTheDocument();
  });

  test('shows "Edit Formation" for existing formation route', () => {
    renderEditor('/projects/proj-1/formations/form-123');
    expect(screen.getByText('Edit Formation')).toBeInTheDocument();
  });

  test('displays view toggle', () => {
    renderEditor();
    expect(screen.getByTestId('view-toggle')).toBeInTheDocument();
  });

  test('renders formation canvas in 2D mode', () => {
    renderEditor();
    expect(screen.getByTestId('formation-canvas')).toBeInTheDocument();
  });

  test('displays back button', () => {
    renderEditor();
    expect(screen.getByLabelText('Back to Project')).toBeInTheDocument();
  });

  test('back button navigates to project page', () => {
    renderEditor();
    const backButton = screen.getByLabelText('Back to Project');
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-1');
  });

  test('shows Project Not Found when projectId is missing', () => {
    render(
      <MemoryRouter initialEntries={['/formations']}>
        <Routes>
          <Route path="/formations" element={<FormationEditor />} />
          <Route path="/projects/:projectId/formations/:formationId" element={<FormationEditor />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Project Not Found')).toBeInTheDocument();
  });
});
