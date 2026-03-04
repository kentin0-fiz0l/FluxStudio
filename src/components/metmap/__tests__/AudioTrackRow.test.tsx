import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';
import { AudioTrackRow } from '../AudioTrackRow';
import type { AudioTrack } from '../../../hooks/useAudioTracks';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));

vi.mock('lucide-react', () => ({
  Volume2: (props: Record<string, unknown>) => <svg data-testid="volume-icon" {...props} />,
  VolumeX: (props: Record<string, unknown>) => <svg data-testid="volume-x-icon" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
  Zap: (props: Record<string, unknown>) => <svg data-testid="zap-icon" {...props} />,
}));

vi.mock('../TrackWaveform', () => ({
  TrackWaveform: () => <div data-testid="track-waveform" />,
}));

function makeTrack(overrides: Partial<AudioTrack> = {}): AudioTrack {
  return {
    id: 'track-1',
    songId: 'song-1',
    userId: 'user-1',
    name: 'Guitar',
    audioKey: null,
    audioUrl: null,
    audioDurationSeconds: null,
    mimeType: null,
    fileSizeBytes: null,
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    sortOrder: 0,
    beatMap: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

const defaultProps = {
  track: makeTrack(),
  index: 0,
  isMutedBySolo: false,
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
};

describe('AudioTrackRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders track name', () => {
    render(<AudioTrackRow {...defaultProps} />);
    expect(screen.getByText('Guitar')).toBeInTheDocument();
  });

  it('renders volume slider with correct value', () => {
    render(<AudioTrackRow {...defaultProps} />);
    const slider = screen.getByLabelText('Volume for Guitar');
    expect(slider).toHaveValue('80'); // 0.8 * 100
  });

  it('calls onUpdate with volume change', async () => {
    const onUpdate = vi.fn();
    render(<AudioTrackRow {...defaultProps} onUpdate={onUpdate} />);
    const slider = screen.getByLabelText('Volume for Guitar');
    // fireEvent works better for range inputs
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(slider, { target: { value: '50' } });
    expect(onUpdate).toHaveBeenCalledWith({ volume: 0.5 });
  });

  it('renders mute button and toggles mute', async () => {
    const onUpdate = vi.fn();
    const { user } = render(<AudioTrackRow {...defaultProps} onUpdate={onUpdate} />);
    const muteBtn = screen.getByLabelText('Mute track');
    await user.click(muteBtn);
    expect(onUpdate).toHaveBeenCalledWith({ muted: true });
  });

  it('shows unmute label when track is muted', () => {
    render(
      <AudioTrackRow {...defaultProps} track={makeTrack({ muted: true })} />
    );
    expect(screen.getByLabelText('Unmute track')).toBeInTheDocument();
  });

  it('renders solo button and toggles solo', async () => {
    const onUpdate = vi.fn();
    const { user } = render(<AudioTrackRow {...defaultProps} onUpdate={onUpdate} />);
    const soloBtn = screen.getByLabelText('Solo track');
    await user.click(soloBtn);
    expect(onUpdate).toHaveBeenCalledWith({ solo: true });
  });

  it('shows unsolo label when track is soloed', () => {
    render(
      <AudioTrackRow {...defaultProps} track={makeTrack({ solo: true })} />
    );
    expect(screen.getByLabelText('Unsolo track')).toBeInTheDocument();
  });

  it('renders pan slider', () => {
    render(<AudioTrackRow {...defaultProps} />);
    const pan = screen.getByLabelText('Pan for Guitar');
    expect(pan).toHaveValue('0');
  });

  it('calls onUpdate with pan change', async () => {
    const onUpdate = vi.fn();
    render(<AudioTrackRow {...defaultProps} onUpdate={onUpdate} />);
    const pan = screen.getByLabelText('Pan for Guitar');
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(pan, { target: { value: '-50' } });
    expect(onUpdate).toHaveBeenCalledWith({ pan: -0.5 });
  });

  it('renders remove button and calls onDelete', async () => {
    const onDelete = vi.fn();
    const { user } = render(<AudioTrackRow {...defaultProps} onDelete={onDelete} />);
    await user.click(screen.getByLabelText('Remove Guitar'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('applies reduced opacity when effectively muted', () => {
    const { container } = render(
      <AudioTrackRow {...defaultProps} isMutedBySolo />
    );
    expect(container.firstChild).toHaveClass('opacity-50');
  });

  it('renders color indicator based on index', () => {
    const { container } = render(<AudioTrackRow {...defaultProps} index={0} />);
    const colorDiv = container.querySelector('.bg-indigo-500');
    expect(colorDiv).toBeInTheDocument();
  });

  it('shows beat detection button when onDetectBeats provided and no beatMap', () => {
    render(<AudioTrackRow {...defaultProps} onDetectBeats={vi.fn()} />);
    expect(screen.getByLabelText('Detect beats')).toBeInTheDocument();
  });

  it('does not show beat detection button when beatMap exists', () => {
    const track = makeTrack({
      beatMap: { bpm: 120, beats: [1, 2], onsets: [], confidence: 0.9 },
    });
    render(<AudioTrackRow {...defaultProps} track={track} onDetectBeats={vi.fn()} />);
    expect(screen.queryByLabelText('Detect beats')).not.toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('renders waveform when audioUrl is set', () => {
    const track = makeTrack({ audioUrl: 'http://example.com/audio.mp3' });
    render(<AudioTrackRow {...defaultProps} track={track} />);
    expect(screen.getByTestId('track-waveform')).toBeInTheDocument();
  });
});
