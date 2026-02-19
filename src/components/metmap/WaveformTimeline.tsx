/**
 * WaveformTimeline - Audio waveform visualization using wavesurfer.js
 *
 * Renders the song's audio waveform and provides click-to-seek.
 * Sync is driven externally via the `currentTime` prop; this component
 * does NOT own playback — PlaybackContext does.
 */

import { useEffect, useRef, memo } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformTimelineProps {
  /** URL of the audio file to visualize */
  audioUrl: string;
  /** Current playback time in seconds (driven by PlaybackContext) */
  currentTime: number;
  /** Pixels per second — controls zoom level */
  zoom: number;
  /** Called when user clicks on the waveform to seek */
  onSeek?: (timeInSeconds: number) => void;
  /** Called when audio has been decoded and duration is known */
  onReady?: (duration: number) => void;
  /** Called when the underlying AudioBuffer is available (for beat detection) */
  onDecode?: (audioBuffer: AudioBuffer) => void;
  className?: string;
}

export const WaveformTimeline = memo(function WaveformTimeline({
  audioUrl,
  currentTime,
  zoom,
  onSeek,
  onReady,
  onDecode,
  className = '',
}: WaveformTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const seekingRef = useRef(false);

  // Create wavesurfer instance
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(99, 102, 241, 0.35)',
      progressColor: 'rgba(99, 102, 241, 0.7)',
      cursorColor: '#f59e0b',
      cursorWidth: 2,
      height: 96,
      normalize: true,
      interact: true,
      fillParent: true,
      minPxPerSec: zoom,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      backend: 'WebAudio',
      // Don't autoplay — PlaybackContext controls playback
      mediaControls: false,
    });

    ws.on('ready', () => {
      onReady?.(ws.getDuration());
    });

    ws.on('decode', () => {
      const decodedData = ws.getDecodedData();
      if (decodedData) {
        // Create a proper AudioBuffer from the decoded data
        const ctx = new AudioContext();
        const buffer = ctx.createBuffer(
          decodedData.numberOfChannels,
          decodedData.length,
          decodedData.sampleRate,
        );
        for (let ch = 0; ch < decodedData.numberOfChannels; ch++) {
          buffer.copyToChannel(decodedData.getChannelData(ch), ch);
        }
        onDecode?.(buffer);
        ctx.close();
      }
    });

    ws.on('interaction', () => {
      seekingRef.current = true;
      const seekTime = ws.getCurrentTime();
      onSeek?.(seekTime);
      // Allow external sync to resume after a short delay
      setTimeout(() => { seekingRef.current = false; }, 100);
    });

    ws.load(audioUrl);
    wsRef.current = ws;

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
    // Only re-create when audioUrl changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // Sync external currentTime → wavesurfer cursor position
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || seekingRef.current) return;
    const duration = ws.getDuration();
    if (duration > 0) {
      const progress = Math.min(currentTime / duration, 1);
      ws.seekTo(progress);
    }
  }, [currentTime]);

  // Sync zoom level
  useEffect(() => {
    wsRef.current?.zoom(zoom);
  }, [zoom]);

  // We do NOT call ws.play()/ws.pause() here — audio playback is managed
  // by PlaybackContext which will use its own AudioContext and the raw
  // AudioBuffer. Wavesurfer is purely for visualization.

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-lg overflow-hidden bg-neutral-900/50 ${className}`}
      role="img"
      aria-label="Audio waveform"
    />
  );
});

export default WaveformTimeline;
