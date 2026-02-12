import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Bookmark,
  Download,
  Share,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AudioPlayerProps {
  src: string;
  title?: string;
  artist?: string;
  className?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onLoadedMetadata?: (duration: number) => void;
}

interface AudioBookmark {
  time: number;
  label: string;
}

export function AudioPlayer({
  src,
  title,
  artist,
  className,
  onTimeUpdate,
  onLoadedMetadata,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<AudioBookmark[]>([]);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [_audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Initialize Web Audio API for waveform visualization
  useEffect(() => {
    const initAudioContext = async () => {
      try {
        const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        const context = new AudioContextClass();
        setAudioContext(context);

        // Fetch and decode audio for waveform
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(arrayBuffer);
        setAudioBuffer(buffer);
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    };

    initAudioContext();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [src]);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audioBuffer || !audio) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.moveTo(0, amp);

    // Draw waveform
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.lineTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();

    // Draw progress
    const progressWidth = (currentTime / duration) * width;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 0, progressWidth, height);

    // Draw time markers
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px Arial';
    const markers = Math.floor(duration / 30); // Every 30 seconds
    for (let i = 0; i <= markers; i++) {
      const time = i * 30;
      const x = (time / duration) * width;
      ctx.fillText(`${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`, x, height - 5);
    }

    // Draw bookmarks
    bookmarks.forEach(bookmark => {
      const x = (bookmark.time / duration) * width;
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x - 1, 0, 2, height);
      ctx.fillText(bookmark.label, x + 5, 15);
    });
  }, [audioBuffer, currentTime, duration, bookmarks]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      onLoadedMetadata?.(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime, audio.duration);
      drawWaveform();
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onLoadedMetadata, drawWaveform]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = value[0];
    audio.volume = newVolume;
    setVolume(newVolume);

    if (newVolume === 0) {
      setIsMuted(true);
      audio.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      audio.muted = false;
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = value[0];
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const clickTime = (x / canvas.width) * duration;

    audio.currentTime = clickTime;
    setCurrentTime(clickTime);
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  const changePlaybackRate = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const addBookmark = () => {
    const label = prompt('Bookmark label:');
    if (label) {
      setBookmarks([...bookmarks, { time: currentTime, label }]);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden", className)}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header with track info */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white text-lg">
              {title || 'Unknown Track'}
            </h3>
            {artist && (
              <p className="text-gray-400 text-sm">{artist}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={addBookmark}
              className="text-gray-400 hover:text-white"
            >
              <Bookmark className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="p-4">
        <canvas
          ref={canvasRef}
          width={800}
          height={120}
          className="w-full h-30 cursor-pointer rounded bg-gray-200 dark:bg-gray-800"
          onClick={handleCanvasClick}
        />
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
        </div>
      )}

      {/* Time Display */}
      <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-400">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pb-2">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="w-full"
        />
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => skip(-10)}
              className="text-white hover:bg-gray-700"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="lg"
              onClick={togglePlay}
              className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-1" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => skip(10)}
              className="text-white hover:bg-gray-700"
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-gray-700"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-24"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Playback Speed */}
            <select
              value={playbackRate}
              onChange={(e) => changePlaybackRate(Number(e.target.value))}
              className="bg-gray-200 dark:bg-gray-800 text-neutral-900 dark:text-white text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>
        </div>

        {/* Bookmarks */}
        {bookmarks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-white text-sm font-medium mb-2">Bookmarks</h4>
            <div className="flex flex-wrap gap-2">
              {bookmarks.map((bookmark, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const audio = audioRef.current;
                    if (audio) {
                      audio.currentTime = bookmark.time;
                    }
                  }}
                  className="text-xs bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
                >
                  {bookmark.label} ({formatTime(bookmark.time)})
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}