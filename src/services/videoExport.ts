/**
 * Video Export Service - FluxStudio
 *
 * Exports formations as WebM video with optional audio track.
 * Uses MediaRecorder API with canvas.captureStream() for video encoding
 * and AudioContext for audio muxing.
 */

import type { Formation, FormationExportOptions, ExportProgress, Position } from './formationTypes';

interface VideoExportOptions {
  formation: Formation;
  exportOptions: FormationExportOptions;
  getPositionsAtTime: (formationId: string, time: number) => Map<string, Position>;
  duration: number;
  audioTrackUrl?: string;
  includeAudio?: boolean;
  onProgress?: (progress: ExportProgress) => void;
}

/**
 * Draw a single formation frame onto a canvas context.
 * Extracted for reuse between GIF and video export.
 */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  formation: Formation,
  positions: Map<string, Position>,
  time: number,
  duration: number,
  width: number,
  height: number,
  options: FormationExportOptions,
) {
  const { stageWidth, stageHeight, gridSize, performers } = formation;
  const margin = Math.min(width, height) * 0.05;
  const contentWidth = width - margin * 2;
  const contentHeight = height - margin * 2;
  const scaleX = contentWidth / stageWidth;
  const scaleY = contentHeight / stageHeight;
  const scale = Math.min(scaleX, scaleY);
  const stageDrawWidth = stageWidth * scale;
  const stageDrawHeight = stageHeight * scale;
  const offsetX = margin + (contentWidth - stageDrawWidth) / 2;
  const offsetY = margin + (contentHeight - stageDrawHeight) / 2;
  const markerRadius = Math.min(stageDrawWidth, stageDrawHeight) * 0.02;

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.fillRect(offsetX, offsetY, stageDrawWidth, stageDrawHeight);
  ctx.strokeRect(offsetX, offsetY, stageDrawWidth, stageDrawHeight);

  // Field overlay
  if (options.includeFieldOverlay) {
    ctx.strokeStyle = 'rgba(180, 200, 180, 0.6)';
    ctx.lineWidth = 1;
    for (let yard = 0; yard <= 10; yard++) {
      const yardX = offsetX + (yard / 10) * stageDrawWidth;
      ctx.beginPath();
      ctx.moveTo(yardX, offsetY);
      ctx.lineTo(yardX, offsetY + stageDrawHeight);
      ctx.stroke();
      const yardNum = yard <= 5 ? yard * 10 : (10 - yard) * 10;
      if (yardNum > 0) {
        ctx.fillStyle = 'rgba(150, 180, 150, 0.8)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(String(yardNum), yardX + 2, offsetY + stageDrawHeight - 4);
      }
    }
    ctx.lineWidth = 0.5;
    const hashY1 = offsetY + stageDrawHeight * 0.35;
    const hashY2 = offsetY + stageDrawHeight * 0.65;
    for (let yard = 0; yard <= 100; yard += 5) {
      const hx = offsetX + (yard / 100) * stageDrawWidth;
      ctx.beginPath(); ctx.moveTo(hx - 2, hashY1); ctx.lineTo(hx + 2, hashY1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx - 2, hashY2); ctx.lineTo(hx + 2, hashY2); ctx.stroke();
    }
  }

  // Grid
  if (options.includeGrid) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= stageWidth; x += gridSize) {
      const lineX = offsetX + x * scale;
      ctx.beginPath(); ctx.moveTo(lineX, offsetY); ctx.lineTo(lineX, offsetY + stageDrawHeight); ctx.stroke();
    }
    for (let y = 0; y <= stageHeight; y += gridSize) {
      const lineY = offsetY + y * scale;
      ctx.beginPath(); ctx.moveTo(offsetX, lineY); ctx.lineTo(offsetX + stageDrawWidth, lineY); ctx.stroke();
    }
  }

  // Performers
  for (const performer of performers) {
    const pos = positions.get(performer.id);
    if (!pos) continue;
    const cx = offsetX + (pos.x / 100) * stageDrawWidth;
    const cy = offsetY + (pos.y / 100) * stageDrawHeight;
    ctx.fillStyle = performer.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, markerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (options.includeLabels) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(10, markerRadius * 0.8)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(performer.label, cx, cy);
    }
  }

  // Timestamp overlay
  if (options.includeTimestamps) {
    const totalSeconds = Math.floor(time / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((time % 1000) / 10);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(timeStr, width - margin, margin / 2);
  }

  // Progress bar
  const progress = duration > 0 ? time / duration : 0;
  ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
  ctx.fillRect(0, height - 4, width, 4);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(0, height - 4, width * progress, 4);
}

