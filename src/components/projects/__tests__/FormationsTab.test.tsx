/**
 * FormationsTab Tests
 *
 * Tests the FormationsTab component:
 * - Empty state renders when formations array is empty
 * - Formations list renders when data exists
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockUseFormations = vi.fn();

vi.mock('../../../hooks/useFormations', () => ({
  useFormations: (...args: any[]) => mockUseFormations(...args),
}));

import { FormationsTab } from '../FormationsTab';

describe('FormationsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (projectId = 'proj-1') => {
    return render(
      <MemoryRouter>
        <FormationsTab projectId={projectId} />
      </MemoryRouter>
    );
  };

  test('renders loading state', () => {
    mockUseFormations.mockReturnValue({
      formations: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
    });

    renderComponent();
    // Loading spinner is rendered (an animated div with border classes)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  test('renders error state', () => {
    mockUseFormations.mockReturnValue({
      formations: [],
      loading: false,
      error: 'Failed to load formations',
      refetch: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
    });

    renderComponent();
    expect(screen.getByText('Failed to load formations')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('renders empty state when formations array is empty', () => {
    mockUseFormations.mockReturnValue({
      formations: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
    });

    renderComponent();
    expect(screen.getByText('No formations yet')).toBeInTheDocument();
    expect(screen.getByText('Create a formation to start designing drill sequences for your show.')).toBeInTheDocument();
    expect(screen.getByText('Create First Formation')).toBeInTheDocument();
  });

  test('renders formations list when data exists', () => {
    mockUseFormations.mockReturnValue({
      formations: [
        {
          id: 'form-1',
          name: 'Opening Formation',
          description: 'The opening drill',
          performerCount: 24,
          keyframeCount: 8,
          updatedAt: '2025-06-01T00:00:00.000Z',
        },
        {
          id: 'form-2',
          name: 'Halftime Show',
          description: null,
          performerCount: 48,
          keyframeCount: 12,
          updatedAt: '2025-06-15T00:00:00.000Z',
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
    });

    renderComponent();

    expect(screen.getByText('Opening Formation')).toBeInTheDocument();
    expect(screen.getByText('The opening drill')).toBeInTheDocument();
    expect(screen.getByText('Halftime Show')).toBeInTheDocument();

    // Verify performer and keyframe counts are displayed
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  test('renders header with New Formation button', () => {
    mockUseFormations.mockReturnValue({
      formations: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
    });

    renderComponent();
    expect(screen.getByText('Drill Formations')).toBeInTheDocument();
    expect(screen.getByText('New Formation')).toBeInTheDocument();
  });
});
