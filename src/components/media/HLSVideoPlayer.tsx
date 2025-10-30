/**
 * HLSVideoPlayer Component
 *
 * Simplified video player with HLS adaptive streaming
 *
 * Features:
 * - HLS.js for adaptive bitrate streaming
 * - Quality selector (auto, 1080p, 720p, 480p)
 * - Standard video controls (play/pause, volume, seek, fullscreen)
 * - No DRM - optimized for cost-effective streaming
 *
 * Usage:
 * <HLSVideoPlayer
 *   fileId="uuid"
 *   hlsUrl="https://fluxstudio.nyc3.cdn.digitaloceanspaces.com/hls/uuid/master.m3u8"
 *   poster="https://fluxstudio.nyc3.cdn.digitaloceanspaces.com/thumbnails/uuid.jpg"
 * />
 */

import React, { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface HLSVideoPlayerProps {
  fileId: string;
  hlsUrl?: string;  // HLS manifest URL (m3u8)
  fallbackUrl?: string;  // Fallback direct video URL for non-HLS browsers
  poster?: string;
  className?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  onError?: (error: Error) => void;
}

interface QualityLevel {
  height: number;
  bitrate: number;
  label: string;
}

export function HLSVideoPlayer({
  fileId,
  hlsUrl,
  fallbackUrl,
  poster,
  className,
  onTimeUpdate,
  onLoadedMetadata,
  onError,
}: HLSVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // HLS state
  const [hlsSupported, setHlsSupported] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Initialize HLS.js or native HLS support
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    // Check for native HLS support (Safari)
    const canPlayHLS = video.canPlayType('application/vnd.apple.mpegurl');

    if (canPlayHLS) {
      // Native HLS support (iOS/macOS Safari)
      setHlsSupported(true);
      video.src = hlsUrl;
      setIsLoading(false);

    } else if (Hls.isSupported()) {
      // HLS.js for browsers without native support
      setHlsSupported(true);
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      // HLS events
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('[HLS] Manifest loaded:', data.levels.length, 'quality levels');

        const levels: QualityLevel[] = data.levels.map((level, index) => ({
          height: level.height,
          bitrate: level.bitrate,
          label: getLevelLabel(level.height),
        }));

        setQualityLevels(levels);
        setIsLoading(false);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log('[HLS] Quality switched to:', data.level);
        setCurrentQuality(data.level);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('[HLS] Error:', data);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('[HLS] Fatal network error, trying to recover');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('[HLS] Fatal media error, trying to recover');
              hls.recoverMediaError();
              break;
            default:
              console.error('[HLS] Fatal error, cannot recover');
              onError?.(new Error(data.details));
              break;
          }
        }
      });

    } else {
      // No HLS support, use fallback
      setHlsSupported(false);
      if (fallbackUrl) {
        video.src = fallbackUrl;
        setIsLoading(false);
      } else {
        onError?.(new Error('HLS not supported in this browser'));
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl, fallbackUrl, onError]);

  // Helper function to get quality label
  const getLevelLabel = (height: number): string => {
    if (height >= 1080) return '1080p';
    if (height >= 720) return '720p';
    if (height >= 480) return '480p';
    if (height >= 360) return '360p';
    return `${height}p`;
  };

  // Change quality level
  const changeQuality = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentQuality(levelIndex);
      setShowQualityMenu(false);
    }
  };

  // Video control functions
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

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      onLoadedMetadata?.(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime, video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [onTimeUpdate, onLoadedMetadata]);

  return (
    <div
      ref={containerRef}
      className={cn('relative bg-black rounded-lg overflow-hidden group', className)}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full"
        playsInline
        crossOrigin="anonymous"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white" />
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Progress bar */}
        <Slider
          value={[currentTime]}
          max={duration}
          step={0.1}
          onValueChange={handleSeek}
          className="mb-4"
        />

        {/* Control buttons */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            {/* Skip buttons */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(-10)}
              className="text-white hover:bg-white/20"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(10)}
              className="text-white hover:bg-white/20"
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            {/* Time */}
            <span className="text-sm font-medium ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quality selector */}
            {qualityLevels.length > 0 && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="text-white hover:bg-white/20"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  {currentQuality === -1 ? 'Auto' : qualityLevels[currentQuality]?.label}
                </Button>

                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg overflow-hidden">
                    <button
                      onClick={() => changeQuality(-1)}
                      className={cn(
                        'block w-full px-4 py-2 text-left text-sm hover:bg-white/20',
                        currentQuality === -1 && 'bg-white/30'
                      )}
                    >
                      Auto
                    </button>
                    {qualityLevels.map((level, index) => (
                      <button
                        key={index}
                        onClick={() => changeQuality(index)}
                        className={cn(
                          'block w-full px-4 py-2 text-left text-sm hover:bg-white/20',
                          currentQuality === index && 'bg-white/30'
                        )}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