/**
 * Fetch and decode an audio file into an AudioBuffer.
 */
async function fetchAudioBuffer(url: string, audioCtx: AudioContext): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return audioCtx.decodeAudioData(arrayBuffer);
}

/**
 * Export formation as WebM video with optional audio track.
 *
 * Architecture:
 * 1. Create an offscreen canvas and render frames via requestAnimationFrame
 * 2. Capture the canvas as a video MediaStream
 * 3. If audio is included, decode the audio file and route it through
 *    an AudioContext → MediaStreamAudioDestinationNode
 * 4. Combine video + audio streams into a single MediaStream
 * 5. Feed the combined stream to MediaRecorder (WebM/VP9)
 * 6. Return the resulting Blob
 */
export async function exportToVideo(opts: VideoExportOptions): Promise<Blob> {
  const {
    formation,
    exportOptions,
    getPositionsAtTime,
    duration,
    audioTrackUrl,
    includeAudio = true,
    onProgress,
  } = opts;

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder API not available in this browser');
  }

  const width = exportOptions.resolution?.width ?? 1920;
  const height = exportOptions.resolution?.height ?? 1080;
  const fps = exportOptions.fps ?? 30;

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  onProgress?.({ phase: 'rendering', percent: 0 });

  // Set up audio (if available)
  let audioCtx: AudioContext | undefined;
  let audioSource: AudioBufferSourceNode | undefined;
  let audioDestination: MediaStreamAudioDestinationNode | undefined;

  if (includeAudio && audioTrackUrl) {
    try {
      audioCtx = new AudioContext();
      const audioBuffer = await fetchAudioBuffer(audioTrackUrl, audioCtx);
      audioDestination = audioCtx.createMediaStreamDestination();
      audioSource = audioCtx.createBufferSource();
      audioSource.buffer = audioBuffer;
      audioSource.connect(audioDestination);
      onProgress?.({ phase: 'rendering', percent: 5 });
    } catch (err) {
      console.warn('Failed to load audio for video export, continuing without audio:', err);
      audioCtx = undefined;
      audioSource = undefined;
      audioDestination = undefined;
    }
  }

  // Combine video + audio streams
  const videoStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream();

  // Add video tracks
  for (const track of videoStream.getVideoTracks()) {
    combinedStream.addTrack(track);
  }

  // Add audio tracks (if available)
  if (audioDestination) {
    for (const track of audioDestination.stream.getAudioTracks()) {
      combinedStream.addTrack(track);
    }
  }

  // Determine supported codec
  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const mimeType = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: width >= 1920 ? 8_000_000 : 4_000_000,
  });

  const chunks: Blob[] = [];
  const frameCount = Math.ceil((duration / 1000) * fps);
  const frameDurationMs = 1000 / fps;

  return new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = () => reject(new Error('MediaRecorder error during video export'));
    recorder.onstop = () => {
      // Clean up audio context
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
      onProgress?.({ phase: 'done', percent: 100 });
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };

    recorder.start();

    // Start audio playback in sync
    if (audioSource) {
      audioSource.start(0);
    }

    let frameIndex = 0;

    const renderNextFrame = () => {
      if (frameIndex >= frameCount) {
        // Stop audio source if still playing
        if (audioSource) {
          try { audioSource.stop(); } catch { /* already stopped */ }
        }
        recorder.stop();
        return;
      }

      const time = frameIndex * frameDurationMs;
      const positions = getPositionsAtTime(formation.id, time);
      drawFrame(ctx, formation, positions, time, duration, width, height, exportOptions);
      frameIndex++;

      if (frameIndex % 10 === 0) {
        const percent = 5 + Math.round((frameIndex / frameCount) * 90);
        onProgress?.({ phase: 'rendering', percent });
      }

      // Use setTimeout to allow MediaRecorder to capture each frame
      // The frameDurationMs delay ensures frames are recorded at the correct rate
      setTimeout(renderNextFrame, frameDurationMs);
    };

    renderNextFrame();
  });
}

/**
 * Download a blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
