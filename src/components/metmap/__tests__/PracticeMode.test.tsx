import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@/test/utils';
import { PracticeMode } from '../PracticeMode';
import type { Section } from '../../../contexts/metmap/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    name: 'Verse',
    orderIndex: 0,
    startBar: 0,
    bars: 8,
    timeSignature: '4/4',
    tempoStart: 120,
    chords: [],
    ...overrides,
  };
}

const defaultProps = {
  sections: [
    makeSection({ name: 'Intro', orderIndex: 0 }),
    makeSection({ name: 'Verse', orderIndex: 1 }),
    makeSection({ name: 'Chorus', orderIndex: 2 }),
  ],
  loopSection: null as number | null,
  onLoopSectionChange: vi.fn(),
  tempoPercent: 100,
  onTempoPercentChange: vi.fn(),
  repetitionCount: 0,
  isActive: false,
  onToggleActive: vi.fn(),
};

describe('PracticeMode', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the header with Practice Mode title', () => {
    render(<PracticeMode {...defaultProps} />);
    expect(screen.getByText('Practice Mode')).toBeInTheDocument();
  });

  it('shows Start Practice button when inactive', () => {
    render(<PracticeMode {...defaultProps} />);
    expect(screen.getByText('Start Practice')).toBeInTheDocument();
  });

  it('shows Exit Practice button when active', () => {
    render(<PracticeMode {...defaultProps} isActive />);
    expect(screen.getByText('Exit Practice')).toBeInTheDocument();
  });

  it('shows Active badge when active', () => {
    render(<PracticeMode {...defaultProps} isActive />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('calls onToggleActive when practice button clicked', async () => {
    const onToggleActive = vi.fn();
    const { user } = render(
      <PracticeMode {...defaultProps} onToggleActive={onToggleActive} />
    );
    await user.click(screen.getByText('Start Practice'));
    expect(onToggleActive).toHaveBeenCalled();
  });

  it('expands panel when header clicked', async () => {
    const { user } = render(<PracticeMode {...defaultProps} />);
    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('Loop Section')).toBeInTheDocument();
  });

  it('shows tempo slider and presets when expanded', async () => {
    const { user } = render(<PracticeMode {...defaultProps} />);
    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText(/Practice Tempo/)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('calls onTempoPercentChange when preset button clicked', async () => {
    const onTempoPercentChange = vi.fn();
    const { user } = render(
      <PracticeMode {...defaultProps} onTempoPercentChange={onTempoPercentChange} />
    );
    // Expand panel first
    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByText('60%'));
    expect(onTempoPercentChange).toHaveBeenCalledWith(60);
  });

  it('shows section buttons when expanded', async () => {
    const { user } = render(<PracticeMode {...defaultProps} />);
    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('All Sections')).toBeInTheDocument();
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Verse')).toBeInTheDocument();
    expect(screen.getByText('Chorus')).toBeInTheDocument();
  });

  it('calls onLoopSectionChange when section button clicked', async () => {
    const onLoopSectionChange = vi.fn();
    const { user } = render(
      <PracticeMode {...defaultProps} onLoopSectionChange={onLoopSectionChange} />
    );
    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByText('Verse'));
    expect(onLoopSectionChange).toHaveBeenCalledWith(1);
  });

  it('shows repetition count', async () => {
    const { user } = render(<PracticeMode {...defaultProps} repetitionCount={5} />);
    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Repetitions')).toBeInTheDocument();
  });

  it('shows looping section name in header when loop is active', () => {
    render(
      <PracticeMode {...defaultProps} loopSection={1} />
    );
    expect(screen.getByText('Looping: Verse')).toBeInTheDocument();
  });

  it('applies className prop', () => {
    const { container } = render(
      <PracticeMode {...defaultProps} className="custom-cls" />
    );
    expect(container.firstChild).toHaveClass('custom-cls');
  });

  it('fires onPracticeStart when starting practice', async () => {
    const onPracticeStart = vi.fn();
    const { user } = render(
      <PracticeMode {...defaultProps} onPracticeStart={onPracticeStart} />
    );
    await user.click(screen.getByText('Start Practice'));
    expect(onPracticeStart).toHaveBeenCalledWith(
      expect.objectContaining({
        autoRampEnabled: false,
        startTempoPercent: 100,
      })
    );
  });

  it('shows practice tips when expanded', async () => {
    const { user } = render(<PracticeMode {...defaultProps} />);
    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('Practice Tips:')).toBeInTheDocument();
  });
});
