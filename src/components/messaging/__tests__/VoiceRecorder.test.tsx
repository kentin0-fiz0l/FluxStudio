/**
 * VoiceRecorder Component Tests
 *
 * Tests recording UI, timer display, cancel/send buttons, error state.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';

// Mock MediaRecorder and getUserMedia
const mockStart = vi.fn();
const mockStop = vi.fn();
const mockGetTracks = vi.fn(() => [{ stop: vi.fn() }]);

beforeEach(() => {
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn(() =>
        Promise.resolve({ getTracks: mockGetTracks })
      ),
    },
    writable: true,
    configurable: true,
  });

  (global as any).MediaRecorder = vi.fn(() => ({
    start: mockStart,
    stop: mockStop,
    state: 'recording',
    ondataavailable: null,
    onstop: null,
  }));
  (global.MediaRecorder as any).isTypeSupported = vi.fn(() => true);
});

import { VoiceRecorder } from '../VoiceRecorder';

function defaultProps(overrides: Partial<Parameters<typeof VoiceRecorder>[0]> = {}) {
  return {
    onSendVoice: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe('VoiceRecorder', () => {
  test('renders recording text', async () => {
    render(<VoiceRecorder {...defaultProps()} />);
    // Wait for recording to start (async getUserMedia)
    expect(await screen.findByText(/Recording|Processing/)).toBeTruthy();
  });

  test('renders initial timer at 00:00', async () => {
    render(<VoiceRecorder {...defaultProps()} />);
    expect(await screen.findByText('00:00')).toBeTruthy();
  });

  test('renders cancel button with title', async () => {
    render(<VoiceRecorder {...defaultProps()} />);
    expect(await screen.findByTitle('Cancel recording')).toBeTruthy();
  });

  test('renders send button with title', async () => {
    render(<VoiceRecorder {...defaultProps()} />);
    expect(await screen.findByTitle('Send voice message')).toBeTruthy();
  });

  test('shows error when microphone access denied', async () => {
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(new Error('denied'));
    render(<VoiceRecorder {...defaultProps()} />);
    expect(await screen.findByText('Microphone access denied')).toBeTruthy();
  });
});
