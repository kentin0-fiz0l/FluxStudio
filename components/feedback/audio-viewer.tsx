'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn, formatDuration } from '@/lib/utils';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  MessageSquarePlus,
  Music,
} from 'lucide-react';

interface AudioAnnotation {
  id: string;
  timestamp: number;
  content: string;
  author: string;
  isResolved: boolean;
}

interface AudioViewerProps {
  src: string;
  title?: string;
  annotations?: AudioAnnotation[];
  onAddAnnotation?: (timestamp: number) => void;
  onSelectAnnotation?: (annotation: AudioAnnotation) => void;
  className?: string;
}

export function AudioViewer({
  src,
  title,
  annotations = [],
  onAddAnnotation,
  onSelectAnnotation,
  className,
}: AudioViewerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    // Generate fake waveform data for visualization
    setWaveformData(Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2));

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

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

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekTo(percent * duration);
  };

  const skipBack = () => seekTo(Math.max(0, currentTime - 5));
  const skipForward = () => seekTo(Math.min(duration, currentTime + 5));

  const handleAddAnnotation = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
    onAddAnnotation?.(currentTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const progressIndex = Math.floor((progress / 100) * waveformData.length);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <audio ref={audioRef} src={src} />

      {/* Header */}
      <div className="flex items-center gap-4 p-6 border-b">
        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
          <Music className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold">{title || 'Audio Track'}</h3>
          <p className="text-sm text-muted-foreground">
            {formatDuration(duration)}
          </p>
        </div>
      </div>

      {/* Waveform visualization */}
      <div className="flex-1 p-6">
        <div
          className="waveform-container cursor-pointer"
          onClick={handleWaveformClick}
        >
          <div className="flex items-center justify-center h-full gap-0.5">
            {waveformData.map((height, index) => (
              <div
                key={index}
                className={cn(
                  'w-1 rounded-full transition-colors',
                  index < progressIndex
                    ? 'bg-primary'
                    : 'bg-muted-foreground/30'
                )}
                style={{ height: `${height * 100}%` }}
              />
            ))}
          </div>

          {/* Annotation markers */}
          {annotations.map((annotation) => {
            const position = (annotation.timestamp / duration) * 100;
            return (
              <button
                key={annotation.id}
                className="absolute top-0 h-full w-1 bg-yellow-400/50 hover:bg-yellow-400 transition-colors"
                style={{ left: `${position}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  seekTo(annotation.timestamp);
                  onSelectAnnotation?.(annotation);
                }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-400 rounded-full" />
              </button>
            );
          })}

          {/* Playhead */}
          <div
            className="absolute top-0 h-full w-0.5 bg-primary"
            style={{ left: `${progress}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={skipBack}>
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={skipForward}>
              <SkipForward className="h-5 w-5" />
            </Button>

            <span className="text-sm text-muted-foreground ml-2">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleAddAnnotation}
            >
              <MessageSquarePlus className="h-4 w-4" />
              Add note
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleMute}>
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
