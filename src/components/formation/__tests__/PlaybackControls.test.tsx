/**
 * PlaybackControls Component Tests
 *
 * Tests play/pause toggle, speed selector, loop toggle, time display.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback: string) => fallback || key }),
}));

vi.mock('../timelineHelpers', () => ({
  formatTime: (ms: number) => `${Math.floor(ms / 1000)}s`,
  formatCount: () => 'C1',
}));

import { PlaybackControls } from '../PlaybackControls';

function defaultProps(overrides: Partial<Parameters<typeof PlaybackControls>[0]> = {}) {
  return {
    playbackState: { isPlaying: false, speed: 1, loop: false, currentTime: 1500, duration: 5000 },
    currentTime: 1500,
    duration: 5000,
    audioTrack: null,
    audioState: { isLoaded: false, volume: 1 },
    drillSettings: undefined,
    isCountMode: false,
    zoom: 1,
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onStop: vi.fn(),
    onSeek: vi.fn(),
    onSpeedChange: vi.fn(),
    onToggleLoop: vi.fn(),
    onKeyframeAdd: vi.fn(),
    onZoomChange: vi.fn(),
    onVolumeChange: vi.fn(),
    ...overrides,
  };
}

describe('PlaybackControls', () => {
  test('renders Play button when not playing', () => {
    render(<PlaybackControls {...defaultProps()} />);
    expect(screen.getByLabelText('Play')).toBeTruthy();
  });

  test('renders Pause button when playing', () => {
    render(<PlaybackControls {...defaultProps({ playbackState: { isPlaying: true, speed: 1, loop: false, currentTime: 1500, duration: 5000 } })} />);
    expect(screen.getByLabelText('Pause')).toBeTruthy();
  });

  test('calls onPlay when play button is clicked', async () => {
    const onPlay = vi.fn();
    const { user } = render(<PlaybackControls {...defaultProps({ onPlay })} />);
    await user.click(screen.getByLabelText('Play'));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  test('renders time display', () => {
    render(<PlaybackControls {...defaultProps()} />);
    expect(screen.getByText('1s / 5s')).toBeTruthy();
  });

  test('renders speed selector with current value', () => {
    render(<PlaybackControls {...defaultProps()} />);
    expect(screen.getByText(/Speed/)).toBeTruthy();
    // Speed options are displayed as "0.25x", "0.5x", "1x", "2x" etc.
    expect(screen.getByText('1x')).toBeTruthy();
  });

  test('calls onToggleLoop when loop button is clicked', async () => {
    const onToggleLoop = vi.fn();
    const { user } = render(<PlaybackControls {...defaultProps({ onToggleLoop })} />);
    await user.click(screen.getByLabelText('Loop'));
    expect(onToggleLoop).toHaveBeenCalledTimes(1);
  });

  test('shows loop button as pressed when loop is active', () => {
    render(<PlaybackControls {...defaultProps({ playbackState: { isPlaying: false, speed: 1, loop: true, currentTime: 1500, duration: 5000 } })} />);
    const loopBtn = screen.getByLabelText('Loop');
    expect(loopBtn.getAttribute('aria-pressed')).toBe('true');
  });

  test('renders add keyframe button', () => {
    render(<PlaybackControls {...defaultProps()} />);
    expect(screen.getByLabelText('Add keyframe at current time')).toBeTruthy();
  });
});
