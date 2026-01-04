'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn, formatDuration } from '@/lib/utils';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  SkipBack,
  SkipForward,
  MessageSquarePlus,
} from 'lucide-react';

interface VideoAnnotation {
  id: string;
  timestamp: number;
  frame?: number;
  content: string;
  author: string;
  isResolved: boolean;
}

interface VideoViewerProps {
  src: string;
  annotations?: VideoAnnotation[];
  onAddAnnotation?: (timestamp: number) => void;
  onSelectAnnotation?: (annotation: VideoAnnotation) => void;
  className?: string;
}

export function VideoViewer({
  src,
  annotations = [],
  onAddAnnotation,
  onSelectAnnotation,
  className,
}: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekTo(percent * duration);
  };

  const skipBack = () => seekTo(Math.max(0, currentTime - 5));
  const skipForward = () => seekTo(Math.min(duration, currentTime + 5));

  const handleAddAnnotation = () => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    onAddAnnotation?.(currentTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Get annotations visible on timeline
  const timelineAnnotations = annotations.map((a) => ({
    ...a,
    position: (a.timestamp / duration) * 100,
  }));

  return (
    <div className={cn('flex flex-col h-full bg-black', className)}>
      {/* Video container */}
      <div className="flex-1 relative video-player">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          onClick={togglePlay}
        />

        {/* Play overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Button
              size="lg"
              variant="ghost"
              className="h-16 w-16 rounded-full bg-white/20 hover:bg-white/30"
              onClick={togglePlay}
            >
              <Play className="h-8 w-8 text-white" />
            </Button>
          </div>
        )}

        {/* Controls overlay */}
        <div className="video-player-controls absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress bar */}
          <div
            className="relative h-1.5 bg-white/30 rounded-full cursor-pointer mb-4 group"
            onClick={handleProgressClick}
          >
            {/* Played progress */}
            <div
              className="absolute h-full bg-primary rounded-full"
              style={{ width: `${progress}%` }}
            />

            {/* Annotation markers on timeline */}
            {timelineAnnotations.map((annotation) => (
              <button
                key={annotation.id}
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-yellow-400 rounded-full hover:scale-125 transition-transform"
                style={{ left: `${annotation.position}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  seekTo(annotation.timestamp);
                  onSelectAnnotation?.(annotation);
                }}
              />
            ))}

            {/* Playhead */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={skipBack}>
                <SkipBack className="h-5 w-5 text-white" />
              </Button>
              <Button variant="ghost" size="icon" onClick={togglePlay}>
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="h-5 w-5 text-white" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={skipForward}>
                <SkipForward className="h-5 w-5 text-white" />
              </Button>

              <span className="text-sm text-white ml-2">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-white hover:text-white"
                onClick={handleAddAnnotation}
              >
                <MessageSquarePlus className="h-4 w-4" />
                Add note at {formatDuration(currentTime)}
              </Button>

              <Button variant="ghost" size="icon" onClick={toggleMute}>
                {isMuted ? (
                  <VolumeX className="h-5 w-5 text-white" />
                ) : (
                  <Volume2 className="h-5 w-5 text-white" />
                )}
              </Button>

              <Button variant="ghost" size="icon">
                <Maximize2 className="h-5 w-5 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
