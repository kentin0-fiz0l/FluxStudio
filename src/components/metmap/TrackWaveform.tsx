/**
 * TrackWaveform — Canvas-based waveform visualization for a single audio track.
 *
 * Draws amplitude peaks from an audio URL, color-coded per track index.
 * Shows beat markers overlay when beat detection data is available.
 * Compact height (32px) for embedding in mixer track rows.
 */

import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { Loader2 } from 'lucide-react';

interface TrackWaveformProps {
  audioUrl: string;
  trackIndex: number;
  beatMap?: { beats: number[]; bpm: number; confidence: number } | null;
  height?: number;
  className?: string;
}

const TRACK_HUES = [230, 150, 35, 350, 270, 185, 20, 165]; // indigo, emerald, amber, rose, violet, cyan, orange, teal
const PEAK_POINTS = 800;

/** Downsample audio buffer to peak data for rendering. */
function extractPeaks(buffer: AudioBuffer, count: number): Float32Array {
  const channel = buffer.getChannelData(0);
  const peaks = new Float32Array(count);
  const blockSize = Math.floor(channel.length / count);

  for (let i = 0; i < count; i++) {
    let max = 0;
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channel.length);
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channel[j]);
      if (abs > max) max = abs;
    }
    peaks[i] = max;
  }

  return peaks;
}

export const TrackWaveform = memo(function TrackWaveform({
  audioUrl,
  trackIndex,
  beatMap,
  height = 32,
  className = '',
}: TrackWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [duration, setDuration] = useState(0);

  // Load and decode audio
  useEffect(() => {
    if (!audioUrl) return;
    let cancelled = false;

    async function decode() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error('fetch failed');
        const arrayBuffer = await response.arrayBuffer();
        const audioCtx = new AudioContext();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        audioCtx.close();

        if (cancelled) return;
        setDuration(audioBuffer.duration);
        setPeaks(extractPeaks(audioBuffer, PEAK_POINTS));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    decode();
    return () => { cancelled = true; };
  }, [audioUrl]);

  // Draw waveform
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const hue = TRACK_HUES[trackIndex % TRACK_HUES.length];
    const barWidth = w / peaks.length;
    const mid = h / 2;

    // Draw waveform bars
    ctx.fillStyle = `hsla(${hue}, 65%, 55%, 0.7)`;
    for (let i = 0; i < peaks.length; i++) {
      const amplitude = peaks[i] * mid * 0.9;
      const x = i * barWidth;
      ctx.fillRect(x, mid - amplitude, Math.max(barWidth - 0.5, 0.5), amplitude * 2);
    }

    // Draw beat markers
    if (beatMap && duration > 0) {
      ctx.strokeStyle = `hsla(${hue}, 80%, 40%, 0.4)`;
      ctx.lineWidth = 1;
      for (const beat of beatMap.beats) {
        const x = (beat / duration) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }

    // Center line
    ctx.strokeStyle = `hsla(${hue}, 50%, 50%, 0.2)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();
  }, [peaks, trackIndex, beatMap, duration]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Redraw on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <Loader2 className="h-3 w-3 animate-spin text-neutral-400" aria-hidden="true" />
      </div>
    );
  }

  if (error || !peaks) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <span className="text-[9px] text-neutral-300">No waveform</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`${className}`} style={{ height }}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
});

export default TrackWaveform;
