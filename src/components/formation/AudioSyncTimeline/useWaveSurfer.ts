/**
 * useWaveSurfer - Manages WaveSurfer.js lifecycle, zoom sync, and time sync.
 */

import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface UseWaveSurferParams {
  audioUrl: string;
  zoom: number;
  currentTime: number;
  OVERLAY_HEIGHT: number;
}

export function useWaveSurfer({
  audioUrl,
  zoom,
  currentTime,
  OVERLAY_HEIGHT,
}: UseWaveSurferParams) {
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const seekingRef = useRef(false);

  // Create WaveSurfer instance
  useEffect(() => {
    if (!waveformContainerRef.current) return;

    const ws = WaveSurfer.create({
      container: waveformContainerRef.current,
      waveColor: 'rgba(99, 102, 241, 0.35)',
      progressColor: 'rgba(99, 102, 241, 0.7)',
      cursorColor: 'transparent', // We draw our own playhead
      cursorWidth: 0,
      height: OVERLAY_HEIGHT,
      normalize: true,
      interact: false, // We handle click-to-seek ourselves on the overlay
      fillParent: false,
      minPxPerSec: zoom,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      backend: 'WebAudio',
      mediaControls: false,
    });

    ws.load(audioUrl);
    wsRef.current = ws;

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // Sync zoom
  useEffect(() => {
    wsRef.current?.zoom(zoom);
  }, [zoom]);

  // Sync currentTime -> wavesurfer cursor
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || seekingRef.current) return;
    const dur = ws.getDuration();
    if (dur > 0) {
      ws.seekTo(Math.min((currentTime / 1000) / dur, 1));
    }
  }, [currentTime]);

  return { wsRef, waveformContainerRef, seekingRef };
}
