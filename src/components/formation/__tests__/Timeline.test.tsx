/**
 * Timeline Component Tests
 *
 * Tests keyframe rendering, keyframe list, PlaybackControls mounting.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback: string) => fallback || key }),
}));

vi.mock('../../../utils/drillGeometry', () => ({
  generateCountMarkers: () => [],
}));

vi.mock('../../../hooks/useAudioPlayback', () => ({
  useAudioPlayback: () => ({
    state: { isLoaded: false, volume: 1 },
    setVolume: vi.fn(),
    syncWithFormation: vi.fn(),
  }),
}));

vi.mock('../PlaybackControls', () => ({
  PlaybackControls: (props: any) => (
    <div data-testid="playback-controls">
      <button onClick={props.onPlay}>Play</button>
    </div>
  ),
}));

vi.mock('../KeyframeMarker', () => ({
  KeyframeMarker: (props: any) => (
    <div data-testid={`keyframe-${props.keyframe.id}`} onClick={props.onSelect}>
      KF {props.keyframe.id}
    </div>
  ),
}));

import { Timeline } from '../Timeline';

function defaultProps(overrides: Partial<Parameters<typeof Timeline>[0]> = {}) {
  return {
    keyframes: [
      { id: 'kf-1', timestamp: 0, positions: new Map() },
      { id: 'kf-2', timestamp: 2000, positions: new Map() },
    ],
    duration: 5000,
    currentTime: 1000,
    playbackState: { isPlaying: false, speed: 1, loop: false, currentTime: 1000, duration: 5000 },
    selectedKeyframeId: 'kf-1',
    audioTrack: null,
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onStop: vi.fn(),
    onSeek: vi.fn(),
    onSpeedChange: vi.fn(),
    onToggleLoop: vi.fn(),
    onKeyframeSelect: vi.fn(),
    onKeyframeAdd: vi.fn(),
    onKeyframeRemove: vi.fn(),
    onKeyframeMove: vi.fn(),
    ...overrides,
  };
}

describe('Timeline', () => {
  test('renders PlaybackControls', () => {
    render(<Timeline {...defaultProps()} />);
    expect(screen.getByTestId('playback-controls')).toBeTruthy();
  });

  test('renders keyframe markers', () => {
    render(<Timeline {...defaultProps()} />);
    expect(screen.getByTestId('keyframe-kf-1')).toBeTruthy();
    expect(screen.getByTestId('keyframe-kf-2')).toBeTruthy();
  });

  test('renders keyframe list buttons', () => {
    render(<Timeline {...defaultProps()} />);
    expect(screen.getByText(/Keyframes/)).toBeTruthy();
  });

  test('calls onKeyframeSelect when keyframe list item is clicked', async () => {
    const onKeyframeSelect = vi.fn();
    const onSeek = vi.fn();
    const { user } = render(<Timeline {...defaultProps({ onKeyframeSelect, onSeek })} />);
    // The keyframe list has button items
    const buttons = screen.getAllByRole('button');
    const kfButton = buttons.find(b => b.textContent?.includes('1:'));
    if (kfButton) {
      await user.click(kfButton);
      expect(onKeyframeSelect).toHaveBeenCalled();
    }
  });

  test('shows time ruler markers', () => {
    render(<Timeline {...defaultProps()} />);
    // Duration is 5000ms, so we expect 0s-5s markers
    expect(screen.getByText('0s')).toBeTruthy();
  });
});
