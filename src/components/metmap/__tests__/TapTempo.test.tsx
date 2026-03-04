import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@/test/utils';
import { TapTempo } from '../TapTempo';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));

describe('TapTempo', () => {
  let onTempoDetected: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onTempoDetected = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the tap button', () => {
    render(<TapTempo onTempoDetected={onTempoDetected} />);
    expect(screen.getByRole('button', { name: 'Tap to set tempo' })).toBeInTheDocument();
    expect(screen.getByText('Tap Tempo')).toBeInTheDocument();
  });

  it('shows tap count after tapping', () => {
    render(<TapTempo onTempoDetected={onTempoDetected} />);
    const btn = screen.getByRole('button', { name: 'Tap to set tempo' });

    vi.setSystemTime(0);
    act(() => { fireEvent.click(btn); });
    expect(screen.getByText('1 tap')).toBeInTheDocument();

    vi.setSystemTime(400);
    act(() => { fireEvent.click(btn); });
    expect(screen.getByText('2 taps')).toBeInTheDocument();
  });

  it('does not fire onTempoDetected until MIN_TAPS (3) reached', () => {
    render(<TapTempo onTempoDetected={onTempoDetected} />);
    const btn = screen.getByRole('button', { name: 'Tap to set tempo' });

    vi.setSystemTime(0);
    act(() => { fireEvent.click(btn); });
    vi.setSystemTime(500);
    act(() => { fireEvent.click(btn); });
    expect(onTempoDetected).not.toHaveBeenCalled();
  });

  it('calculates and reports BPM after 3 taps', () => {
    render(<TapTempo onTempoDetected={onTempoDetected} />);
    const btn = screen.getByRole('button', { name: 'Tap to set tempo' });

    vi.setSystemTime(0);
    act(() => { fireEvent.click(btn); });

    vi.setSystemTime(500); // 500ms interval = 120 BPM
    act(() => { fireEvent.click(btn); });

    vi.setSystemTime(1000);
    act(() => { fireEvent.click(btn); });

    expect(onTempoDetected).toHaveBeenCalledWith(120);
  });

  it('clamps BPM to range 20-300', () => {
    render(<TapTempo onTempoDetected={onTempoDetected} />);
    const btn = screen.getByRole('button', { name: 'Tap to set tempo' });

    // Very fast taps -> should clamp to 300
    vi.setSystemTime(0);
    act(() => { fireEvent.click(btn); });
    vi.setSystemTime(50);
    act(() => { fireEvent.click(btn); });
    vi.setSystemTime(100);
    act(() => { fireEvent.click(btn); });

    const lastCall = onTempoDetected.mock.calls[onTempoDetected.mock.calls.length - 1][0];
    expect(lastCall).toBeLessThanOrEqual(300);
    expect(lastCall).toBeGreaterThanOrEqual(20);
  });

  it('shows reset button after BPM is detected', () => {
    render(<TapTempo onTempoDetected={onTempoDetected} />);
    const btn = screen.getByRole('button', { name: 'Tap to set tempo' });

    vi.setSystemTime(0);
    act(() => { fireEvent.click(btn); });
    vi.setSystemTime(500);
    act(() => { fireEvent.click(btn); });
    vi.setSystemTime(1000);
    act(() => { fireEvent.click(btn); });

    expect(screen.getByRole('button', { name: 'Reset tap tempo' })).toBeInTheDocument();
  });

  it('resets state when reset button is clicked', () => {
    render(<TapTempo onTempoDetected={onTempoDetected} />);
    const btn = screen.getByRole('button', { name: 'Tap to set tempo' });

    vi.setSystemTime(0);
    act(() => { fireEvent.click(btn); });
    vi.setSystemTime(500);
    act(() => { fireEvent.click(btn); });
    vi.setSystemTime(1000);
    act(() => { fireEvent.click(btn); });

    const resetBtn = screen.getByRole('button', { name: 'Reset tap tempo' });
    act(() => { fireEvent.click(resetBtn); });

    expect(screen.getByText('Tap Tempo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset tap tempo' })).not.toBeInTheDocument();
  });

  it('resets if gap exceeds TAP_TIMEOUT_MS (2000ms)', () => {
    render(<TapTempo onTempoDetected={onTempoDetected} />);
    const btn = screen.getByRole('button', { name: 'Tap to set tempo' });

    vi.setSystemTime(0);
    act(() => { fireEvent.click(btn); });
    vi.setSystemTime(500);
    act(() => { fireEvent.click(btn); });

    // Long gap > 2000ms
    vi.setSystemTime(3000);
    act(() => { fireEvent.click(btn); });

    // Should have reset, so only 1 tap now
    expect(screen.getByText('1 tap')).toBeInTheDocument();
  });

  it('auto-resets after TAP_TIMEOUT_MS of inactivity', () => {
    render(<TapTempo onTempoDetected={onTempoDetected} />);
    const btn = screen.getByRole('button', { name: 'Tap to set tempo' });

    vi.setSystemTime(0);
    act(() => { fireEvent.click(btn); });

    act(() => { vi.advanceTimersByTime(2000); });

    // Active state should be cleared
    expect(screen.getByText('Tap Tempo')).toBeInTheDocument();
  });

  it('keeps only last MAX_TAPS (8) using sliding window', () => {
    render(<TapTempo onTempoDetected={onTempoDetected} />);
    const btn = screen.getByRole('button', { name: 'Tap to set tempo' });

    // Tap 10 times
    for (let i = 0; i < 10; i++) {
      vi.setSystemTime(i * 500);
      act(() => { fireEvent.click(btn); });
    }

    // Should show 8 taps (MAX_TAPS)
    expect(screen.getByText('8 taps')).toBeInTheDocument();
  });

  it('passes className to wrapper', () => {
    const { container } = render(
      <TapTempo onTempoDetected={onTempoDetected} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('cleans up timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount } = render(<TapTempo onTempoDetected={onTempoDetected} />);
    const btn = screen.getByRole('button', { name: 'Tap to set tempo' });

    vi.setSystemTime(0);
    act(() => { fireEvent.click(btn); });

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('displays BPM value in button once detected', () => {
    render(<TapTempo onTempoDetected={onTempoDetected} />);
    const btn = screen.getByRole('button', { name: 'Tap to set tempo' });

    vi.setSystemTime(0);
    act(() => { fireEvent.click(btn); });
    vi.setSystemTime(500);
    act(() => { fireEvent.click(btn); });
    vi.setSystemTime(1000);
    act(() => { fireEvent.click(btn); });

    expect(btn).toHaveTextContent('120 BPM');
  });
});
