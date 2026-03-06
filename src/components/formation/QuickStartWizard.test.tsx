import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { QuickStartWizard } from './QuickStartWizard';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

vi.mock('../../services/fieldConfigService', () => ({
  getFieldPresetList: () => [
    { type: 'ncaa_football', name: 'NCAA Football', description: '100 yards, college hash marks' },
    { type: 'nfl_football', name: 'NFL Football', description: '100 yards, NFL hash marks' },
    { type: 'indoor_wgi', name: 'Indoor (WGI)', description: '90ft x 60ft indoor floor' },
  ],
}));

vi.mock('../../services/drillAiService', () => ({
  generateQuickStartShow: () => ({
    performers: [
      { name: 'Trumpet 1', label: 'T1', color: '#f59e0b', instrument: 'Trumpet', section: 'Brass', drillNumber: 'T1' },
      { name: 'Trumpet 2', label: 'T2', color: '#f59e0b', instrument: 'Trumpet', section: 'Brass', drillNumber: 'T2' },
    ],
    initialSets: [
      { name: 'Opening Set', counts: 8, description: 'Block formation' },
      { name: 'Set 2', counts: 16, description: 'Diagonal' },
    ],
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QuickStartWizard', () => {
  const onComplete = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the wizard dialog with step indicator', () => {
    render(<QuickStartWizard onComplete={onComplete} onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: /quick start wizard/i })).toBeInTheDocument();
    expect(screen.getByText('Quick Start')).toBeInTheDocument();

    // Step indicators
    expect(screen.getByText('Show Info')).toBeInTheDocument();
    expect(screen.getByText('Sections')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  test('step 1: shows Show Name input and Field Type selection', () => {
    render(<QuickStartWizard onComplete={onComplete} onClose={onClose} />);

    expect(screen.getByText('Show Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('My Show')).toBeInTheDocument();
    expect(screen.getByText('Field Type')).toBeInTheDocument();

    // Field type options from mock
    expect(screen.getByText('NCAA Football')).toBeInTheDocument();
    expect(screen.getByText('NFL Football')).toBeInTheDocument();
    expect(screen.getByText('Indoor (WGI)')).toBeInTheDocument();
  });

  test('clicking Next advances to step 2 (Sections)', { timeout: 15000 }, async () => {
    const { user } = render(
      <QuickStartWizard onComplete={onComplete} onClose={onClose} />,
    );

    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: Sections content
    expect(screen.getByText(/performers total/i)).toBeInTheDocument();
    expect(screen.getByText(/add row/i)).toBeInTheDocument();
  });

  test('step 2: displays default sections with performer count', { timeout: 15000 }, async () => {
    const { user } = render(
      <QuickStartWizard onComplete={onComplete} onClose={onClose} />,
    );

    await user.click(screen.getByRole('button', { name: /next/i }));

    // Should show total performer count (default sections sum to 70)
    expect(screen.getByText('70 performers total')).toBeInTheDocument();
  });

  test('Back button navigates to previous step', { timeout: 15000 }, async () => {
    const { user } = render(
      <QuickStartWizard onComplete={onComplete} onClose={onClose} />,
    );

    // Go to step 2
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/performers total/i)).toBeInTheDocument();

    // Go back to step 1
    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('Show Name')).toBeInTheDocument();
  });

  test('Cancel button on step 1 calls onClose', async () => {
    const { user } = render(
      <QuickStartWizard onComplete={onComplete} onClose={onClose} />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });

  test('close button in header calls onClose', async () => {
    const { user } = render(
      <QuickStartWizard onComplete={onComplete} onClose={onClose} />,
    );

    await user.click(screen.getByRole('button', { name: /close wizard/i }));

    expect(onClose).toHaveBeenCalled();
  });

  test('Next is disabled when show name is empty', async () => {
    const { user } = render(
      <QuickStartWizard onComplete={onComplete} onClose={onClose} />,
    );

    // Clear the default show name
    const input = screen.getByDisplayValue('My Show');
    await user.clear(input);

    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  test('step 3: shows duration and BPM inputs', { timeout: 15000 }, async () => {
    const { user } = render(
      <QuickStartWizard onComplete={onComplete} onClose={onClose} />,
    );

    // Navigate to step 3
    await user.click(screen.getByRole('button', { name: /next/i })); // Step 2
    await user.click(screen.getByRole('button', { name: /next/i })); // Step 3

    expect(screen.getByText(/show duration/i)).toBeInTheDocument();
    expect(screen.getByText(/music bpm/i)).toBeInTheDocument();
  });

  test('step 4: shows review with Create Show button and calls onComplete', { timeout: 15000 }, async () => {
    const { user } = render(
      <QuickStartWizard onComplete={onComplete} onClose={onClose} />,
    );

    // Navigate through all steps
    await user.click(screen.getByRole('button', { name: /next/i })); // Step 2
    await user.click(screen.getByRole('button', { name: /next/i })); // Step 3
    await user.click(screen.getByRole('button', { name: /next/i })); // Step 4 (Review)

    // Review content
    expect(screen.getByText(/ready to create/i)).toBeInTheDocument();
    expect(screen.getByText(/2 performers, 2 sets/)).toBeInTheDocument();

    // Show structure
    expect(screen.getByText('Opening Set')).toBeInTheDocument();
    expect(screen.getByText('Set 2')).toBeInTheDocument();

    // Click Create Show
    await user.click(screen.getByRole('button', { name: /create show/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const arg = onComplete.mock.calls[0][0];
    expect(arg.showName).toBe('My Show');
    expect(arg.fieldType).toBe('ncaa_football');
    expect(arg.performers).toHaveLength(2);
    expect(arg.initialSets).toHaveLength(2);
  });
});
