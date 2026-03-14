/**
 * FormationPromptBar Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';

const mockSetPreview = vi.fn();
const mockClearPreview = vi.fn();

vi.mock('@/store/slices/ghostPreviewSlice', () => ({
  useGhostPreview: vi.fn(() => ({
    activePreview: null,
    setPreview: mockSetPreview,
    clearPreview: mockClearPreview,
  })),
}));

vi.mock('@/services/promptParser', () => ({
  parsePrompt: vi.fn(() => ({ type: 'formation', formation: 'circle' })),
}));

vi.mock('@/services/promptExecutor', () => ({
  executePromptCommand: vi.fn(() => ({
    proposedPositions: new Map([['p1', { x: 50, y: 50 }]]),
    affectedPerformerIds: ['p1'],
  })),
}));

vi.mock('@/services/formationTemplates', () => ({
  FORMATION_TEMPLATES: [
    { id: 'company_front', name: 'Company Front', thumbnail: 'M5,20L35,20' },
    { id: 'wedge', name: 'Wedge', thumbnail: 'M20,5L5,35L35,35Z' },
  ],
  snapToTemplate: vi.fn(() => new Map([['p1', { x: 40, y: 40 }]])),
}));

vi.mock('./VoiceInputButton', () => ({
  VoiceInputButton: ({ onTranscript }: any) => (
    <button data-testid="voice-btn" onClick={() => onTranscript('circle formation')}>
      Voice
    </button>
  ),
}));

import { FormationPromptBar } from '../FormationPromptBar';
import type { Performer, Position } from '@/services/formationTypes';

describe('FormationPromptBar', () => {
  const mockPerformers: Performer[] = [
    { id: 'p1', name: 'Alice', instrument: 'trumpet' } as Performer,
    { id: 'p2', name: 'Bob', instrument: 'trombone' } as Performer,
  ];

  const mockPositions = new Map<string, Position>([
    ['p1', { x: 10, y: 10 }],
    ['p2', { x: 20, y: 20 }],
  ]);

  const defaultProps = {
    performers: mockPerformers,
    currentPositions: mockPositions,
    selectedPerformerIds: [],
    onApplyPositions: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- Basic rendering ----------

  test('renders input with formation description placeholder', () => {
    render(<FormationPromptBar {...defaultProps} />);
    expect(screen.getByLabelText('Formation description')).toBeInTheDocument();
  });

  test('renders generate button', () => {
    render(<FormationPromptBar {...defaultProps} />);
    expect(screen.getByLabelText('Generate formation')).toBeInTheDocument();
  });

  test('renders keyboard shortcut hint', () => {
    render(<FormationPromptBar {...defaultProps} />);
    expect(screen.getByText('Enter')).toBeInTheDocument();
  });

  // ---------- Disabled state (no performers) ----------

  test('disables input when no performers', () => {
    render(<FormationPromptBar {...defaultProps} performers={[]} />);
    const input = screen.getByLabelText('Formation description');
    expect(input).toBeDisabled();
  });

  test('shows "Add performers first" placeholder when no performers', () => {
    render(<FormationPromptBar {...defaultProps} performers={[]} />);
    expect(screen.getByPlaceholderText('Add performers first...')).toBeInTheDocument();
  });

  // ---------- Generate button state ----------

  test('generate button is disabled when input is empty', () => {
    render(<FormationPromptBar {...defaultProps} />);
    const btn = screen.getByLabelText('Generate formation');
    expect(btn).toBeDisabled();
  });

  test('generate button is enabled when input has text and performers exist', () => {
    render(<FormationPromptBar {...defaultProps} />);
    const input = screen.getByLabelText('Formation description');
    fireEvent.change(input, { target: { value: 'circle' } });
    const btn = screen.getByLabelText('Generate formation');
    expect(btn).not.toBeDisabled();
  });

  // ---------- Prompt input ----------

  test('updates prompt state on input change', () => {
    render(<FormationPromptBar {...defaultProps} />);
    const input = screen.getByLabelText('Formation description') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'wedge formation' } });
    expect(input.value).toBe('wedge formation');
  });

  test('pre-fills input with initialPrompt', () => {
    render(<FormationPromptBar {...defaultProps} initialPrompt="diamond" />);
    const input = screen.getByLabelText('Formation description') as HTMLInputElement;
    expect(input.value).toBe('diamond');
  });

  // ---------- Suggestion chips ----------

  test('shows suggestion chips on input focus', () => {
    render(<FormationPromptBar {...defaultProps} />);
    const input = screen.getByLabelText('Formation description');
    fireEvent.focus(input);
    expect(screen.getByText('Quick formations')).toBeInTheDocument();
    expect(screen.getByText('Company front')).toBeInTheDocument();
    expect(screen.getByText('Block')).toBeInTheDocument();
    expect(screen.getByText('Circle')).toBeInTheDocument();
  });

  // ---------- Template chips ----------

  test('shows template chips in suggestions panel', () => {
    render(<FormationPromptBar {...defaultProps} />);
    const input = screen.getByLabelText('Formation description');
    fireEvent.focus(input);
    expect(screen.getByText('Snap to template')).toBeInTheDocument();
    expect(screen.getByText('Company Front')).toBeInTheDocument();
    // "Wedge" appears in both suggestions and template chips
    const wedgeElements = screen.getAllByText('Wedge');
    expect(wedgeElements.length).toBeGreaterThanOrEqual(1);
  });

  // ---------- Minimized state ----------

  test('shows minimized state after clicking minimize button', () => {
    render(<FormationPromptBar {...defaultProps} />);
    const minimizeBtn = screen.getByLabelText('Minimize prompt bar');
    fireEvent.click(minimizeBtn);
    expect(screen.getByLabelText('Open formation prompt')).toBeInTheDocument();
    expect(screen.getByText('Describe a formation...')).toBeInTheDocument();
  });

  test('restores expanded state from minimized', () => {
    render(<FormationPromptBar {...defaultProps} />);
    // Minimize
    fireEvent.click(screen.getByLabelText('Minimize prompt bar'));
    // Re-expand
    fireEvent.click(screen.getByLabelText('Open formation prompt'));
    expect(screen.getByLabelText('Formation description')).toBeInTheDocument();
  });

  // ---------- Error display ----------

  test('displays error text in the bar', async () => {
    const { executePromptCommand } = await import('@/services/promptExecutor');
    vi.mocked(executePromptCommand).mockReturnValueOnce({
      proposedPositions: new Map(),
      affectedPerformerIds: [],
    } as any);

    render(<FormationPromptBar {...defaultProps} />);
    const input = screen.getByLabelText('Formation description');
    fireEvent.change(input, { target: { value: 'nonsense' } });
    fireEvent.click(screen.getByLabelText('Generate formation'));

    // The generation runs in a setTimeout(100ms) — wait for it
    await vi.waitFor(() => {
      expect(screen.getByText('No performers matched')).toBeInTheDocument();
    });
  });
});
